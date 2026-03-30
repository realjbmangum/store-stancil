import { defineMiddleware } from 'astro:middleware';
import { getSessionCookie, verifySessionToken } from './lib/session';

const PUBLIC_PATHS = ['/login', '/register', '/api/auth/'];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(p => pathname === p || pathname.startsWith(p));
}

export const onRequest = defineMiddleware(async (context, next) => {
  const { url, request } = context;
  const env = context.locals.runtime?.env as any;

  // CSRF: check Origin on mutations
  if (request.method !== 'GET') {
    const origin = request.headers.get('Origin');
    const expected = url.origin;
    if (origin && origin !== expected) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  // Try to read session
  const token = getSessionCookie(request);
  if (token && env?.SESSION_SECRET) {
    const payload = await verifySessionToken(token, env.SESSION_SECRET);
    if (payload && !payload.reg) {
      context.locals.userEmail = payload.sub;
    }
  }

  // Public routes don't require auth
  if (isPublic(url.pathname)) {
    return next();
  }

  // Protected route — must be authenticated
  if (!context.locals.userEmail) {
    const redirectTo = `/login?redirect=${encodeURIComponent(url.pathname + url.search)}`;
    return context.redirect(redirectTo);
  }

  return next();
});
