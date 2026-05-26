import { verifyRegistrationResponse } from '@simplewebauthn/server';
import {
  buildAuthCookie,
  clearChallengeCookie,
  readChallenge,
  signCookie,
} from '../../../_lib/auth';
import { addCredential, bytesToBase64url } from '../../../_lib/passkey-store';

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

  let verification;
  try {
    verification = await verifyRegistrationResponse({
      response: body,
      expectedChallenge: challenge,
      expectedOrigin: EXPECTED_ORIGIN,
      expectedRPID: RP_ID,
      requireUserVerification: false,
    });
  } catch (e) {
    return Response.json({ error: 'Verification error', detail: String(e) }, { status: 400 });
  }

  if (!verification.verified || !verification.registrationInfo) {
    return Response.json({ error: 'Not verified' }, { status: 400 });
  }

  const info = verification.registrationInfo;
  await addCredential(env.CONTENT, {
    id: info.credential.id,
    publicKey: bytesToBase64url(info.credential.publicKey),
    counter: info.credential.counter,
    transports: body.response?.transports,
    addedAt: Date.now(),
  });

  const authCookie = buildAuthCookie(await signCookie(env.AUTH_SECRET));
  const headers = new Headers({ 'content-type': 'application/json' });
  headers.append('set-cookie', authCookie);
  headers.append('set-cookie', clearChallengeCookie());
  return new Response(JSON.stringify({ ok: true }), { status: 201, headers });
};
