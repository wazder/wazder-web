import { loadCredentials } from '../../../_lib/passkey-store';

interface Env {
  CONTENT: R2Bucket;
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const creds = await loadCredentials(env.CONTENT);
  return Response.json({ hasCredentials: creds.length > 0, count: creds.length });
};
