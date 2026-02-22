interface Env {
  SETUPS: KVNamespace;
}

const ALLOWED_ORIGINS = [
  'https://percivallabs.com',
  'https://www.percivallabs.com',
  'http://localhost:3400',
];

function getCorsOrigin(request: Request): string {
  const origin = request.headers.get('Origin') || '';
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": getCorsOrigin(context.request),
  };

  // Rate limiting: 10 requests per hour per IP
  const ip = context.request.headers.get('CF-Connecting-IP') || 'unknown';
  const rateLimitKey = `ratelimit:${ip}:${Date.now() / 3600000 | 0}`;
  const current = parseInt(await context.env.SETUPS.get(rateLimitKey) || '0');
  if (current >= 10) {
    return new Response(
      JSON.stringify({ success: false, message: 'Too many requests. Please try again later.' }),
      { status: 429, headers: { ...headers, 'Retry-After': '3600' } }
    );
  }
  await context.env.SETUPS.put(rateLimitKey, String(current + 1), { expirationTtl: 3600 });

  // Request body size limit
  const contentLength = parseInt(context.request.headers.get('Content-Length') || '0');
  if (contentLength > 10240) {
    return new Response(
      JSON.stringify({ success: false, message: 'Request too large.' }),
      { status: 413, headers }
    );
  }

  try {
    const body = (await context.request.json()) as Record<string, unknown>;
    const name = ((body.name as string) ?? "").trim().slice(0, 100);
    const role = ((body.role as string) ?? "").trim().slice(0, 100);

    if (!name) {
      return new Response(
        JSON.stringify({ success: false, message: "Name is required." }),
        { status: 400, headers }
      );
    }

    if (!role) {
      return new Response(
        JSON.stringify({ success: false, message: "Role is required." }),
        { status: 400, headers }
      );
    }

    const harnessId = crypto.randomUUID();

    const entry = {
      harnessId,
      name,
      role,
      location: ((body.location as string) ?? "").trim().slice(0, 200),
      goals: Array.isArray(body.goals)
        ? body.goals.filter((g: unknown) => typeof g === 'string' && g.length <= 200).slice(0, 20)
        : [],
      goalFreeText: ((body.goalFreeText as string) ?? "").trim().slice(0, 1000),
      challenge: ((body.challenge as string) ?? "").trim().slice(0, 200),
      challengeFreeText: ((body.challengeFreeText as string) ?? "").trim().slice(0, 1000),
      selectedPacks: Array.isArray(body.selectedPacks)
        ? body.selectedPacks.filter((p: unknown) => typeof p === 'string' && p.length <= 100).slice(0, 10)
        : [],
      createdAt: new Date().toISOString(),
    };

    await context.env.SETUPS.put(harnessId, JSON.stringify(entry));

    return new Response(
      JSON.stringify({ success: true, harnessId }),
      { status: 200, headers }
    );
  } catch {
    return new Response(
      JSON.stringify({
        success: false,
        message: "Something went wrong. Please try again.",
      }),
      { status: 500, headers }
    );
  }
};

export const onRequestOptions: PagesFunction = async (context) => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": getCorsOrigin(context.request),
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};
