import type { APIRoute } from 'astro';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime.env.STORE_DB;
    const body = await request.json();

    /* ---- Input validation ------------------------------------ */
    const { items, userEmail, userId } = body;

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Cart is empty' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!userEmail || typeof userEmail !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'User email is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sanitizedEmail = String(userEmail).slice(0, 255).toLowerCase().trim();
    const sanitizedUserId = userId ? String(userId).slice(0, 255) : null;

    // Cap at 50 line items
    if (items.length > 50) {
      return new Response(JSON.stringify({ success: false, error: 'Too many items in cart' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    /* ---- Validate items and check stock ---------------------- */
    interface CartItem {
      variantId: number;
      quantity: number;
    }

    interface VariantRow {
      id: number;
      product_id: number;
      size: string | null;
      color: string | null;
      price: number;
      stock_quantity: number;
      is_credit_allowed: number;
      lead_time: string | null;
      product_name: string;
    }

    const validatedItems: CartItem[] = [];
    const variantRows: VariantRow[] = [];

    for (const item of items) {
      const variantId = Number(item.variantId);
      const quantity = Number(item.quantity);

      if (!Number.isInteger(variantId) || variantId <= 0) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid variant ID' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 100) {
        return new Response(JSON.stringify({ success: false, error: 'Invalid quantity' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      const variant = await db
        .prepare(
          `SELECT pv.*, p.name as product_name
           FROM product_variants pv
           JOIN products p ON p.id = pv.product_id
           WHERE pv.id = ? AND pv.active = 1 AND p.active = 1`
        )
        .bind(variantId)
        .first() as VariantRow | null;

      if (!variant) {
        return new Response(JSON.stringify({ success: false, error: 'Product variant not found' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        });
      }

      if (variant.stock_quantity < quantity) {
        return new Response(
          JSON.stringify({ success: false, error: `Insufficient stock for ${variant.product_name}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }

      validatedItems.push({ variantId, quantity });
      variantRows.push(variant);
    }

    /* ---- Look up user profile for credit info ---------------- */
    const profile = await db
      .prepare('SELECT * FROM profiles WHERE email = ?')
      .bind(sanitizedEmail)
      .first() as { id: string; yearly_credit: number | null; email: string } | null;

    // Calculate credit already used from existing orders
    const creditUsedResult = await db
      .prepare('SELECT COALESCE(SUM(credit_used), 0) as total_credit_used FROM orders WHERE employee_email = ?')
      .bind(sanitizedEmail)
      .first() as { total_credit_used: number } | null;

    const yearlyCredit = profile?.yearly_credit ?? 0;
    const creditAlreadyUsed = creditUsedResult?.total_credit_used ?? 0;
    const availableCredit = Math.max(0, yearlyCredit - creditAlreadyUsed);

    /* ---- Calculate totals ------------------------------------ */
    let totalAmount = 0;
    let creditEligibleTotal = 0;

    for (let i = 0; i < validatedItems.length; i++) {
      const lineTotal = variantRows[i].price * validatedItems[i].quantity;
      totalAmount += lineTotal;

      if (variantRows[i].is_credit_allowed) {
        creditEligibleTotal += lineTotal;
      }
    }

    const creditToUse = Math.min(creditEligibleTotal, availableCredit);
    const outOfPocket = totalAmount - creditToUse;

    // Round to 2 decimal places
    const roundedTotal = Math.round(totalAmount * 100) / 100;
    const roundedCredit = Math.round(creditToUse * 100) / 100;
    const roundedOop = Math.round(outOfPocket * 100) / 100;

    /* ---- Create order + items + decrement stock (batch) ------ */
    const statements = [];

    // 1. Insert order
    statements.push(
      db
        .prepare(
          `INSERT INTO orders (total_amount, credit_used, out_of_pocket, employee_email, user_id, status)
           VALUES (?, ?, ?, ?, ?, 'Pending')`
        )
        .bind(roundedTotal, roundedCredit, roundedOop, sanitizedEmail, sanitizedUserId)
    );

    // Execute order insert first to get the ID
    const orderResult = await statements[0].run();
    const orderId = orderResult.meta?.last_row_id;

    if (!orderId) {
      return new Response(JSON.stringify({ success: false, error: 'Failed to create order' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 2. Batch: insert order items + decrement stock
    const batchStatements = [];

    for (let i = 0; i < validatedItems.length; i++) {
      const item = validatedItems[i];
      const variant = variantRows[i];

      // Insert order item
      batchStatements.push(
        db
          .prepare(
            `INSERT INTO order_items (order_id, product_id, product_variant_id, quantity, price, product_size, color, lead_time, status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Pending')`
          )
          .bind(
            orderId,
            variant.product_id,
            item.variantId,
            item.quantity,
            variant.price,
            variant.size,
            variant.color,
            variant.lead_time
          )
      );

      // Decrement stock
      batchStatements.push(
        db
          .prepare('UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ?')
          .bind(item.quantity, item.variantId)
      );
    }

    await db.batch(batchStatements);

    /* ---- Return confirmation --------------------------------- */
    return new Response(
      JSON.stringify({
        success: true,
        order: {
          id: orderId,
          total_amount: roundedTotal,
          credit_used: roundedCredit,
          out_of_pocket: roundedOop,
          status: 'Pending',
        },
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Checkout error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
