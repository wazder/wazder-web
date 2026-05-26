import { marked } from 'marked';
import { requireAuth } from './_lib/auth';

interface Env {
  CONTENT: R2Bucket;
  ASSETS: Fetcher;
  AUTH_SECRET: string;
}

const REDIRECTS: Record<string, string> = {
  cv: '/hasan-tatar-cv.pdf',
};

export const onRequestGet: PagesFunction<Env> = async ({ params, env, request }) => {
  const staticResponse = await env.ASSETS.fetch(request);
  if (staticResponse.status !== 404) {
    return staticResponse;
  }

  const raw = Array.isArray(params.slug) ? params.slug.join('/') : (params.slug as string | undefined);
  const key = (raw ?? '').replace(/^\/+|\/+$/g, '');
  if (!key) return staticResponse;
  if (key.startsWith('_')) return new Response('Not Found', { status: 404 });

  const redirect = REDIRECTS[key];
  if (redirect) {
    return Response.redirect(new URL(redirect, request.url).toString(), 302);
  }

  let obj = await env.CONTENT.get(key);
  if (!obj && !/\.[a-z0-9]+$/i.test(key)) {
    const indexObj =
      (await env.CONTENT.get(`${key}/index.html`)) ?? (await env.CONTENT.get(`${key}/index.htm`));
    if (indexObj) {
      const reqUrl = new URL(request.url);
      if (!reqUrl.pathname.endsWith('/')) {
        reqUrl.pathname += '/';
        return Response.redirect(reqUrl.toString(), 308);
      }
      obj = indexObj;
    }
  }
  if (!obj) return staticResponse;

  const isPublic = obj.customMetadata?.public === 'true';
  if (!isPublic) {
    const session = await requireAuth(request, env.AUTH_SECRET);
    if (!session) return unauthorizedPage();
  }

  const format = obj.customMetadata?.format;
  const contentType = obj.httpMetadata?.contentType ?? 'application/octet-stream';
  const isMarkdown = format === 'md' || contentType.startsWith('text/markdown') || contentType.startsWith('text/x-markdown');
  const isPython = format === 'python' || contentType.startsWith('text/x-python');
  const isText = format === 'text' || contentType.startsWith('text/plain');

  const cacheControl = isPublic ? 'public, max-age=60' : 'private, no-store';

  if (isMarkdown) {
    const md = await obj.text();
    if (looksLikePreformatted(md)) {
      return new Response(wrapPre(md, key), {
        headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': cacheControl },
      });
    }
    const html = await marked.parse(md);
    return new Response(wrap(html, key), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': cacheControl },
    });
  }

  if (isText) {
    const txt = await obj.text();
    return new Response(wrapPre(txt, key), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': cacheControl },
    });
  }

  if (isPython) {
    const code = await obj.text();
    return new Response(wrapPython(code, key), {
      headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': cacheControl },
    });
  }

  return new Response(obj.body, {
    headers: {
      'content-type': contentType,
      'cache-control': isPublic ? (obj.httpMetadata?.cacheControl ?? 'public, max-age=300') : 'private, no-store',
    },
  });
};

function wrap(html: string, title: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — wazder</title>
<link rel="icon" href="/favicon.ico?v=5" sizes="any" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=5" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=5" />
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #000; color: rgba(255,255,255,0.85); font: 16px/1.6 -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; -webkit-font-smoothing: antialiased; }
  main { max-width: 48rem; margin: 0 auto; padding: 5rem 1.5rem; }
  h1, h2, h3, h4 { font-weight: 300; letter-spacing: -0.01em; line-height: 1.2; color: #fff; }
  h1 { font-size: 2rem; margin: 0 0 1rem; }
  h2 { font-size: 1.5rem; margin: 2.5rem 0 0.75rem; }
  h3 { font-size: 1.25rem; margin: 1.75rem 0 0.5rem; }
  p { margin: 0 0 1rem; color: rgba(255,255,255,0.7); }
  a { color: #fff; text-decoration: underline; text-decoration-color: rgba(255,255,255,0.3); text-underline-offset: 4px; }
  a:hover { text-decoration-color: #fff; }
  code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 0.9em; background: rgba(255,255,255,0.06); padding: 0.1em 0.4em; border-radius: 4px; }
  pre { background: rgba(255,255,255,0.04); padding: 1rem; border-radius: 6px; overflow-x: auto; font-size: 0.85rem; line-height: 1.5; }
  pre code { background: none; padding: 0; }
  blockquote { border-left: 2px solid rgba(255,255,255,0.2); padding-left: 1rem; margin: 1rem 0; color: rgba(255,255,255,0.55); }
  ul, ol { padding-left: 1.5rem; color: rgba(255,255,255,0.7); }
  hr { border: 0; border-top: 1px solid rgba(255,255,255,0.1); margin: 2rem 0; }
  img { max-width: 100%; height: auto; }
  table { border-collapse: collapse; width: 100%; margin: 1rem 0; }
  th, td { padding: 0.5rem 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.1); text-align: left; }
</style>
</head>
<body><main>${html}</main></body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
}

function looksLikePreformatted(text: string): boolean {
  const lines = text.split('\n').filter((l) => l.length > 0);
  if (lines.length < 3) return false;
  let mdMarkers = 0;
  for (const l of lines) {
    if (/^#{1,6}\s/.test(l)) mdMarkers++;
    if (/^[-*]\s/.test(l)) mdMarkers++;
    if (/^>\s/.test(l)) mdMarkers++;
    if (/\[[^\]]+\]\([^)]+\)/.test(l)) mdMarkers++;
  }
  if (mdMarkers > 0) return false;
  let asciiChars = 0;
  let total = 0;
  for (const l of lines) {
    for (const c of l) {
      total++;
      if (' _\\-|/()[]{}<>~^*=+.,:;'.includes(c)) asciiChars++;
    }
  }
  return total > 50 && asciiChars / total > 0.6;
}

