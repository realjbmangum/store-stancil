import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ locals }) => {
  try {
    const db = locals.runtime.env.STORE_DB;
    const sanitizedEmail = locals.userEmail.toLowerCase().trim();

    const profile = await db
      .prepare('SELECT id, display_name, first_name, last_name, email, primary_location, manager_name, manager_email, yearly_credit FROM profiles WHERE email = ?')
      .bind(sanitizedEmail)
      .first();

    if (!profile) {
      return new Response(JSON.stringify({ success: false, error: 'Profile not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Calculate credit used from orders
    const creditResult = await db
      .prepare('SELECT COALESCE(SUM(credit_used), 0) as total_credit_used FROM orders WHERE employee_email = ?')
      .bind(sanitizedEmail)
      .first() as { total_credit_used: number } | null;

    const typedProfile = profile as { yearly_credit: number | null; [key: string]: unknown };
    const yearlyCredit = typedProfile.yearly_credit ?? 0;
    const creditUsed = creditResult?.total_credit_used ?? 0;
    const creditRemaining = Math.max(0, yearlyCredit - creditUsed);

    return new Response(
      JSON.stringify({
        success: true,
        profile: {
          ...profile,
          credit_used: Math.round(creditUsed * 100) / 100,
          credit_remaining: Math.round(creditRemaining * 100) / 100,
        },
      }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('Get profile error:', err);
    return new Response(JSON.stringify({ success: false, error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
