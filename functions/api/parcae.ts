import { requireAuth } from '../_lib/auth';

interface Env {
  CONTENT: R2Bucket;
  AUTH_SECRET: string;
}

interface Entry {
  id: string;
  who: string;
  answers: Record<string, { v?: unknown; n?: string }>;
  submitted: boolean;
  createdAt: number;
  updatedAt: number;
}

interface Store {
  entries: Entry[];
}

const KEY = '_data/parcae/responses.json';
const PEOPLE = ['hasan', 'nihat', 'bilge'] as const;
const MAX_BODY = 256 * 1024;
const MAX_ENTRIES = 200;
const PUT_RETRIES = 4;

function emptyStore(): Store {
  return { entries: [] };
}

async function load(env: Env): Promise<{ store: Store; etag: string | null }> {
  const obj = await env.CONTENT.get(KEY);
  if (!obj) return { store: emptyStore(), etag: null };
  try {
    const parsed = JSON.parse(await obj.text()) as Store;
    return { store: parsed?.entries ? parsed : emptyStore(), etag: obj.etag };
  } catch {
    return { store: emptyStore(), etag: obj.etag };
  }
}

// R2 read-modify-write is not atomic: three people autosaving at once could
// drop an entry. Retry on the etag so the loser re-reads instead of clobbering.
async function save(env: Env, store: Store, etag: string | null): Promise<boolean> {
  const body = JSON.stringify(store);
  const opts: R2PutOptions = {
    httpMetadata: { contentType: 'application/json' },
    onlyIf: etag ? { etagMatches: etag } : { etagDoesNotMatch: '*' },
  };
  const res = await env.CONTENT.put(KEY, body, opts);
  return res !== null;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const raw = await request.text();
  if (raw.length > MAX_BODY) {
    return Response.json({ error: 'Too large' }, { status: 413 });
  }

  let payload: Partial<Entry>;
  try {
    payload = JSON.parse(raw);
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const who = String(payload.who ?? '');
  if (!(PEOPLE as readonly string[]).includes(who)) {
    return Response.json({ error: 'Unknown participant' }, { status: 400 });
  }
  const id = String(payload.id ?? '').slice(0, 64);
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
    return Response.json({ error: 'Invalid session id' }, { status: 400 });
  }
  const answers = payload.answers;
  if (!answers || typeof answers !== 'object' || Array.isArray(answers)) {
    return Response.json({ error: 'Invalid answers' }, { status: 400 });
  }

  const now = Date.now();
  for (let attempt = 0; attempt < PUT_RETRIES; attempt++) {
    const { store, etag } = await load(env);
    const existing = store.entries.find((e) => e.id === id);

    if (existing) {
      existing.who = who;
      existing.answers = answers as Entry['answers'];
      existing.submitted = !!payload.submitted;
      existing.updatedAt = now;
    } else {
      if (store.entries.length >= MAX_ENTRIES) {
        store.entries.sort((a, b) => a.updatedAt - b.updatedAt);
        store.entries.splice(0, store.entries.length - MAX_ENTRIES + 1);
      }
      store.entries.push({
        id,
        who,
        answers: answers as Entry['answers'],
        submitted: !!payload.submitted,
        createdAt: now,
        updatedAt: now,
      });
    }

    if (await save(env, store, etag)) {
      return Response.json({ ok: true, savedAt: now }, { headers: { 'cache-control': 'no-store' } });
    }
  }

  return Response.json({ error: 'Busy, try again' }, { status: 503 });
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const session = await requireAuth(request, env.AUTH_SECRET);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { store } = await load(env);
  const url = new URL(request.url);

  // ?latest=1 collapses each person to their most recent entry.
  if (url.searchParams.get('latest')) {
    const byPerson: Record<string, Entry> = {};
    for (const e of store.entries) {
      const cur = byPerson[e.who];
      if (!cur || e.updatedAt > cur.updatedAt) byPerson[e.who] = e;
    }
    return Response.json(byPerson, { headers: { 'cache-control': 'no-store' } });
  }

  return Response.json(store, { headers: { 'cache-control': 'no-store' } });
};
