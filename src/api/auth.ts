const BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api/v1";

export interface SignupPayload {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface UserResponse {
  id: number;
  first_name: string;
  last_name: string;
  email: string;
  age: number | null;
  mobile_number: string | null;
  designation: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface LoginResponse {
  access_token: string;
  token_type: string;
  user: UserResponse;
}

async function request<T>(path: string, options: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });

  const data = await res.json();

  if (!res.ok) {
    // FastAPI validation errors come as { detail: [...] } or { detail: "string" }
    const detail = data?.detail;
    if (Array.isArray(detail)) {
      throw new Error(detail.map((e: { msg: string }) => e.msg).join(", "));
    }
    throw new Error(typeof detail === "string" ? detail : "Something went wrong");
  }

  return data as T;
}

export const authApi = {
  signup: (payload: SignupPayload) =>
    request<UserResponse>("/auth/signup", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  login: (payload: LoginPayload) =>
    request<LoginResponse>("/auth/login", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // Best-effort server logout. JWT is stateless, so we never block the
  // client-side sign-out on this call — failures are swallowed.
  logout: async (token: string | null): Promise<void> => {
    try {
      await fetch(`${BASE_URL}/auth/logout`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
    } catch {
      // ignore — the client will clear local auth regardless
    }
  },
};
