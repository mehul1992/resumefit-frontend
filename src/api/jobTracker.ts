import type { JobStage, TailoringJobStatus } from "./resumeTailoring";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api/v1";

export type { JobStage };

export interface TrackedJob {
  id: number;
  role: string;
  company: string;
  stage: JobStage;
  note: string | null;
  tailoring_job_id: number | null;
  // From the linked tailoring run (null for jobs added by hand).
  cv_status: TailoringJobStatus | null;
  match_score: number | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface TrackedJobCreate {
  role?: string;
  company?: string;
  note?: string;
  tailoring_job_id?: number;
}

export interface TrackedJobUpdate {
  stage?: JobStage;
  note?: string | null;
}

export type TrackerStep = "list" | "create" | "update";

export type TrackerErrorKind =
  | "unauthorized" // 401 — token missing/invalid/expired
  | "not_found" // 404 — job doesn't exist / isn't owned by this user
  | "validation" // 422 — bad request body
  | "server_error" // 5xx or anything else unexpected
  | "network_error"; // fetch itself threw (offline, DNS, CORS, etc.)

export class TrackerError extends Error {
  readonly kind: TrackerErrorKind;
  readonly step: TrackerStep;

  constructor(kind: TrackerErrorKind, step: TrackerStep, message: string) {
    super(message);
    this.name = "TrackerError";
    this.kind = kind;
    this.step = step;
  }
}

async function apiRequest<T>(
  path: string,
  step: TrackerStep,
  token: string,
  options: RequestInit = {}
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...options.headers,
      },
    });
  } catch {
    throw new TrackerError(
      "network_error",
      step,
      "Network error — please check your connection and try again."
    );
  }

  if (res.ok) {
    return (await res.json()) as T;
  }

  const data: { detail?: unknown } | null = await res.json().catch(() => null);
  const detail = data?.detail;
  const message = typeof detail === "string" ? detail : null;
  if (res.status === 401) {
    throw new TrackerError("unauthorized", step, "Your session has expired. Please sign in again.");
  }
  if (res.status === 404) {
    throw new TrackerError("not_found", step, message ?? "This job could not be found.");
  }
  if (res.status === 422) {
    const fieldErrors = Array.isArray(detail)
      ? (detail as { msg: string }[]).map((e) => e.msg).join(", ")
      : null;
    throw new TrackerError(
      "validation",
      step,
      fieldErrors ?? message ?? "Please check your input and try again."
    );
  }
  throw new TrackerError("server_error", step, message ?? "Something went wrong. Please try again.");
}

function listJobs(token: string): Promise<TrackedJob[]> {
  return apiRequest<TrackedJob[]>("/jobs/", "list", token, { method: "GET" });
}

// Tracking a tailoring run twice returns the existing entry.
function createJob(input: TrackedJobCreate, token: string): Promise<TrackedJob> {
  return apiRequest<TrackedJob>("/jobs/", "create", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

function updateJob(id: number, input: TrackedJobUpdate, token: string): Promise<TrackedJob> {
  return apiRequest<TrackedJob>(`/jobs/${id}`, "update", token, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export const jobTrackerApi = { listJobs, createJob, updateJob };
