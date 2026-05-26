interface Env {
  AI: Ai;
}

const MODEL = '@hf/thebloke/deepseek-coder-6.7b-base-awq';
const MAX_PREFIX = 2000;
const MAX_TOKENS = 48;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: { prefix?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'bad json' }, { status: 400 });
  }
  const prefix = (body.prefix ?? '').slice(-MAX_PREFIX);
  if (!prefix.trim()) return Response.json({ completion: '' });

  try {
    const result = (await env.AI.run(MODEL, {
      prompt: prefix,
      max_tokens: MAX_TOKENS,
      temperature: 0.2,
    })) as { response?: string };
    let completion = result.response ?? '';
    const newlineIdx = completion.indexOf('\n');
    if (newlineIdx >= 0) completion = completion.slice(0, newlineIdx);
    completion = completion.replace(/\s+$/, '');
    return Response.json({ completion });
  } catch (e) {
    return Response.json({ completion: '', error: String(e) }, { status: 502 });
  }
};
