import { verifyAuthenticationResponse } from '@simplewebauthn/server';
import {
  buildAuthCookie,
  clearChallengeCookie,
  readChallenge,
  signCookie,
} from '../../../_lib/auth';
import { base64urlToBytes, loadCredentials, saveCredentials } from '../../../_lib/passkey-store';

interface Env {
  CONTENT: R2Bucket;
  AUTH_SECRET: string;
}

const RP_ID = 'wazder.com';
const EXPECTED_ORIGIN = ['https://wazder.com'];

export const onRequestPost: PagesFunction<Env> = async ({ env, request }) => {
  const challenge = await readChallenge(env.AUTH_SECRET, request);
  if (!challenge) return Response.json({ error: 'Missing challenge' }, { status: 400 });

  let body: any;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const creds = await loadCredentials(env.CONTENT);
  const cred = creds.find((c) => c.id === body.id);
  if (!cred) return Response.json({ error: 'Credential not found' }, { status: 404 });

  let verification;
  try {
    verification = await verifyAuthenticationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: EXPECTED_ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: false,
      credential: {
        id: cred.id,
        publicKey: base64urlToBytes(cred.publicKey),
        counter: cred.counter,
        transports: cred.transports as any,
      },
    });
  } catch (e) {
    return Response.json({ error: 'Verification error', detail: String(e) }, { status: 400 });
  }

  if (!verification.verified) {
    return Response.json({ error: 'Not verified' }, { status: 401 });
  }

  cred.counter = verification.authenticationInfo.newCounter;
  await saveCredentials(env.CONTENT, creds);

  const authCookie = buildAuthCookie(await signCookie(env.AUTH_SECRET));
  const headers = new Headers({ 'content-type': 'application/json' });
  headers.append('set-cookie', authCookie);
  headers.append('set-cookie', clearChallengeCookie());
  return new Response(JSON.stringify({ ok: true }), { status: 200, headers });
};
