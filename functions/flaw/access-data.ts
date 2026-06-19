import { requireAuth } from '../_lib/auth';

/**
 * Server-side proxy for the flaw.wazder.com access-gate log. Keeps the admin
 * bearer token (FLAW_ADMIN_TOKEN) on the server — the /flaw/access page fetches
 * THIS same-origin endpoint, which is already behind the passkey gate
 * (functions/flaw/_middleware.ts). Returns the raw JSON from the admin API.
 */
interface Env {
  AUTH_SECRET: string;
  FLAW_ADMIN_TOKEN: string;
  FLAW_ADMIN_URL?: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const session = await requireAuth(request, env.AUTH_SECRET);
  if (!session) return new Response('unauthorized', { status: 401 });

  if (!env.FLAW_ADMIN_TOKEN) {
    return Response.json({ error: 'FLAW_ADMIN_TOKEN not configured' }, { status: 500 });
  }

  const base = env.FLAW_ADMIN_URL ?? 'https://flaw.wazder.com';
  let upstream: Response;
  try {
    upstream = await fetch(`${base}/api/admin/access-log?limit=300`, {
      headers: { authorization: `Bearer ${env.FLAW_ADMIN_TOKEN}` },
    });
  } catch {
    return Response.json({ error: 'upstream unreachable' }, { status: 502 });
  }

  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });
};
