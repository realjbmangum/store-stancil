import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const db = locals.runtime.env.STORE_DB;
    const id = params.id;

    const product = await db
      .prepare('SELECT * FROM products WHERE id = ? AND active = 1')
      .bind(id)
      .first();

    if (!product) {
      return new Response(JSON.stringify({ success: false, error: 'Product not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const variantsResult = await db
      .prepare('SELECT * FROM product_variants WHERE product_id = ? AND active = 1 ORDER BY size, color')
      .bind(id)
      .all();

    return new Response(JSON.stringify({ success: true, product, variants: variantsResult.results }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Get product error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
