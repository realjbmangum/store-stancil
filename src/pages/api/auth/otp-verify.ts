import type { APIRoute } from 'astro';
import { createSessionToken, createRegistrationToken, setSessionCookieHeader } from '../../../lib/session';

export const POST: APIRoute = async ({ request, url, locals }) => {
  const env = locals.runtime.env as any;
  const db = env.STORE_DB;

  const { email, code, redirect } = (await request.json()) as { email: string; code: string; redirect?: string };
  const normalizedEmail = email.toLowerCase().trim();

  // Find valid code
  const match = await db.prepare(
    `SELECT id FROM otp_codes
     WHERE email = ? AND code = ? AND used = 0 AND expires_at > datetime('now')
     LIMIT 1`
  ).bind(normalizedEmail, code).first();

  if (!match) {
    return new Response(JSON.stringify({ error: 'Invalid or expired code' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Mark as used
  await db.prepare('UPDATE otp_codes SET used = 1 WHERE id = ?').bind(match.id).run();

  // Check if profile exists
  const profile = await db.prepare('SELECT id FROM profiles WHERE email = ?').bind(normalizedEmail).first();

  if (profile) {
    // Existing user — create session
    const token = await createSessionToken(normalizedEmail, env.SESSION_SECRET);
    const isSecure = url.protocol === 'https:';
    const headers = new Headers({
      'Content-Type': 'application/json',
      'Set-Cookie': setSessionCookieHeader(token, isSecure),
    });
    return new Response(JSON.stringify({ success: true, redirect: redirect || '/' }), { headers });
  }

  // New user — issue registration token
  const regToken = await createRegistrationToken(normalizedEmail, env.SESSION_SECRET);
  const regRedirect = `/register?token=${encodeURIComponent(regToken)}${redirect ? `&redirect=${encodeURIComponent(redirect)}` : ''}`;

  return new Response(
    JSON.stringify({ success: true, needsRegistration: true, redirect: regRedirect }),
    { headers: { 'Content-Type': 'application/json' } },
  );
};
