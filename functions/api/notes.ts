import { requireAuth } from '../_lib/auth';

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

const MAX_TEXT = 5000;
const MAX_NOTES = 1000;

function keyFor(c: Collection): string {
  return `_data/notes/${c}.json`;
}

function getCollection(url: URL): Collection | null {
  const c = url.searchParams.get('collection') ?? 'public';
  return (COLLECTIONS as readonly string[]).includes(c) ? (c as Collection) : null;
}

async function checkAccess(c: Collection, request: Request, secret: string): Promise<boolean> {
  if (c === 'public') return true;
  const session = await requireAuth(request, secret);
  return !!session;
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

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const c = getCollection(url);
  if (!c) return Response.json({ error: 'Invalid collection' }, { status: 400 });
  if (!(await checkAccess(c, request, env.AUTH_SECRET))) {
    return new Response('Unauthorized', { status: 401 });
  }
  const notes = await loadNotes(env, c);
  return Response.json(notes, { headers: { 'cache-control': 'no-store' } });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const c = getCollection(url);
  if (!c) return Response.json({ error: 'Invalid collection' }, { status: 400 });
  if (!(await checkAccess(c, request, env.AUTH_SECRET))) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const text = body.text?.trim();
  if (!text || typeof text !== 'string') {
    return Response.json({ error: 'Missing text' }, { status: 400 });
  }
  if (text.length > MAX_TEXT) {
    return Response.json({ error: 'Too long' }, { status: 400 });
  }

  const notes = await loadNotes(env, c);
  if (notes.length >= MAX_NOTES) notes.pop();
  notes.unshift({
    id: crypto.randomUUID(),
    text,
    struck: [],
    createdAt: Date.now(),
  });
  await saveNotes(env, c, notes);
  return Response.json({ ok: true }, { status: 201 });
};
