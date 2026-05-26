export interface StoredCredential {
  id: string;
  publicKey: string;
  counter: number;
  transports?: string[];
  addedAt: number;
  label?: string;
}

const KEY = '_data/passkeys.json';

export async function loadCredentials(bucket: R2Bucket): Promise<StoredCredential[]> {
  const obj = await bucket.get(KEY);
  if (!obj) return [];
  try {
    return JSON.parse(await obj.text());
  } catch {
    return [];
  }
}

export async function saveCredentials(bucket: R2Bucket, creds: StoredCredential[]): Promise<void> {
  await bucket.put(KEY, JSON.stringify(creds), {
    httpMetadata: { contentType: 'application/json' },
  });
}

export async function addCredential(bucket: R2Bucket, cred: StoredCredential): Promise<void> {
  const creds = await loadCredentials(bucket);
  creds.push(cred);
  await saveCredentials(bucket, creds);
}

export function base64urlToBytes(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4));
  const norm = (s + pad).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(norm);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function bytesToBase64url(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');
}
