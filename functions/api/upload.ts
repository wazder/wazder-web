import { requireAuth } from '../_lib/auth';

interface Env {
  CONTENT: R2Bucket;
  AUTH_SECRET: string;
}

const MAX_BYTES = 25 * 1024 * 1024;
const RESERVED = new Set([
  '', 'upload', 'notes', 'notes.admin', 'cv', 'api', 'index.html',
  '404', 'favicon.ico', 'hub', 'py', 'delete', 'edit', 'ascii',
]);

function normalizePath(input: string): string {
  return input.trim().replace(/^\/+|\/+$/g, '');
}

function isValidPath(p: string): boolean {
  if (!p) return false;
  if (p.length > 200) return false;
  if (p.startsWith('_')) return false;
  if (RESERVED.has(p)) return false;
  if (RESERVED.has(p.split('/')[0])) return false;
  if (/[\x00-\x1f]/.test(p)) return false;
  if (!/^[a-zA-Z0-9._/\-]+$/.test(p)) return false;
  return true;
}

const TEXT_FORMATS = new Set(['md', 'html', 'css', 'js', 'text', 'json', 'python', 'svg']);

function inferFormatFromName(name: string, mime?: string): string {
  if (mime?.startsWith('image/svg')) return 'svg';
  if (mime?.startsWith('image/')) return 'image';
  if (mime?.startsWith('font/')) return 'font';
  if (mime?.startsWith('audio/')) return 'audio';
  if (mime?.startsWith('video/')) return 'video';
  const ext = name.toLowerCase().split('.').pop() ?? '';
  switch (ext) {
    case 'md': case 'markdown': return 'md';
    case 'html': case 'htm': return 'html';
    case 'css': return 'css';
    case 'mjs': case 'js': return 'js';
    case 'json': return 'json';
    case 'py': return 'python';
    case 'txt': return 'text';
    case 'svg': return 'svg';
    case 'png': case 'jpg': case 'jpeg': case 'webp': case 'gif': case 'avif': case 'ico': return 'image';
    case 'woff': case 'woff2': case 'ttf': case 'otf': return 'font';
    case 'pdf': return 'pdf';
    default: return 'binary';
  }
}

function contentTypeFor(format: string, fallback?: string): string {
  switch (format) {
    case 'md': return 'text/markdown; charset=utf-8';
    case 'html': return 'text/html; charset=utf-8';
    case 'css': return 'text/css; charset=utf-8';
    case 'js': return 'application/javascript; charset=utf-8';
    case 'text': return 'text/plain; charset=utf-8';
    case 'json': return 'application/json; charset=utf-8';
    case 'python': return 'text/x-python; charset=utf-8';
    case 'svg': return 'image/svg+xml';
    case 'pdf': return 'application/pdf';
    default: return fallback ?? 'application/octet-stream';
  }
}

async function storeAndRespond(
  env: Env,
  path: string,
  body: ArrayBuffer | Uint8Array,
  format: string,
  isPublic: boolean,
  fallbackMime?: string,
): Promise<Response> {
  await env.CONTENT.put(path, body, {
    httpMetadata: { contentType: contentTypeFor(format, fallbackMime) },
    customMetadata: { format, public: isPublic ? 'true' : 'false' },
  });
  return Response.json({ ok: true, path, url: `/${path}` }, { status: 201 });
}

async function checkExistingOwnership(
  env: Env,
  path: string,
  request: Request,
): Promise<Response | null> {
  const existing = await env.CONTENT.head(path);
  if (!existing) return null;
  const existingIsPublic = existing.customMetadata?.public === 'true';
  if (existingIsPublic) return null;
  const session = await requireAuth(request, env.AUTH_SECRET);
  if (!session) return new Response('Path is owned (auth required to overwrite)', { status: 401 });
  return null;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const ct = request.headers.get('content-type') ?? '';

  if (ct.startsWith('multipart/form-data')) {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return Response.json({ error: 'Invalid form' }, { status: 400 });
    }
    const rawPath = String(form.get('path') ?? '');
    const isPublic = form.get('public') === 'true';
    const file = form.get('file');
    if (!(file instanceof File)) return Response.json({ error: 'Missing file' }, { status: 400 });

    if (!isPublic) {
      const session = await requireAuth(request, env.AUTH_SECRET);
      if (!session) return new Response('Unauthorized', { status: 401 });
    }

    const path = normalizePath(rawPath);
    if (!isValidPath(path)) return Response.json({ error: 'Invalid or reserved path' }, { status: 400 });
    if (file.size > MAX_BYTES) return Response.json({ error: 'Content too large' }, { status: 413 });

    const ownErr = await checkExistingOwnership(env, path, request);
    if (ownErr) return ownErr;

    const format = inferFormatFromName(file.name, file.type);
    const fallbackMime = file.type || undefined;
    return storeAndRespond(env, path, await file.arrayBuffer(), format, isPublic, fallbackMime);
  }

  let body: { path?: string; content?: string; format?: string; public?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const path = normalizePath(body.path ?? '');
  const format = (body.format ?? 'md').toLowerCase();
  const content = body.content ?? '';
  const isPublic = body.public === true;

  if (!isPublic) {
    const session = await requireAuth(request, env.AUTH_SECRET);
    if (!session) return new Response('Unauthorized', { status: 401 });
  }

  if (!isValidPath(path)) return Response.json({ error: 'Invalid or reserved path' }, { status: 400 });
  if (!TEXT_FORMATS.has(format)) return Response.json({ error: 'Invalid format' }, { status: 400 });
  if (typeof content !== 'string' || content.length === 0) {
    return Response.json({ error: 'Empty content' }, { status: 400 });
  }
  const bytes = new TextEncoder().encode(content);
  if (bytes.length > MAX_BYTES) return Response.json({ error: 'Content too large' }, { status: 413 });

  const ownErr2 = await checkExistingOwnership(env, path, request);
  if (ownErr2) return ownErr2;

  return storeAndRespond(env, path, bytes, format, isPublic);
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const session = await requireAuth(request, env.AUTH_SECRET);
  if (!session) return new Response('Unauthorized', { status: 401 });
  const url = new URL(request.url);
  const path = normalizePath(url.searchParams.get('path') ?? '');
  if (!isValidPath(path)) return Response.json({ error: 'Invalid path' }, { status: 400 });
  await env.CONTENT.delete(path);
  return Response.json({ ok: true, path });
};
