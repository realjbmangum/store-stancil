import type { APIRoute } from 'astro';
import { sendEmail, type GraphEnv } from '../../../lib/email';
import { orderFulfilledEmail } from '../../../lib/email-templates';

const VALID_STATUSES = ['Pending', 'Fulfilled', 'Partial', 'Cancelled'];

export const PATCH: APIRoute = async ({ params, locals, request }) => {
  try {
    const db = locals.runtime.env.STORE_DB;
    const id = params.id;
    const sanitizedEmail = locals.userEmail.toLowerCase().trim();

    // Admin gate
    const caller = await db
      .prepare('SELECT role FROM profiles WHERE email = ?')
      .bind(sanitizedEmail)
      .first() as { role: string } | null;

    if (!caller || caller.role !== 'admin') {
      return new Response(JSON.stringify({ success: false, error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const body = await request.json();
    const { status, order_notes } = body as { status?: string; order_notes?: string };

    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return new Response(
        JSON.stringify({ success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}` }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Build dynamic SET clause
    const fields: string[] = [];
    const bindings: (string | number)[] = [];

    if (status !== undefined) {
      fields.push('status = ?');
      bindings.push(status);
      fields.push('order_fulfilled = ?');
      bindings.push(status === 'Fulfilled' ? 1 : 0);
    }
    if (order_notes !== undefined) {
      fields.push('order_notes = ?');
      bindings.push(order_notes);
    }

    if (fields.length === 0) {
      return new Response(JSON.stringify({ success: false, error: 'No fields to update' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    bindings.push(id as string);
    await db
      .prepare(`UPDATE orders SET ${fields.join(', ')} WHERE id = ?`)
      .bind(...bindings)
      .run();

    // Send fulfilled email when status changes to Fulfilled
    if (status === 'Fulfilled') {
      try {
        const env = locals.runtime.env as unknown as GraphEnv & { STORE_DB: typeof db };
        if (env.GRAPH_TENANT_ID && env.GRAPH_CLIENT_ID && env.GRAPH_CLIENT_SECRET) {
          const order = await db
            .prepare('SELECT * FROM orders WHERE id = ?')
            .bind(id)
            .first() as any;

          if (order) {
            const itemsResult = await db
              .prepare(
                `SELECT oi.quantity, oi.price, oi.product_size, oi.color, p.name as product_name
                 FROM order_items oi
                 JOIN products p ON p.id = oi.product_id
                 WHERE oi.order_id = ?`
              )
              .bind(id)
              .all() as { results: any[] };

            const profile = await db
              .prepare('SELECT display_name, first_name, last_name FROM profiles WHERE email = ?')
              .bind(order.employee_email)
              .first() as any;

            const html = orderFulfilledEmail(order, itemsResult.results, profile || {});
            const toAddresses = [order.employee_email];
            if (order.manager_selected_email) toAddresses.push(order.manager_selected_email);

            await sendEmail(env, {
              to: toAddresses,
              subject: `Stancil Store — Order #${id} Fulfilled`,
              html,
            });
          }
        }
      } catch (emailErr) {
        console.error('Fulfilled email failed:', emailErr);
        // Non-fatal
      }
    }

    const updated = await db.prepare('SELECT * FROM orders WHERE id = ?').bind(id).first();

    return new Response(JSON.stringify({ success: true, order: updated }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Patch order error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const db = locals.runtime.env.STORE_DB;
    const id = params.id;
    const sanitizedEmail = locals.userEmail.toLowerCase().trim();

    const order = await db
      .prepare('SELECT * FROM orders WHERE id = ?')
      .bind(id)
      .first();

    if (!order) {
      return new Response(JSON.stringify({ success: false, error: 'Order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Verify ownership: order must belong to requesting user
    const typedOrder = order as { employee_email: string; [key: string]: unknown };
    if (typedOrder.employee_email?.toLowerCase() !== sanitizedEmail) {
      return new Response(JSON.stringify({ success: false, error: 'Order not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const itemsResult = await db
      .prepare(
        `SELECT oi.*, p.name as product_name, p.image_url
         FROM order_items oi
         JOIN products p ON p.id = oi.product_id
         WHERE oi.order_id = ?`
      )
      .bind(id)
      .all();

    return new Response(JSON.stringify({ success: true, order, items: itemsResult.results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Get order error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
