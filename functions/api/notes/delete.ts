import { requireAuth } from '../../_lib/auth';

interface Env {
  CONTENT: R2Bucket;
  AUTH_SECRET: string;
}

interface Note {
  id: string;
  text: string;
  struck: [number, number][];
  createdAt: number;
}

const COLLECTIONS = ['public', 'private', 'admin'] as const;
type Collection = (typeof COLLECTIONS)[number];

function keyFor(c: Collection): string {
  return `_data/notes/${c}.json`;
}

function getCollection(url: URL): Collection | null {
  const c = url.searchParams.get('collection') ?? 'public';
  return (COLLECTIONS as readonly string[]).includes(c) ? (c as Collection) : null;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const session = await requireAuth(request, env.AUTH_SECRET);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const url = new URL(request.url);
  const c = getCollection(url);
  if (!c) return Response.json({ error: 'Invalid collection' }, { status: 400 });

  let body: { id?: string; clear?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  if (body.clear) {
    await env.CONTENT.delete(keyFor(c));
    return Response.json({ ok: true, cleared: true });
  }

  if (!body.id) return Response.json({ error: 'Missing id' }, { status: 400 });

  const obj = await env.CONTENT.get(keyFor(c));
  if (!obj) return Response.json({ ok: true, removed: 0 });
  const notes: Note[] = JSON.parse(await obj.text());
  const filtered = notes.filter((n) => n.id !== body.id);
  if (filtered.length === notes.length) {
    return Response.json({ ok: true, removed: 0 });
  }
  await env.CONTENT.put(keyFor(c), JSON.stringify(filtered), {
    httpMetadata: { contentType: 'application/json' },
  });
  return Response.json({ ok: true, removed: notes.length - filtered.length });
};
