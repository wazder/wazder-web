import { generateAuthenticationOptions } from '@simplewebauthn/server';
import { buildChallengeCookie } from '../../../_lib/auth';
import { loadCredentials } from '../../../_lib/passkey-store';

interface Env {
  CONTENT: R2Bucket;
  AUTH_SECRET: string;
}

const RP_ID = 'wazder.com';

export const onRequestPost: PagesFunction<Env> = async ({ env }) => {
  const creds = await loadCredentials(env.CONTENT);
  if (creds.length === 0) {
    return Response.json({ error: 'No passkeys registered' }, { status: 404 });
  }

  const options = await generateAuthenticationOptions({
    rpID: RP_ID,
    allowCredentials: creds.map((c) => ({
      id: c.id,
      transports: c.transports as any,
    })),
    userVerification: 'preferred',
  });

  const cookie = await buildChallengeCookie(env.AUTH_SECRET, options.challenge);
  return new Response(JSON.stringify(options), {
    headers: {
      'content-type': 'application/json',
      'set-cookie': cookie,
    },
  });
};
