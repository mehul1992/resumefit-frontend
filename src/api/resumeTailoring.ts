const BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api/v1";

export type TailoringJobStatus = "pending" | "processing" | "completed" | "failed";

export interface TailoringJob {
  id: number;
  status: TailoringJobStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

interface UploadUrlResponse {
  upload_url: string;
  object_key: string;
}

export type JobStage = "saved" | "applied" | "interview" | "offer" | "rejected";

export interface TrackerLink {
  id: number;
  stage: JobStage;
}

// The list endpoint returns everything create-job does, plus presigned
// download links (tailored_resume_download_url is null until completed).
// role/company/match_score are null for runs that predate the analysis.
export interface TailoringJobListItem extends TailoringJob {
  role: string | null;
  company: string | null;
  match_score: number | null;
  original_resume_download_url: string;
  tailored_resume_download_url: string | null;
  tracked_job: TrackerLink | null;
}

export type Coverage = "covered" | "partial" | "missing";

export interface DiffSegment {
  text: string;
  kind: "same" | "removed" | "added";
}

export interface TailoringChange {
  id: string;
  section: string;
  source_label: string;
  source_project_id: number | null;
  original_segments: DiffSegment[];
  tailored_segments: DiffSegment[];
  reverted: boolean;
}

export interface RequirementCoverage {
  requirement: string;
  importance: "must" | "nice_to_have";
  status: Coverage;
  evidence: string;
  action: "add_project" | "add_metric" | "none";
}

export interface KeywordCoverage {
  label: string;
  coverage: Coverage;
}

export interface TailoringResult extends TailoringJob {
  role: string | null;
  company: string | null;
  job_description: string;
  original_resume_download_url: string;
  tailored_resume_download_url: string | null;
  // False while a revert/re-apply re-render is in flight.
  pdf_up_to_date: boolean;
  has_analysis: boolean;
  match_before: number | null;
  match_after: number | null;
  changes: TailoringChange[];
  requirements: RequirementCoverage[];
  keywords: KeywordCoverage[];
  tracked_job: TrackerLink | null;
}

// Which step the error surfaced in, so the UI can decide what to restart
// (e.g. an expired presigned URL means "go back to step 1", not "retry step 2").
export type TailoringStep =
  | "upload_url"
  | "upload"
  | "create_job"
  | "list_jobs"
  | "get_result"
  | "set_change"
  | "retry";

export type TailoringErrorKind =
  | "unauthorized" // 401 — token missing/invalid/expired
  | "forbidden" // 403 — account inactive / missing auth
  | "validation" // 422 — bad request body (create_job only)
  | "not_found" // 404 — run (or change) doesn't exist / isn't owned by this user
  | "upload_failed" // the presigned S3 PUT failed (expired URL, content-type mismatch, network)
  | "server_error" // 5xx or anything else unexpected
  | "network_error"; // fetch itself threw (offline, DNS, CORS, etc.)

export class TailoringError extends Error {
  readonly kind: TailoringErrorKind;
  readonly step: TailoringStep;
  readonly fieldErrors?: string[];

  constructor(
    kind: TailoringErrorKind,
    step: TailoringStep,
    message: string,
    fieldErrors?: string[]
  ) {
    super(message);
    this.name = "TailoringError";
    this.kind = kind;
    this.step = step;
    this.fieldErrors = fieldErrors;
  }
}

async function apiRequest<T>(
  path: string,
  step: TailoringStep,
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
    throw new TailoringError(
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

  if (res.status === 401) {
    throw new TailoringError(
      "unauthorized",
      step,
      "Your session has expired. Please sign in again."
    );
  }
  if (res.status === 403) {
    throw new TailoringError(
      "forbidden",
      step,
      typeof detail === "string" ? detail : "Your account can't perform this action right now."
    );
  }
  if (res.status === 404) {
    throw new TailoringError(
      "not_found",
      step,
      typeof detail === "string" ? detail : "This resume could not be found."
    );
  }
  if (res.status === 422) {
    const fieldErrors = Array.isArray(detail)
      ? (detail as { msg: string }[]).map((e) => e.msg)
      : undefined;
    throw new TailoringError(
      "validation",
      step,
      fieldErrors?.join(", ") ?? "Please check your input and try again.",
      fieldErrors
    );
  }

  throw new TailoringError(
    "server_error",
    step,
    typeof detail === "string" ? detail : "Something went wrong. Please try again."
  );
}

function getUploadUrl(token: string, contentType: string): Promise<UploadUrlResponse> {
  return apiRequest<UploadUrlResponse>("/resume-tailoring/upload-url", "upload_url", token, {
    method: "POST",
    body: JSON.stringify({ content_type: contentType }),
  });
}

// Uploads directly to storage — the presigned URL is the credential, so no
// Authorization header is sent, and this never touches our API host.
async function uploadToS3(uploadUrl: string, file: File, contentType: string): Promise<void> {
  let res: Response;
  try {
    res = await fetch(uploadUrl, {
      method: "PUT",
      headers: { "Content-Type": contentType },
      body: file,
    });
  } catch {
    throw new TailoringError(
      "upload_failed",
      "upload",
      "The upload failed. Please try again."
    );
  }

  if (!res.ok) {
    throw new TailoringError(
      "upload_failed",
      "upload",
      "The upload link expired or was rejected. Please try again."
    );
  }
}

function createJob(
  objectKey: string,
  jobDescription: string,
  token: string
): Promise<TailoringJob> {
  return apiRequest<TailoringJob>("/resume-tailoring/", "create_job", token, {
    method: "POST",
    body: JSON.stringify({ object_key: objectKey, job_description: jobDescription }),
  });
}

function listJobs(token: string): Promise<TailoringJobListItem[]> {
  return apiRequest<TailoringJobListItem[]>("/resume-tailoring/", "list_jobs", token, {
    method: "GET",
  });
}

function getResult(jobId: number, token: string): Promise<TailoringResult> {
  return apiRequest<TailoringResult>(`/resume-tailoring/${jobId}/result`, "get_result", token, {
    method: "GET",
  });
}

function setChangeReverted(
  jobId: number,
  changeId: string,
  reverted: boolean,
  token: string
): Promise<TailoringResult> {
  return apiRequest<TailoringResult>(
    `/resume-tailoring/${jobId}/changes/${encodeURIComponent(changeId)}`,
    "set_change",
    token,
    { method: "PATCH", body: JSON.stringify({ reverted }) }
  );
}

// Re-submits a failed run with the same CV and job description.
function retryJob(jobId: number, token: string): Promise<TailoringJob> {
  return apiRequest<TailoringJob>(`/resume-tailoring/${jobId}/retry`, "retry", token, {
    method: "POST",
  });
}

export const resumeTailoringApi = {
  getUploadUrl,
  uploadToS3,
  createJob,
  listJobs,
  getResult,
  setChangeReverted,
  retryJob,
};

// Runs all three steps back to back. Callers that need per-step loading state
// (e.g. "uploading…" vs "creating job…") can call the three functions above
// directly instead — this is the simple end-to-end path.
export async function createTailoringJob(
  file: File,
  jobDescription: string,
  token: string
): Promise<TailoringJob> {
  const contentType = file.type || "application/pdf";
  const { upload_url, object_key } = await getUploadUrl(token, contentType);
  await uploadToS3(upload_url, file, contentType);
  return createJob(object_key, jobDescription, token);
}
