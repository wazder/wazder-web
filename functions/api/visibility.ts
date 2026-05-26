import { requireAuth } from '../_lib/auth';

interface Env {
  CONTENT: R2Bucket;
  AUTH_SECRET: string;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const session = await requireAuth(request, env.AUTH_SECRET);
  if (!session) return new Response('Unauthorized', { status: 401 });

  let body: { path?: string; public?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const path = (body.path ?? '').trim().replace(/^\/+|\/+$/g, '');
  if (!path || path.startsWith('_')) return Response.json({ error: 'Invalid path' }, { status: 400 });
  const newPublic = body.public === true;

  const obj = await env.CONTENT.get(path);
  if (!obj) return Response.json({ error: 'Not found' }, { status: 404 });

  const prevMeta = obj.customMetadata ?? {};
  const prevHttp = obj.httpMetadata ?? {};
  await env.CONTENT.put(path, obj.body, {
    httpMetadata: prevHttp,
    customMetadata: { ...prevMeta, public: newPublic ? 'true' : 'false' },
  });
  return Response.json({ ok: true, path, public: newPublic });
};
