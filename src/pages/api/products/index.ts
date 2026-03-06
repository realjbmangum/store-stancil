import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const db = locals.runtime.env.STORE_DB;
    const category = url.searchParams.get('category');

    let sql = `
      SELECT p.*,
        MIN(pv.price) as min_price, MAX(pv.price) as max_price,
        SUM(pv.stock_quantity) as total_stock,
        MAX(pv.is_credit_allowed) as has_credit_eligible
      FROM products p
      LEFT JOIN product_variants pv ON pv.product_id = p.id AND pv.active = 1
      WHERE p.active = 1
    `;
    const bindings: string[] = [];

    if (category) {
      sql += ` AND p.category = ?`;
      bindings.push(String(category).slice(0, 100));
    }

    sql += ` GROUP BY p.id ORDER BY p.display_order ASC, p.name ASC`;

    const result = await db
      .prepare(sql)
      .bind(...bindings)
      .all();

    return new Response(JSON.stringify({ success: true, products: result.results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('List products error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
