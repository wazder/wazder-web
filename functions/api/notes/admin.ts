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

async function loadNotes(env: Env, c: 'public' | 'private'): Promise<Note[]> {
  const obj = await env.CONTENT.get(`_data/notes/${c}.json`);
  if (!obj) return [];
  try {
    return JSON.parse(await obj.text());
  } catch {
    return [];
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const session = await requireAuth(request, env.AUTH_SECRET);
  if (!session) return new Response('Unauthorized', { status: 401 });

  const [pub, priv] = await Promise.all([loadNotes(env, 'public'), loadNotes(env, 'private')]);
  return Response.json(
    { public: pub, private: priv },
    { headers: { 'cache-control': 'no-store' } },
  );
};
