import type { APIRoute } from 'astro';

export const GET: APIRoute = async ({ url, locals }) => {
  const env = locals.runtime.env as any;
  const redirect = url.searchParams.get('redirect') || '/';

  const state = btoa(JSON.stringify({ redirect }));
  const redirectUri = `${url.origin}/api/auth/callback`;

  const params = new URLSearchParams({
    client_id: env.AZURE_CLIENT_ID,
    response_type: 'code',
    redirect_uri: redirectUri,
    scope: 'openid email profile',
    state,
    prompt: 'select_account',
  });

  const authorizeUrl = `https://login.microsoftonline.com/${env.AZURE_TENANT_ID}/oauth2/v2.0/authorize?${params}`;

  return new Response(null, {
    status: 302,
    headers: { Location: authorizeUrl },
  });
};
