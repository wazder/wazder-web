import { requireAuth } from '../_lib/auth';

interface Env {
  AUTH_SECRET: string;
}

export const onRequest: PagesFunction<Env> = async ({ request, env, next }) => {
  const session = await requireAuth(request, env.AUTH_SECRET);
  if (!session) {
    const accept = request.headers.get('accept') ?? '';
    const wantsHtml = accept.includes('text/html');
    if (wantsHtml) {
      const url = new URL(request.url);
      return Response.redirect(new URL(`/hub?next=${encodeURIComponent(url.pathname)}`, url).toString(), 302);
    }
    return new Response('unauthorized', {
      status: 401,
      headers: { 'cache-control': 'no-store' },
    });
  }
  const res = await next();
  const headers = new Headers(res.headers);
  headers.set('cache-control', 'private, no-store');
  return new Response(res.body, { status: res.status, statusText: res.statusText, headers });
};
