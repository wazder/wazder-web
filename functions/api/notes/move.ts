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

const COLLECTIONS = ['public', 'private'] as const;
type Collection = (typeof COLLECTIONS)[number];

function keyFor(c: Collection): string {
  return `_data/notes/${c}.json`;
}

async function loadNotes(env: Env, c: Collection): Promise<Note[]> {
  const obj = await env.CONTENT.get(keyFor(c));
  if (!obj) return [];
  try {
    return JSON.parse(await obj.text());
  } catch {
    return [];
  }
}

async function saveNotes(env: Env, c: Collection, notes: Note[]): Promise<void> {
  await env.CONTENT.put(keyFor(c), JSON.stringify(notes), {
    httpMetadata: { contentType: 'application/json' },
  });
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const session = await requireAuth(request, env.AUTH_SECRET);
  if (!session) return new Response('Unauthorized', { status: 401 });

  let body: { id?: string; from?: string; to?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { id, from, to } = body;
  if (!id || !from || !to) return Response.json({ error: 'Missing fields' }, { status: 400 });
  if (!(COLLECTIONS as readonly string[]).includes(from) || !(COLLECTIONS as readonly string[]).includes(to)) {
    return Response.json({ error: 'Invalid collection' }, { status: 400 });
  }
  if (from === to) return Response.json({ ok: true, moved: 0 });

  const src = await loadNotes(env, from as Collection);
  const note = src.find((n) => n.id === id);
  if (!note) return Response.json({ error: 'Not found' }, { status: 404 });

  const newSrc = src.filter((n) => n.id !== id);
  const dst = await loadNotes(env, to as Collection);
  dst.unshift(note);

  await Promise.all([
    saveNotes(env, from as Collection, newSrc),
    saveNotes(env, to as Collection, dst),
  ]);

  return Response.json({ ok: true, moved: 1 });
};
