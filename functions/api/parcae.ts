import { requireAuth } from '../_lib/auth';

interface Env {
  CONTENT: R2Bucket;
  AUTH_SECRET: string;
}

interface Entry {
  id: string;
  /** Kişinin yazdığı ad, olduğu gibi. */
  who: string;
  /** Eşleştirme anahtarı: "Nihat" ile "nihat" aynı kişi sayılsın diye. */
  whoKey: string;
  answers: Record<string, { v?: unknown; n?: string }>;
  submitted: boolean;
  createdAt: number;
  updatedAt: number;
}

interface Store {
  entries: Entry[];
}

const KEY = '_data/parcae/responses.json';
const MAX_NAME = 60;
const MAX_BODY = 256 * 1024;
const MAX_ENTRIES = 200;
const PUT_RETRIES = 4;

function emptyStore(): Store {
  return { entries: [] };
}

/** Sayfadaki eşinin birebir aynısı olmalı, yoksa taslak geri yüklenmez.
 *  toLowerCase() Türkçe İ/I'da ortama göre değişebildiği için elle eşliyoruz. */
function nameKey(raw: string): string {
  return raw
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/\u0130/g, 'i')
    .replace(/I/g, '\u0131')
    .toLowerCase()
    .slice(0, MAX_NAME);
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

  const who = String(payload.who ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .trim()
    .slice(0, MAX_NAME);
  if (!who) {
    return Response.json({ error: 'Name required' }, { status: 400 });
  }
  const whoKey = nameKey(who);
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
      existing.whoKey = whoKey;
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
        whoKey,
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
  const url = new URL(request.url);

  // Taslak geri yükleme: kişi tarayıcısını temizlemiş veya başka cihaza geçmişse
  // kendi son kaydını geri alabilsin. Yetki istemiyor -- formu dolduran zaten
  // adını seçerek yazabiliyor, dolayısıyla bu yeni bir kapı açmıyor.
  const whoParam = url.searchParams.get('who');
  if (whoParam) {
    const key = nameKey(whoParam);
    if (!key) return Response.json({ error: 'Name required' }, { status: 400 });
    const { store } = await load(env);
    let latest: Entry | null = null;
    for (const e of store.entries) {
      const eKey = e.whoKey ?? nameKey(e.who ?? '');
      if (eKey === key && (!latest || e.updatedAt > latest.updatedAt)) latest = e;
    }
    return Response.json(
      latest
        ? {
            id: latest.id,
            answers: latest.answers,
            submitted: latest.submitted,
            updatedAt: latest.updatedAt,
          }
        : null,
      { headers: { 'cache-control': 'no-store' } },
    );
  }

  const session = await requireAuth(request, env.AUTH_SECRET);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const { store } = await load(env);

  // ?latest=1 collapses each person to their most recent entry.
  if (url.searchParams.get('latest')) {
    const byPerson: Record<string, Entry> = {};
    for (const e of store.entries) {
      const k = e.whoKey ?? nameKey(e.who ?? '');
      const cur = byPerson[k];
      if (!cur || e.updatedAt > cur.updatedAt) byPerson[k] = e;
    }
    return Response.json(byPerson, { headers: { 'cache-control': 'no-store' } });
  }

  return Response.json(store, { headers: { 'cache-control': 'no-store' } });
};
