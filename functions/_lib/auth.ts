const COOKIE_NAME = 'wz_auth';
const CHALLENGE_COOKIE_NAME = 'wz_chal';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 90;
const CHALLENGE_MAX_AGE = 5 * 60;

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64urlEncode(bytes: ArrayBuffer | Uint8Array): string {
  const arr = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let s = '';
  for (const b of arr) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}

function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const norm = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(norm);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

async function hmac(secret: string, data: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(data));
  return b64urlEncode(sig);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

export interface AuthPayload {
  exp: number;
  iat: number;
}

export async function signCookie(secret: string, ttlSeconds = COOKIE_MAX_AGE): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload: AuthPayload = { iat: now, exp: now + ttlSeconds };
  const payloadB64 = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const sig = await hmac(secret, payloadB64);
  return `${payloadB64}.${sig}`;
}

export async function verifyCookie(secret: string, value: string | undefined): Promise<AuthPayload | null> {
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expected = await hmac(secret, payloadB64);
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(dec.decode(b64urlDecode(payloadB64))) as AuthPayload;
    if (typeof payload.exp !== 'number') return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function buildAuthCookie(value: string, maxAge = COOKIE_MAX_AGE): string {
  return `${COOKIE_NAME}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearAuthCookie(): string {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

export function readAuthCookie(request: Request): string | undefined {
  const header = request.headers.get('cookie');
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === COOKIE_NAME) return rest.join('=');
  }
  return undefined;
}

export async function requireAuth(request: Request, secret: string): Promise<AuthPayload | null> {
  return verifyCookie(secret, readAuthCookie(request));
}

export async function buildChallengeCookie(secret: string, challenge: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  const payload = { c: challenge, exp: now + CHALLENGE_MAX_AGE };
  const payloadB64 = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const sig = await hmac(secret, payloadB64);
  return `${CHALLENGE_COOKIE_NAME}=${payloadB64}.${sig}; Path=/; Max-Age=${CHALLENGE_MAX_AGE}; HttpOnly; Secure; SameSite=Lax`;
}

export function clearChallengeCookie(): string {
  return `${CHALLENGE_COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax`;
}

export async function readChallenge(secret: string, request: Request): Promise<string | null> {
  const header = request.headers.get('cookie');
  if (!header) return null;
  let value: string | undefined;
  for (const part of header.split(';')) {
    const [k, ...rest] = part.trim().split('=');
    if (k === CHALLENGE_COOKIE_NAME) value = rest.join('=');
  }
  if (!value) return null;
  const parts = value.split('.');
  if (parts.length !== 2) return null;
  const [payloadB64, sig] = parts;
  const expected = await hmac(secret, payloadB64);
  if (!timingSafeEqual(sig, expected)) return null;
  try {
    const payload = JSON.parse(dec.decode(b64urlDecode(payloadB64)));
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload.c;
  } catch {
    return null;
  }
}
