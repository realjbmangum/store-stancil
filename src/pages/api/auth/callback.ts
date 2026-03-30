import type { APIRoute } from 'astro';
import { createSessionToken, setSessionCookieHeader } from '../../../lib/session';

export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const env = locals.runtime.env as any;
    const code = url.searchParams.get('code');
    const stateParam = url.searchParams.get('state');

    if (!code) {
      return new Response('Missing authorization code', { status: 400 });
    }

    let redirect = '/';
    if (stateParam) {
      try {
        const parsed = JSON.parse(atob(stateParam));
        redirect = parsed.redirect || '/';
      } catch { /* use default */ }
    }

    // Exchange code for tokens
    const tokenUrl = `https://login.microsoftonline.com/${env.AZURE_TENANT_ID}/oauth2/v2.0/token`;
    const tokenRes = await fetch(tokenUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: env.AZURE_CLIENT_ID,
        client_secret: env.AZURE_CLIENT_SECRET,
        code,
        redirect_uri: `${url.origin}/api/auth/callback`,
        grant_type: 'authorization_code',
        scope: 'openid email profile',
      }),
    });

    if (!tokenRes.ok) {
      const text = await tokenRes.text();
      console.error('Token exchange failed:', text);
      return Response.redirect(`${url.origin}/login?error=auth_failed`, 302);
    }

    const tokenData = (await tokenRes.json()) as { id_token: string };

    // Decode id_token payload (no verification needed — received directly from Microsoft)
    const payloadB64 = tokenData.id_token.split('.')[1];
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')));
    const email = (payload.email || payload.preferred_username || '').toLowerCase().trim();

    if (!email) {
      return Response.redirect(`${url.origin}/login?error=no_email`, 302);
    }

    // Ensure profile exists
    const db = env.STORE_DB;
    const existing = await db.prepare('SELECT id FROM profiles WHERE email = ?').bind(email).first();
    if (!existing) {
      // Auto-create profile for Microsoft (corporate) users
      const displayName = payload.name || [payload.given_name, payload.family_name].filter(Boolean).join(' ') || email;
      await db.prepare(
        `INSERT INTO profiles (id, email, display_name, first_name, last_name, role, yearly_credit)
         VALUES (?, ?, ?, ?, ?, 'employee', 200)`
      ).bind(
        crypto.randomUUID(),
        email,
        displayName,
        payload.given_name || null,
        payload.family_name || null,
      ).run();
    }

    const token = await createSessionToken(email, env.SESSION_SECRET);
    const isSecure = url.protocol === 'https:';

    return new Response(null, {
      status: 302,
      headers: {
        Location: redirect,
        'Set-Cookie': setSessionCookieHeader(token, isSecure),
      },
    });
  } catch (err) {
    console.error('Auth callback error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: 'Auth callback failed', detail: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
