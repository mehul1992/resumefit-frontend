import type { UserResponse } from "./auth";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api/v1";

export interface ProfileInput {
  first_name: string;
  last_name: string;
  email: string;
  mobile_number: string | null;
  location: string | null;
  linkedin_url: string | null;
  designation: string | null;
}

export interface PasswordChangeInput {
  // Omitted when a Google-only account sets its first password.
  current_password?: string;
  new_password: string;
}

export type UsersStep = "get_me" | "update_me" | "upload_avatar" | "change_password" | "delete_me";

export type UsersErrorKind =
  | "unauthorized" // 401 — token missing/invalid/expired
  | "forbidden" // 403 — account inactive
  | "bad_request" // 400 — e.g. wrong current password
  | "conflict" // 409 — email already registered
  | "validation" // 422 — bad request body
  | "server_error" // 5xx or anything else unexpected
  | "network_error"; // fetch itself threw (offline, DNS, CORS, etc.)

export class UsersError extends Error {
  readonly kind: UsersErrorKind;
  readonly step: UsersStep;

  constructor(kind: UsersErrorKind, step: UsersStep, message: string) {
    super(message);
    this.name = "UsersError";
    this.kind = kind;
    this.step = step;
  }
}

function mapErrorResponse(status: number, detail: unknown, step: UsersStep): UsersError {
  const message = typeof detail === "string" ? detail : null;
  if (status === 401) {
    return new UsersError("unauthorized", step, "Your session has expired. Please sign in again.");
  }
  if (status === 403) {
    return new UsersError("forbidden", step, message ?? "Your account can't perform this action right now.");
  }
  if (status === 400) {
    return new UsersError("bad_request", step, message ?? "Please check your input and try again.");
  }
  if (status === 409) {
    return new UsersError("conflict", step, message ?? "That email is already registered.");
  }
  if (status === 422) {
    const fieldErrors = Array.isArray(detail)
      ? (detail as { msg: string }[]).map((e) => e.msg).join(", ")
      : null;
    return new UsersError("validation", step, fieldErrors ?? message ?? "Please check your input and try again.");
  }
  return new UsersError("server_error", step, message ?? "Something went wrong. Please try again.");
}

async function apiRequest<T>(
  path: string,
  step: UsersStep,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  // FormData bodies need the browser to set the multipart boundary itself.
  const isFormData = options.body instanceof FormData;
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  } catch {
    throw new UsersError(
      "network_error",
      step,
      "Network error — please check your connection and try again."
    );
  }

  if (res.status === 204) {
    return undefined as T;
  }

  if (res.ok) {
    return (await res.json()) as T;
  }

  const data: { detail?: unknown } | null = await res.json().catch(() => null);
  throw mapErrorResponse(res.status, data?.detail, step);
}

function getMe(token: string): Promise<UserResponse> {
  return apiRequest<UserResponse>("/users/me", "get_me", token, { method: "GET" });
}

function updateMe(input: ProfileInput, token: string): Promise<UserResponse> {
  return apiRequest<UserResponse>("/users/me", "update_me", token, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

function uploadAvatar(file: File, token: string): Promise<UserResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<UserResponse>("/users/me/avatar", "upload_avatar", token, {
    method: "POST",
    body: formData,
  });
}

function changePassword(input: PasswordChangeInput, token: string): Promise<void> {
  return apiRequest<void>("/users/me/password", "change_password", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

function deleteMe(token: string): Promise<void> {
  return apiRequest<void>("/users/me", "delete_me", token, { method: "DELETE" });
}

export const usersApi = {
  getMe,
  updateMe,
  uploadAvatar,
  changePassword,
  deleteMe,
};
