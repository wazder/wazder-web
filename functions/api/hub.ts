import { requireAuth } from '../_lib/auth';

interface Env {
  CONTENT: R2Bucket;
  AUTH_SECRET: string;
}

interface HubItem {
  path: string;
  kind: 'page' | 'content';
  public: boolean;
  static?: boolean;
  authOnly?: boolean;
  group?: number;
  format?: string;
  size?: number;
  uploaded?: number;
}

const STATIC_ROUTES: HubItem[] = [
  { path: 'cv', kind: 'content', public: true, static: true, format: 'pdf', group: 1 },
  { path: 'notes', kind: 'page', public: true, static: true, group: 1 },
  { path: 'upload', kind: 'page', public: true, static: true, group: 1 },
  { path: 'edit', kind: 'page', public: false, static: true, authOnly: true, group: 1 },
  { path: 'flaw', kind: 'page', public: false, static: true, authOnly: true, group: 1 },
  { path: 'py', kind: 'page', public: true, static: true, group: 2 },
  { path: 'ascii', kind: 'page', public: true, static: true, group: 2 },
];

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const session = await requireAuth(request, env.AUTH_SECRET);
  const authed = !!session;

  const staticItems: HubItem[] = STATIC_ROUTES.filter((r) => !r.authOnly || authed);
  const userItems: HubItem[] = [];

  const listed = await env.CONTENT.list({ limit: 1000, include: ['customMetadata'] } as any);
  for (const obj of listed.objects) {
    if (obj.key.startsWith('_')) continue;
    userItems.push({
      path: obj.key,
      kind: 'content',
      public: obj.customMetadata?.public === 'true',
      format: obj.customMetadata?.format,
      size: obj.size,
      uploaded: obj.uploaded.getTime(),
    });
  }

  userItems.sort((a, b) => (b.uploaded ?? 0) - (a.uploaded ?? 0));

  return Response.json(
    { authed, items: [...staticItems, ...userItems] },
    { headers: { 'cache-control': 'no-store' } },
  );
};
