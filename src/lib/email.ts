/**
 * Microsoft Graph API email sender for the Stancil Store (Cloudflare Workers/Pages).
 * Uses OAuth2 client credentials flow with in-memory token caching.
 */

const SENDER_EMAIL = 'store@stancilservices.com';
const GRAPH_SEND_URL = `https://graph.microsoft.com/v1.0/users/${SENDER_EMAIL}/sendMail`;
const TOKEN_CACHE_BUFFER = 100; // seconds before expiry to refresh

let cachedToken: { value: string; expiresAt: number } | null = null;

export interface GraphEnv {
  GRAPH_TENANT_ID: string;
  GRAPH_CLIENT_ID: string;
  GRAPH_CLIENT_SECRET: string;
}

interface SendEmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  cc?: string[];
  bcc?: string[];
}

interface SendEmailResult {
  success: boolean;
  error?: string;
}

async function getAccessToken(env: GraphEnv): Promise<string> {
  const now = Math.floor(Date.now() / 1000);

  if (cachedToken && cachedToken.expiresAt > now) {
    return cachedToken.value;
  }

  const tokenUrl = `https://login.microsoftonline.com/${env.GRAPH_TENANT_ID}/oauth2/v2.0/token`;

  const body = new URLSearchParams({
    client_id: env.GRAPH_CLIENT_ID,
    client_secret: env.GRAPH_CLIENT_SECRET,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as { access_token: string; expires_in: number };

  cachedToken = {
    value: data.access_token,
    expiresAt: now + data.expires_in - TOKEN_CACHE_BUFFER,
  };

  return cachedToken.value;
}

function toRecipients(emails: string[]) {
  return emails.map((email) => ({
    emailAddress: { address: email },
  }));
}

export async function sendEmail(env: GraphEnv, options: SendEmailOptions): Promise<SendEmailResult> {
  try {
    const token = await getAccessToken(env);

    const toList = Array.isArray(options.to) ? options.to : [options.to];

    const message: Record<string, unknown> = {
      subject: options.subject,
      body: {
        contentType: 'HTML',
        content: options.html,
      },
      toRecipients: toRecipients(toList),
    };

    if (options.cc?.length) {
      message.ccRecipients = toRecipients(options.cc);
    }
    if (options.bcc?.length) {
      message.bccRecipients = toRecipients(options.bcc);
    }

    const res = await fetch(GRAPH_SEND_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ message, saveToSentItems: false }),
    });

    if (!res.ok) {
      const text = await res.text();
      return { success: false, error: `Graph API error (${res.status}): ${text}` };
    }

    return { success: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}
