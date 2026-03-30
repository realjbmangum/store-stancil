import type { APIRoute } from 'astro';
import { clearSessionCookieHeader } from '../../../lib/session';

export const POST: APIRoute = async ({ url }) => {
  const isSecure = url.protocol === 'https:';
  return new Response(null, {
    status: 302,
    headers: {
      Location: '/login',
      'Set-Cookie': clearSessionCookieHeader(isSecure),
    },
  });
};
