// Client-side auth helpers that call /api/vouch/v1/auth/*
// All requests use credentials: 'include' so HttpOnly cookies are sent automatically.

export interface User {
  id: string;
  email: string;
  display_name: string;
  created_at: string;
}

export interface AuthError {
  message: string;
  code?: string;
}

export interface AuthResult<T> {
  data: T | null;
  error: AuthError | null;
}

async function authFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<AuthResult<T>> {
  try {
    const res = await fetch(`/api/vouch/v1/auth${path}`, {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...options.headers,
      },
      ...options,
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      const message =
        body?.error?.message ?? body?.message ?? "An unexpected error occurred";
      return { data: null, error: { message, code: body?.error?.code } };
    }

    return { data: body as T, error: null };
  } catch {
    return {
      data: null,
      error: { message: "Network error — could not reach the server" },
    };
  }
}

export async function login(
  email: string,
  password: string
): Promise<AuthResult<{ user: User }>> {
  return authFetch<{ user: User }>("/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function register(
  email: string,
  password: string,
  display_name: string
): Promise<AuthResult<{ user: User }>> {
  return authFetch<{ user: User }>("/register", {
    method: "POST",
    body: JSON.stringify({ email, password, display_name }),
  });
}

export async function logout(): Promise<AuthResult<null>> {
  return authFetch<null>("/logout", { method: "POST" });
}

export async function getMe(): Promise<AuthResult<{ user: User }>> {
  return authFetch<{ user: User }>("/me");
}
