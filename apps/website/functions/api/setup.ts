interface Env {
  SETUPS: KVNamespace;
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
  };

  try {
    const body = (await context.request.json()) as Record<string, unknown>;
    const name = ((body.name as string) ?? "").trim();
    const role = ((body.role as string) ?? "").trim();

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
      location: ((body.location as string) ?? "").trim(),
      goals: Array.isArray(body.goals) ? body.goals : [],
      goalFreeText: ((body.goalFreeText as string) ?? "").trim(),
      challenge: ((body.challenge as string) ?? "").trim(),
      challengeFreeText: ((body.challengeFreeText as string) ?? "").trim(),
      selectedPacks: Array.isArray(body.selectedPacks)
        ? body.selectedPacks
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

export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};
