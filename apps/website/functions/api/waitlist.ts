interface Env {
  WAITLIST: KVNamespace;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const current = parseInt(await context.env.WAITLIST.get(rateLimitKey) || '0');
  if (current >= 10) {
    return new Response(
      JSON.stringify({ success: false, message: 'Too many requests. Please try again later.' }),
      { status: 429, headers: { ...headers, 'Retry-After': '3600' } }
    );
  }
  await context.env.WAITLIST.put(rateLimitKey, String(current + 1), { expirationTtl: 3600 });

  // Request body size limit
  const contentLength = parseInt(context.request.headers.get('Content-Length') || '0');
  if (contentLength > 10240) {
    return new Response(
      JSON.stringify({ success: false, message: 'Request too large.' }),
      { status: 413, headers }
    );
  }

  try {
    const body = (await context.request.json()) as { email?: string };
    const email = (body.email ?? "").trim().toLowerCase();

    if (!email || email.length > 254 || !EMAIL_REGEX.test(email)) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "Please provide a valid email address.",
        }),
        { status: 400, headers }
      );
    }

    const existing = await context.env.WAITLIST.get(email);
    if (existing) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "This email is already on the waitlist.",
        }),
        { status: 409, headers }
      );
    }

    await context.env.WAITLIST.put(email, new Date().toISOString());

    return new Response(
      JSON.stringify({ success: true, message: "You're on the list!" }),
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
