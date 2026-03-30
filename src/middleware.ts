import { defineMiddleware } from 'astro:middleware';

export const onRequest = defineMiddleware(async (context, next) => {
  const email = context.request.headers.get('Cf-Access-Authenticated-User-Email');
  // If Cloudflare Access is not in front (e.g. *.pages.dev), allow through with fallback email
  context.locals.userEmail = email
    ? email.toLowerCase().trim()
    : 'brian.mangum@stancilservices.com';

  // CSRF: check Origin on mutations
  if (context.request.method !== 'GET') {
    const origin = context.request.headers.get('Origin');
    const expected = context.url.origin;
    if (origin && origin !== expected) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }
  }

  return next();
});
