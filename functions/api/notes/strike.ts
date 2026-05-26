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

async function checkAccess(c: Collection, request: Request, secret: string): Promise<boolean> {
  if (c === 'public') return true;
  const session = await requireAuth(request, secret);
  return !!session;
}

function mergeRanges(ranges: [number, number][]): [number, number][] {
  if (ranges.length === 0) return [];
  const sorted = [...ranges].sort((a, b) => a[0] - b[0]);
  const result: [number, number][] = [[sorted[0][0], sorted[0][1]]];
  for (let i = 1; i < sorted.length; i++) {
    const last = result[result.length - 1];
    const cur = sorted[i];
    if (cur[0] <= last[1]) {
      last[1] = Math.max(last[1], cur[1]);
    } else {
      result.push([cur[0], cur[1]]);
    }
  }
  return result;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const c = getCollection(url);
  if (!c) return Response.json({ error: 'Invalid collection' }, { status: 400 });
  if (!(await checkAccess(c, request, env.AUTH_SECRET))) {
    return new Response('Unauthorized', { status: 401 });
  }

  let body: { id?: string; start?: number; end?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { id, start, end } = body;
  if (!id || typeof start !== 'number' || typeof end !== 'number') {
    return Response.json({ error: 'Invalid' }, { status: 400 });
  }
  if (start >= end) return Response.json({ error: 'Empty range' }, { status: 400 });

  const obj = await env.CONTENT.get(keyFor(c));
  if (!obj) return new Response('Not found', { status: 404 });
  const notes: Note[] = JSON.parse(await obj.text());
  const note = notes.find((n) => n.id === id);
  if (!note) return new Response('Note not found', { status: 404 });

  const s = Math.max(0, Math.min(start, note.text.length));
  const e = Math.max(s, Math.min(end, note.text.length));
  if (s === e) return Response.json({ error: 'Empty range' }, { status: 400 });

  note.struck = mergeRanges([...note.struck, [s, e]]);

  await env.CONTENT.put(keyFor(c), JSON.stringify(notes), {
    httpMetadata: { contentType: 'application/json' },
  });
  return Response.json({ ok: true });
};
