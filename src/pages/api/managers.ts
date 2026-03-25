import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url, locals }) => {
  const location = url.searchParams.get('location') || '';

  if (!location) {
    return new Response(
      JSON.stringify({ managers: [] }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  }

  try {
    const db = locals.runtime.env.STORE_DB;
    // Return distinct manager name+email pairs from profiles at this location
    const result = await db
      .prepare(
        `SELECT DISTINCT manager_name, manager_email
         FROM profiles
         WHERE primary_location = ?
           AND manager_email IS NOT NULL
           AND manager_email != ''
         ORDER BY manager_name`
      )
      .bind(location)
      .all() as { results: { manager_name: string; manager_email: string }[] };

    return new Response(
      JSON.stringify({ managers: result.results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('GET /api/managers error:', err);
    return new Response(
      JSON.stringify({ managers: [] }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};
