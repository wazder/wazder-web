import { requireAuth } from '../../_lib/auth';

interface Env {
  AUTH_SECRET: string;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.AUTH_SECRET) return Response.json({ authed: false });
  const payload = await requireAuth(request, env.AUTH_SECRET);
  return Response.json({ authed: !!payload, exp: payload?.exp ?? null });
};
