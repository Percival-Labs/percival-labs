interface Env {
  WAITLIST: KVNamespace;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const body = (await context.request.json()) as { email?: string };
    const email = (body.email ?? "").trim().toLowerCase();

    if (!email || !EMAIL_REGEX.test(email)) {
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

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};
