// FastCat (Godot HTML5 build) served at /fastcat/ from the shared `pull-web`
// R2 bucket, where the game repo uploads it under `play/*`
// (pull repo: bash relay/upload_web.sh). R2 keeps index.wasm off Pages, which
// caps uploaded files at 25 MiB.

interface Env {
  FASTCAT: R2Bucket;
}

const PREFIX = 'play/';

const TYPES: Record<string, string> = {
  html: 'text/html; charset=utf-8',
  js: 'text/javascript; charset=utf-8',
  wasm: 'application/wasm',
  png: 'image/png',
  json: 'application/json; charset=utf-8',
};

export const onRequest: PagesFunction<Env> = async ({ params, env, request }) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method Not Allowed', { status: 405, headers: { allow: 'GET, HEAD' } });
  }
  if (!env.FASTCAT) return new Response('Not Found', { status: 404 });

  const raw = Array.isArray(params.path) ? params.path.join('/') : ((params.path as string | undefined) ?? '');
  let rel: string;
  try {
    rel = decodeURIComponent(raw).replace(/^\/+|\/+$/g, '');
  } catch {
    return new Response('Bad Request', { status: 400 });
  }
  if (!rel) {
    // Relative asset paths in the Godot shell only resolve under a trailing slash.
    const url = new URL(request.url);
    if (!url.pathname.endsWith('/')) {
      url.pathname += '/';
      return Response.redirect(url.toString(), 308);
    }
    rel = 'index.html';
  }
  if (rel.split('/').some((part) => part === '..' || part === '.')) {
    return new Response('Not Found', { status: 404 });
  }

  const obj = await env.FASTCAT.get(PREFIX + rel, { onlyIf: request.headers });
  if (!obj) return new Response('Not Found', { status: 404 });

  const ext = rel.includes('.') ? rel.slice(rel.lastIndexOf('.') + 1).toLowerCase() : '';
  const headers = new Headers({
    'content-type': TYPES[ext] ?? 'application/octet-stream',
    // Browsers may store every file but must revalidate, so a new build lands
    // without a stale wasm/pck pair.
    'cache-control': 'no-cache',
    etag: obj.httpEtag,
  });
  if (!('body' in obj)) return new Response(null, { status: 304, headers });
  if (request.method === 'HEAD') {
    headers.set('content-length', String(obj.size));
    return new Response(null, { headers });
  }
  return new Response(obj.body, { headers });
};
