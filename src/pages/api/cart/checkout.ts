import type { APIRoute } from 'astro';
import { sendEmail, type GraphEnv } from '../../../lib/email';
import { orderConfirmationEmail, STORE_ADMIN_EMAIL } from '../../../lib/email-templates';

export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const db = locals.runtime.env.STORE_DB;
    const body = await request.json();

    /* ---- Input validation ------------------------------------ */
    const { items, location, managerName, managerEmail } = body;
    const sanitizedEmail = locals.userEmail.toLowerCase().trim();

    // Sanitize optional string fields
    const sanitizedLocation = typeof location === 'string' ? location.slice(0, 100) : null;
    const sanitizedManagerName = typeof managerName === 'string' ? managerName.slice(0, 200) : null;
    const sanitizedManagerEmail = typeof managerEmail === 'string' ? managerEmail.toLowerCase().trim().slice(0, 254) : null;

    if (!Array.isArray(items) || items.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'Cart is empty' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

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

      if (!Number.isInteger(quantity) || quantity <= 0 || quantity > 10) {
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

      validatedItems.push({ variantId, quantity });
      variantRows.push(variant);
    }

    /* ---- Look up user profile for credit info ---------------- */
    const profile = await db
      .prepare('SELECT id, yearly_credit, email FROM profiles WHERE email = ?')
      .bind(sanitizedEmail)
      .first() as { id: string; yearly_credit: number | null; email: string } | null;

    const sanitizedUserId = profile?.id ? String(profile.id) : null;

    // Calculate credit already used from existing orders
    const creditUsedResult = await db
      .prepare("SELECT COALESCE(SUM(credit_used), 0) as total_credit_used FROM orders WHERE employee_email = ? AND status != 'Cancelled'")
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
          `INSERT INTO orders (total_amount, credit_used, out_of_pocket, employee_email, user_id, status, location_selected, manager_selected_name, manager_selected_email)
           VALUES (?, ?, ?, ?, ?, 'Pending', ?, ?, ?)`
        )
        .bind(roundedTotal, roundedCredit, roundedOop, sanitizedEmail, sanitizedUserId, sanitizedLocation, sanitizedManagerName, sanitizedManagerEmail)
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

    // 2. Atomic stock decrement — check stock_quantity >= requested in WHERE clause
    for (let i = 0; i < validatedItems.length; i++) {
      const item = validatedItems[i];
      const variant = variantRows[i];

      const stockResult = await db
        .prepare(
          'UPDATE product_variants SET stock_quantity = stock_quantity - ? WHERE id = ? AND stock_quantity >= ?'
        )
        .bind(item.quantity, item.variantId, item.quantity)
        .run();

      if (!stockResult.meta?.changes) {
        // Insufficient stock — roll back the order
        await db.batch([
          db.prepare('DELETE FROM order_items WHERE order_id = ?').bind(orderId),
          db.prepare('DELETE FROM orders WHERE id = ?').bind(orderId),
          // Restore stock for any variants already decremented
          ...validatedItems.slice(0, i).map((prev) =>
            db
              .prepare('UPDATE product_variants SET stock_quantity = stock_quantity + ? WHERE id = ?')
              .bind(prev.quantity, prev.variantId)
          ),
        ]);

        return new Response(
          JSON.stringify({ success: false, error: `Insufficient stock for ${variant.product_name}` }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }

    // 3. Insert order items
    const batchStatements = [];

    for (let i = 0; i < validatedItems.length; i++) {
      const item = validatedItems[i];
      const variant = variantRows[i];

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
    }

    await db.batch(batchStatements);

    /* ---- Send order confirmation email ----------------------- */
    try {
      const env = locals.runtime.env as unknown as GraphEnv & { STORE_DB: typeof db };
      if (env.GRAPH_TENANT_ID && env.GRAPH_CLIENT_ID && env.GRAPH_CLIENT_SECRET) {
        const orderRecord = {
          id: orderId,
          created_at: new Date().toISOString(),
          employee_email: sanitizedEmail,
          total_amount: roundedTotal,
          credit_used: roundedCredit,
          out_of_pocket: roundedOop,
          order_notes: null,
          location_selected: sanitizedLocation,
          manager_selected_name: sanitizedManagerName,
          manager_selected_email: sanitizedManagerEmail,
        };

        const emailItems = variantRows.map((v, i) => ({
          product_name: v.product_name,
          product_size: v.size,
          color: v.color,
          quantity: validatedItems[i].quantity,
          price: v.price,
        }));

        const employeeInfo = {
          display_name: (profile as any)?.display_name,
          first_name: (profile as any)?.first_name,
          last_name: (profile as any)?.last_name,
        };

        const html = orderConfirmationEmail(orderRecord, emailItems, employeeInfo);
        const toAddresses = [sanitizedEmail];
        if (sanitizedManagerEmail) toAddresses.push(sanitizedManagerEmail);

        await sendEmail(env, {
          to: toAddresses,
          bcc: [STORE_ADMIN_EMAIL],
          subject: `Stancil Store — Order #${orderId} Received`,
          html,
        });
      }
    } catch (emailErr) {
      console.error('Order confirmation email failed:', emailErr);
      // Non-fatal — order was already created
    }

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
