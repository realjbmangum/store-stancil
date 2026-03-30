import type { APIRoute } from 'astro';
import { sendEmail, type GraphEnv } from '../../../lib/email';

export const POST: APIRoute = async ({ request, locals }) => {
  const env = locals.runtime.env as any;
  const db = env.STORE_DB;

  const { email } = (await request.json()) as { email: string };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return new Response(JSON.stringify({ error: 'Invalid email address' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const normalizedEmail = email.toLowerCase().trim();

  // Rate limit: max 5 codes in 15 minutes
  const recent = await db.prepare(
    `SELECT COUNT(*) as cnt FROM otp_codes
     WHERE email = ? AND created_at > datetime('now', '-15 minutes')`
  ).bind(normalizedEmail).first() as { cnt: number };

  if (recent.cnt >= 5) {
    return new Response(JSON.stringify({ error: 'Too many attempts. Please wait a few minutes.' }), {
      status: 429,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Generate 6-digit code
  const code = String(crypto.getRandomValues(new Uint32Array(1))[0] % 900000 + 100000);

  // Store in D1
  await db.prepare(
    `INSERT INTO otp_codes (email, code, expires_at) VALUES (?, ?, datetime('now', '+10 minutes'))`
  ).bind(normalizedEmail, code).run();

  // Send email
  const graphEnv = env as unknown as GraphEnv;
  if (graphEnv.GRAPH_TENANT_ID && graphEnv.GRAPH_CLIENT_ID && graphEnv.GRAPH_CLIENT_SECRET) {
    const html = `<!DOCTYPE html>
<html><body style="margin:0;padding:0;background:#f3f4f6;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">
  <tr><td style="background:#0f2b5b;padding:24px 32px;border-radius:12px 12px 0 0;">
    <p style="margin:0;color:#fff;font-size:20px;font-weight:bold;">Stancil Services Store</p>
  </td></tr>
  <tr><td style="background:#fff;padding:32px;border-radius:0 0 12px 12px;">
    <h2 style="margin:0 0 8px;font-size:22px;color:#0f2b5b;">Your Login Code</h2>
    <p style="margin:0 0 24px;font-size:15px;color:#374151;">Use the code below to sign in to the Stancil Employee Store.</p>
    <div style="background:#f0f4ff;border:2px solid #2563eb;border-radius:12px;padding:24px;text-align:center;margin:0 0 24px;">
      <span style="font-size:36px;font-weight:bold;letter-spacing:8px;color:#0f2b5b;">${code}</span>
    </div>
    <p style="margin:0;font-size:13px;color:#9ca3af;">This code expires in 10 minutes. If you did not request this, you can safely ignore this email.</p>
  </td></tr>
</table>
</td></tr></table>
</body></html>`;

    await sendEmail(graphEnv, {
      to: normalizedEmail,
      subject: 'Your Stancil Store login code',
      html,
    });
  }

  return new Response(JSON.stringify({ success: true }), {
    headers: { 'Content-Type': 'application/json' },
  });
};
