import { generateRegistrationOptions } from '@simplewebauthn/server';
import { buildChallengeCookie, requireAuth } from '../../../_lib/auth';
import { loadCredentials } from '../../../_lib/passkey-store';

interface Env {
  CONTENT: R2Bucket;
  AUTH_SECRET: string;
}

const RP_ID = 'wazder.com';
const RP_NAME = 'wazder';

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const creds = await loadCredentials(env.CONTENT);

  if (creds.length > 0) {
    const session = await requireAuth(request, env.AUTH_SECRET);
    if (!session) {
      return Response.json({ error: 'Login required to add another passkey' }, { status: 401 });
    }
  }

  const options = await generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: RP_ID,
    userID: new TextEncoder().encode('owner'),
    userName: 'owner',
    userDisplayName: 'wazder',
    attestationType: 'none',
    excludeCredentials: creds.map((c) => ({
      id: c.id,
      transports: c.transports as AuthenticatorTransportFuture[] | undefined,
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
    },
  });

  const cookie = await buildChallengeCookie(env.AUTH_SECRET, options.challenge);
  return new Response(JSON.stringify(options), {
    headers: {
      'content-type': 'application/json',
      'set-cookie': cookie,
    },
  });
};

type AuthenticatorTransportFuture = 'usb' | 'nfc' | 'ble' | 'internal' | 'hybrid' | 'smart-card';