function wrapPre(text: string, title: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — wazder</title>
<link rel="icon" href="/favicon.ico?v=5" sizes="any" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=5" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=5" />
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #000; color: #fff; font: 13px/1.2 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; min-height: 100vh; padding: 2rem 1.5rem; -webkit-font-smoothing: antialiased; }
  main { max-width: 60rem; margin: 0 auto; }
  pre { white-space: pre; font-family: inherit; font-size: inherit; line-height: inherit; color: #fff; overflow-x: auto; }
</style>
</head>
<body><main><pre>${escapeHtml(text)}</pre></main></body>
</html>`;
}

function unauthorizedPage(): Response {
  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>401 — wazder</title>
<link rel="icon" href="/favicon.ico?v=5" />
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #000; color: #fff; font: 14px ui-monospace, SFMono-Regular, Menlo, monospace; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 1.5rem; }
  a { color: #fff; text-decoration: none; transition: text-decoration 200ms ease; }
  a:hover { text-decoration: underline; text-underline-offset: 4px; }
</style>
</head>
<body><a href="/">401 · unauthorized</a></body>
</html>`;
  return new Response(html, {
    status: 401,
    headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' },
  });
}

function wrapPython(code: string, title: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — wazder</title>
<link rel="icon" href="/favicon.ico?v=5" sizes="any" />
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=5" />
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png?v=5" />
<style>
  :root { color-scheme: dark; }
  * { box-sizing: border-box; }
  body { margin: 0; background: #000; color: #fff; font: 14px/1.6 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; -webkit-font-smoothing: antialiased; }
  main { max-width: 48rem; margin: 0 auto; padding: 2.5rem 1.5rem; }
  .label { font-size: 11px; font-weight: 100; text-transform: uppercase; letter-spacing: 0.2em; margin-bottom: 0.5rem; }
  .status { font-size: 12px; font-weight: 100; margin-bottom: 1rem; }
  pre { margin: 0; white-space: pre-wrap; word-wrap: break-word; }
  .code { border: 1px solid rgba(255,255,255,0.2); border-radius: 4px; padding: 0.75rem 1rem; margin-bottom: 1.5rem; }
  .output { border-left: 1px solid #fff; padding-left: 1rem; min-height: 1.5em; }
</style>
</head>
<body>
<main>
  <p id="status" class="status">loading pyodide…</p>
  <div class="label">code</div>
  <div class="code"><pre>${escapeHtml(code)}</pre></div>
  <div class="label">output</div>
  <pre id="output" class="output"></pre>
</main>
<script src="https://cdn.jsdelivr.net/pyodide/v0.26.4/full/pyodide.js"></script>
<script>
  const code = ${JSON.stringify(code)};
  const statusEl = document.getElementById('status');
  const outputEl = document.getElementById('output');
  (async () => {
    try {
      const pyodide = await loadPyodide();
      pyodide.setStdout({ batched: (s) => outputEl.textContent += s + '\\n' });
      pyodide.setStderr({ batched: (s) => outputEl.textContent += s + '\\n' });
      statusEl.textContent = 'running…';
      const result = await pyodide.runPythonAsync(code);
      if (result !== undefined && result !== null) outputEl.textContent += String(result);
      statusEl.textContent = 'done · python ' + pyodide.version;
    } catch (e) {
      outputEl.textContent += String(e);
      statusEl.textContent = 'error';
    }
  })();
</script>
</body>
</html>`;
}
