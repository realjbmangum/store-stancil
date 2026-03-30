/**
 * JWT session utilities using Web Crypto API (Cloudflare Workers compatible).
 * No external dependencies.
 */

const SESSION_COOKIE = 'session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function base64urlEncode(data: Uint8Array): string {
  let binary = '';
  for (const byte of data) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str.replace(/-/g, '+').replace(/_/g, '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function strToBytes(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

async function getKey(secret: string): Promise<CryptoKey> {
  const keyBytes = new Uint8Array(secret.match(/.{1,2}/g)!.map(b => parseInt(b, 16)));
  return crypto.subtle.importKey('raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

export async function createSessionToken(email: string, secret: string): Promise<string> {
  const header = base64urlEncode(strToBytes(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64urlEncode(strToBytes(JSON.stringify({ sub: email, iat: now, exp: now + SESSION_MAX_AGE })));
  const data = `${header}.${payload}`;
  const key = await getKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, strToBytes(data)));
  return `${data}.${base64urlEncode(sig)}`;
}

export async function createRegistrationToken(email: string, secret: string): Promise<string> {
  const header = base64urlEncode(strToBytes(JSON.stringify({ alg: 'HS256', typ: 'JWT' })));
  const now = Math.floor(Date.now() / 1000);
  const payload = base64urlEncode(strToBytes(JSON.stringify({ sub: email, reg: true, iat: now, exp: now + 900 })));
  const data = `${header}.${payload}`;
  const key = await getKey(secret);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, strToBytes(data)));
  return `${data}.${base64urlEncode(sig)}`;
}

export async function verifySessionToken(token: string, secret: string): Promise<{ sub: string; reg?: boolean } | null> {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const key = await getKey(secret);
    const valid = await crypto.subtle.verify('HMAC', key, base64urlDecode(signature), strToBytes(`${header}.${payload}`));
    if (!valid) return null;
    const decoded = JSON.parse(new TextDecoder().decode(base64urlDecode(payload)));
    if (decoded.exp < Math.floor(Date.now() / 1000)) return null;
    return decoded;
  } catch {
    return null;
  }
}

export function getSessionCookie(request: Request): string | null {
  const cookies = request.headers.get('Cookie') || '';
  const match = cookies.match(new RegExp(`(?:^|;\\s*)${SESSION_COOKIE}=([^;]+)`));
  return match ? match[1] : null;
}

export function setSessionCookieHeader(token: string, isSecure: boolean): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; ${isSecure ? 'Secure; ' : ''}SameSite=Lax; Max-Age=${SESSION_MAX_AGE}`;
}

export function clearSessionCookieHeader(isSecure: boolean): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; ${isSecure ? 'Secure; ' : ''}SameSite=Lax; Max-Age=0`;
}
