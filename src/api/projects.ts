const BASE_URL = import.meta.env.VITE_API_URL ?? "http://127.0.0.1:8000/api/v1";

export type ProjectSource = "manual" | "resume_import" | "csv";
export type ProjectSort = "recent" | "az";

export interface Project {
  id: number;
  description: string;
  tech: string[];
  source: ProjectSource;
  created_at: string;
  updated_at: string;
}

export interface ProjectInput {
  description: string;
  tech: string[];
}

export interface ExtractedProjectCandidate {
  description: string;
  tech: string[];
}

export interface ExtractResumeResponse {
  candidates: ExtractedProjectCandidate[];
}

export interface ProjectsListParams {
  search?: string;
  tech?: string;
  sort?: ProjectSort;
}

// Which call surfaced the error, so the UI can decide what to show/retry.
export type ProjectsStep =
  | "list"
  | "create"
  | "update"
  | "delete"
  | "bulk_create"
  | "extract_resume";

export type ProjectsErrorKind =
  | "unauthorized" // 401 — token missing/invalid/expired
  | "forbidden" // 403 — account inactive
  | "not_found" // 404 — project doesn't exist / isn't owned by this user
  | "validation" // 422 — bad request body
  | "server_error" // 5xx or anything else unexpected
  | "network_error"; // fetch itself threw (offline, DNS, CORS, etc.)

export class ProjectsError extends Error {
  readonly kind: ProjectsErrorKind;
  readonly step: ProjectsStep;
  readonly fieldErrors?: string[];

  constructor(
    kind: ProjectsErrorKind,
    step: ProjectsStep,
    message: string,
    fieldErrors?: string[]
  ) {
    super(message);
    this.name = "ProjectsError";
    this.kind = kind;
    this.step = step;
    this.fieldErrors = fieldErrors;
  }
}

function mapErrorResponse(
  status: number,
  detail: unknown,
  step: ProjectsStep
): ProjectsError {
  if (status === 401) {
    return new ProjectsError(
      "unauthorized",
      step,
      "Your session has expired. Please sign in again."
    );
  }
  if (status === 403) {
    return new ProjectsError(
      "forbidden",
      step,
      typeof detail === "string" ? detail : "Your account can't perform this action right now."
    );
  }
  if (status === 404) {
    return new ProjectsError(
      "not_found",
      step,
      typeof detail === "string" ? detail : "Project not found."
    );
  }
  if (status === 422) {
    const fieldErrors = Array.isArray(detail)
      ? (detail as { msg: string }[]).map((e) => e.msg)
      : undefined;
    return new ProjectsError(
      "validation",
      step,
      fieldErrors?.join(", ") ?? "Please check your input and try again.",
      fieldErrors
    );
  }
  return new ProjectsError(
    "server_error",
    step,
    typeof detail === "string" ? detail : "Something went wrong. Please try again."
  );
}

async function apiRequest<T>(
  path: string,
  step: ProjectsStep,
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
    throw new ProjectsError(
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

// The extract-resume endpoint takes multipart form data, not JSON — no
// Content-Type header here so the browser sets the multipart boundary itself.
async function apiRequestMultipart<T>(
  path: string,
  step: ProjectsStep,
  token: string,
  formData: FormData
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
  } catch {
    throw new ProjectsError(
      "network_error",
      step,
      "Network error — please check your connection and try again."
    );
  }

  if (res.ok) {
    return (await res.json()) as T;
  }

  const data: { detail?: unknown } | null = await res.json().catch(() => null);
  throw mapErrorResponse(res.status, data?.detail, step);
}

function listProjects(token: string, params: ProjectsListParams = {}): Promise<Project[]> {
  const query = new URLSearchParams();
  if (params.search) query.set("search", params.search);
  if (params.tech) query.set("tech", params.tech);
  if (params.sort) query.set("sort", params.sort);
  const qs = query.toString();
  return apiRequest<Project[]>(`/projects/${qs ? `?${qs}` : ""}`, "list", token, {
    method: "GET",
  });
}

function createProject(input: ProjectInput, token: string): Promise<Project> {
  return apiRequest<Project>("/projects/", "create", token, {
    method: "POST",
    body: JSON.stringify(input),
  });
}

function updateProject(id: number, input: ProjectInput, token: string): Promise<Project> {
  return apiRequest<Project>(`/projects/${id}`, "update", token, {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

function deleteProject(id: number, token: string): Promise<void> {
  return apiRequest<void>(`/projects/${id}`, "delete", token, { method: "DELETE" });
}

function bulkCreateProjects(
  projects: ProjectInput[],
  source: ProjectSource,
  token: string
): Promise<Project[]> {
  return apiRequest<Project[]>("/projects/bulk", "bulk_create", token, {
    method: "POST",
    body: JSON.stringify({ projects, source }),
  });
}

function extractResume(file: File, token: string): Promise<ExtractResumeResponse> {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequestMultipart<ExtractResumeResponse>(
    "/projects/extract-resume",
    "extract_resume",
    token,
    formData
  );
}

export const projectsApi = {
  listProjects,
  createProject,
  updateProject,
  deleteProject,
  bulkCreateProjects,
  extractResume,
};
