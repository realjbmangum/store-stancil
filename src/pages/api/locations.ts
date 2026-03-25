import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  try {
    const db = locals.runtime.env.STORE_DB;
    const result = await db
      .prepare('SELECT name FROM locations WHERE active = 1 ORDER BY name')
      .all() as { results: { name: string }[] };

    return new Response(
      JSON.stringify({ locations: result.results.map((r) => r.name) }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('GET /api/locations error:', err);
    return new Response(
      JSON.stringify({ locations: [] }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
