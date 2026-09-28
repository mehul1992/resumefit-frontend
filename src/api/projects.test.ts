import { afterEach, describe, expect, it, vi } from "vitest";
import { projectsApi, ProjectsError } from "./projects";

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

const project = {
  id: 1,
  description: "Built X",
  tech: ["Python"],
  source: "manual",
  created_at: "t",
  updated_at: "t",
};

describe("projectsApi.listProjects", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends an authenticated GET and returns the projects as-is", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, [project]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await projectsApi.listProjects("token-abc");

    expect(result).toEqual([project]);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain("/projects/");
    expect(opts.method).toBe("GET");
    expect((opts.headers as Record<string, string>).Authorization).toBe("Bearer token-abc");
  });

  it("appends search, tech, and sort as query params", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(200, []));
    vi.stubGlobal("fetch", fetchMock);

    await projectsApi.listProjects("token-abc", { search: "celery", tech: "Python", sort: "az" });

    const [url] = fetchMock.mock.calls[0];
    expect(url).toContain("search=celery");
    expect(url).toContain("tech=Python");
    expect(url).toContain("sort=az");
  });

  it("maps a 401 to an unauthorized ProjectsError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(401, { detail: "Not authenticated" }))
    );

    const error = await projectsApi.listProjects("bad-token").catch((e) => e);

    expect(error).toBeInstanceOf(ProjectsError);
    expect(error.kind).toBe("unauthorized");
    expect(error.step).toBe("list");
  });
});

describe("projectsApi.createProject", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts the input and returns the created project", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, project));
    vi.stubGlobal("fetch", fetchMock);

    const result = await projectsApi.createProject(
      { description: "Built X", tech: ["Python"] },
      "token-abc"
    );

    expect(result).toEqual(project);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain("/projects/");
    expect(opts.method).toBe("POST");
    expect(JSON.parse(opts.body as string)).toEqual({ description: "Built X", tech: ["Python"] });
  });

  it("maps a 422 to a validation error with field messages", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(422, { detail: [{ msg: "At least one tech value is required." }] })
      )
    );

    const error = await projectsApi
      .createProject({ description: "Built X", tech: [] }, "token-abc")
      .catch((e) => e);

    expect(error).toBeInstanceOf(ProjectsError);
    expect(error.kind).toBe("validation");
    expect(error.fieldErrors).toEqual(["At least one tech value is required."]);
  });
});

describe("projectsApi.deleteProject", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends an authenticated DELETE and resolves with no content on 204", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(projectsApi.deleteProject(1, "token-abc")).resolves.toBeUndefined();
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain("/projects/1");
    expect(opts.method).toBe("DELETE");
  });

  it("maps a 404 to a not_found ProjectsError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(jsonResponse(404, { detail: "Project not found." }))
    );

    const error = await projectsApi.deleteProject(1, "token-abc").catch((e) => e);

    expect(error).toBeInstanceOf(ProjectsError);
    expect(error.kind).toBe("not_found");
    expect(error.step).toBe("delete");
  });
});

describe("projectsApi.bulkCreateProjects", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("posts projects with the given source", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(201, [project]));
    vi.stubGlobal("fetch", fetchMock);

    const result = await projectsApi.bulkCreateProjects(
      [{ description: "Built X", tech: ["Python"] }],
      "csv",
      "token-abc"
    );

    expect(result).toEqual([project]);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain("/projects/bulk");
    expect(JSON.parse(opts.body as string)).toEqual({
      projects: [{ description: "Built X", tech: ["Python"] }],
      source: "csv",
    });
  });
});

describe("projectsApi.extractResume", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a multipart POST with the file and no Content-Type header", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse(200, { candidates: [{ description: "Built X", tech: ["Python"] }] })
    );
    vi.stubGlobal("fetch", fetchMock);

    const file = new File(["%PDF-1.4 fake"], "resume.pdf", { type: "application/pdf" });
    const result = await projectsApi.extractResume(file, "token-abc");

    expect(result.candidates).toEqual([{ description: "Built X", tech: ["Python"] }]);
    const [url, opts] = fetchMock.mock.calls[0];
    expect(url).toContain("/projects/extract-resume");
    expect(opts.method).toBe("POST");
    expect((opts.headers as Record<string, string>).Authorization).toBe("Bearer token-abc");
    expect((opts.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
    expect(opts.body).toBeInstanceOf(FormData);
  });
});
