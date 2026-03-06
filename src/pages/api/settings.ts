import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  try {
    const db = locals.runtime.env.STORE_DB;

    const settings = await db
      .prepare('SELECT * FROM store_settings WHERE id = 1')
      .first();

    if (!settings) {
      return new Response(
        JSON.stringify({ success: true, settings: { is_open: 0, close_message: 'The store is currently closed.' } }),
        { headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(JSON.stringify({ success: true, settings }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    console.error('Get store settings error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
