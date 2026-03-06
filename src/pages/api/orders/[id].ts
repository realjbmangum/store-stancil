import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, url, locals }) => {
  try {
    const db = locals.runtime.env.STORE_DB;
    const id = params.id;
    const email = url.searchParams.get('email');

    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ success: false, error: 'Email parameter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const sanitizedEmail = String(email).slice(0, 255).toLowerCase().trim();

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
