import { afterEach, describe, expect, it, vi } from "vitest";
import { createTailoringJob, resumeTailoringApi, TailoringError } from "./resumeTailoring";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const file = new File(["%PDF-1.4 fake"], "resume.pdf", { type: "application/pdf" });
const uploadUrlBody = { upload_url: "https://s3.example.com/bucket/key?sig=abc", object_key: "key-123" };

describe("createTailoringJob", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("runs all three steps and returns the created job on success", async () => {
    const job = { id: 1, status: "pending", error_message: null, created_at: "t", updated_at: "t" };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, uploadUrlBody)) // step 1
      .mockResolvedValueOnce(new Response(null, { status: 200 })) // step 2 (S3 PUT)
      .mockResolvedValueOnce(jsonResponse(201, job)); // step 3
    vi.stubGlobal("fetch", fetchMock);

    const result = await createTailoringJob(file, "a job description", "token-abc");

    expect(result).toEqual(job);
    expect(fetchMock).toHaveBeenCalledTimes(3);

    // Step 1: authenticated JSON request to our API.
    const [step1Url, step1Opts] = fetchMock.mock.calls[0];
    expect(step1Url).toContain("/resume-tailoring/upload-url");
    expect((step1Opts.headers as Record<string, string>).Authorization).toBe("Bearer token-abc");

    // Step 2: raw PUT straight to the presigned URL, no auth header.
    const [step2Url, step2Opts] = fetchMock.mock.calls[1];
    expect(step2Url).toBe(uploadUrlBody.upload_url);
    expect(step2Opts.method).toBe("PUT");
    expect(step2Opts.headers).toEqual({ "Content-Type": "application/pdf" });
    expect(step2Opts.body).toBe(file);

    // Step 3: object_key from step 1 flows into the create-job payload.
    const [step3Url, step3Opts] = fetchMock.mock.calls[2];
    expect(step3Url).toContain("/resume-tailoring/");
    expect(JSON.parse(step3Opts.body as string)).toEqual({
      object_key: "key-123",
      job_description: "a job description",
    });
  });

  it("maps a 401 on any step to an unauthorized TailoringError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(401, { detail: "Not authenticated" }))
    );

    await expect(createTailoringJob(file, "jd", "bad-token")).rejects.toMatchObject({
      kind: "unauthorized",
      step: "upload_url",
    } satisfies Partial<TailoringError>);
  });

  it("maps a 422 on create-job to a validation error with field messages", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, uploadUrlBody))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(
        jsonResponse(422, { detail: [{ msg: "job_description must not be empty" }] })
      );
    vi.stubGlobal("fetch", fetchMock);

    const error = await createTailoringJob(file, "jd", "token-abc").catch((e) => e);

    expect(error).toBeInstanceOf(TailoringError);
    expect(error.kind).toBe("validation");
    expect(error.step).toBe("create_job");
    expect(error.fieldErrors).toEqual(["job_description must not be empty"]);
  });

  it("treats a failed S3 PUT as upload_failed without calling create-job", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse(200, uploadUrlBody))
      .mockResolvedValueOnce(new Response(null, { status: 403 })); // expired presigned URL
    vi.stubGlobal("fetch", fetchMock);

    const error = await createTailoringJob(file, "jd", "token-abc").catch((e) => e);

    expect(error).toBeInstanceOf(TailoringError);
    expect(error.kind).toBe("upload_failed");
    expect(error.step).toBe("upload");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("maps a 5xx to a server_error", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(500, { detail: "boom" })));

    const error = await createTailoringJob(file, "jd", "token-abc").catch((e) => e);

    expect(error).toBeInstanceOf(TailoringError);
    expect(error.kind).toBe("server_error");
    expect(error.message).toBe("boom");
  });
});

describe("resumeTailoringApi.listJobs", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends an authenticated GET and returns the jobs as-is", async () => {
    const jobs = [
      {
        id: 2,
        status: "completed",
        error_message: null,
        created_at: "2026-07-02T10:00:00Z",
        updated_at: "2026-07-02T10:00:05Z",
        original_resume_download_url: "https://s3.example.com/original",
        tailored_resume_download_url: "https://s3.example.com/tailored",
      },
      {
        id: 1,
        status: "failed",
        error_message: "Could not parse resume",
        created_at: "2026-07-01T09:00:00Z",
        updated_at: "2026-07-01T09:00:05Z",
        original_resume_download_url: "https://s3.example.com/original-1",
        tailored_resume_download_url: null,
      },
    ];
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, jobs));
    vi.stubGlobal("fetch", fetchMock);

    const result = await resumeTailoringApi.listJobs("token-abc");

    expect(result).toEqual(jobs);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain("/resume-tailoring/");
    expect(opts.method).toBe("GET");
    expect((opts.headers as Record<string, string>).Authorization).toBe("Bearer token-abc");
  });

  it("maps a 403 to a forbidden TailoringError with the backend's message", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(403, { detail: "Account is inactive" }))
    );

    const error = await resumeTailoringApi.listJobs("token-abc").catch((e) => e);

    expect(error).toBeInstanceOf(TailoringError);
    expect(error.kind).toBe("forbidden");
    expect(error.step).toBe("list_jobs");
    expect(error.message).toBe("Account is inactive");
  });

  it("maps a 401 to an unauthorized TailoringError", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(401, { detail: "Not authenticated" })));

    const error = await resumeTailoringApi.listJobs("bad-token").catch((e) => e);

    expect(error).toBeInstanceOf(TailoringError);
    expect(error.kind).toBe("unauthorized");
    expect(error.step).toBe("list_jobs");
  });
});
