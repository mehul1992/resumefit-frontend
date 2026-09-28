import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AppWrapper } from "../../components/common/PageMeta";
import { AuthProvider } from "../../context/AuthContext";
import { projectsApi, ProjectsError, type Project } from "../../api/projects";
import { useProjects } from "../../hooks/useProjects";
import ProjectsList from "./ProjectsList";

vi.mock("../../hooks/useProjects", () => ({
  useProjects: vi.fn(),
}));

vi.mock("../../api/projects", async () => {
  const actual = await vi.importActual<typeof import("../../api/projects")>("../../api/projects");
  return {
    ...actual,
    projectsApi: { ...actual.projectsApi, deleteProject: vi.fn() },
  };
});

const mockedUseProjects = vi.mocked(useProjects);
const mockedDeleteProject = vi.mocked(projectsApi.deleteProject);

function renderPage() {
  return render(
    <MemoryRouter>
      <AppWrapper>
        <AuthProvider>
          <ProjectsList />
        </AuthProvider>
      </AppWrapper>
    </MemoryRouter>
  );
}

const project: Project = {
  id: 1,
  description: "Built X",
  tech: ["Python", "Celery"],
  source: "manual",
  created_at: "2026-07-01T00:00:00Z",
  updated_at: "2026-07-01T00:00:00Z",
};

describe("ProjectsList", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("shows a spinner while loading", () => {
    mockedUseProjects.mockReturnValue({ projects: [], loading: true, error: null, refetch: vi.fn() });

    const { container } = renderPage();
    expect(container.querySelector("svg.animate-spin")).toBeInTheDocument();
  });

  it("shows an empty state and keeps the header add actions available", () => {
    mockedUseProjects.mockReturnValue({ projects: [], loading: false, error: null, refetch: vi.fn() });

    renderPage();
    expect(screen.getByText("No projects yet.")).toBeInTheDocument();
    expect(screen.getByText("Import from Resume")).toBeInTheDocument();
    expect(screen.getByText("Upload CSV")).toBeInTheDocument();
    expect(screen.getByText("+ Add Project")).toBeInTheDocument();
  });

  it("renders a row per project with description and tech badges", () => {
    mockedUseProjects.mockReturnValue({
      projects: [project],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderPage();
    expect(screen.getByText("Built X")).toBeInTheDocument();
    expect(screen.getByText("Python", { selector: "span" })).toBeInTheDocument();
    expect(screen.getByText("Celery", { selector: "span" })).toBeInTheDocument();
  });

  it("shows the error banner with a retry button that calls refetch", async () => {
    const refetch = vi.fn();
    mockedUseProjects.mockReturnValue({
      projects: [],
      loading: false,
      error: new ProjectsError("forbidden", "list", "Your account is inactive."),
      refetch,
    });

    renderPage();
    expect(screen.getByText("Your account is inactive.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(refetch).toHaveBeenCalled();
  });

  it("deletes a project after confirmation and refetches the list", async () => {
    localStorage.setItem("rf_token", "token-abc");
    localStorage.setItem(
      "rf_user",
      JSON.stringify({
        id: 1,
        first_name: "Ada",
        last_name: "Lovelace",
        email: "ada@example.com",
        age: null,
        mobile_number: null,
        designation: null,
        is_active: true,
        created_at: "2026-01-01T00:00:00Z",
        updated_at: "2026-01-01T00:00:00Z",
      })
    );
    const refetch = vi.fn();
    mockedUseProjects.mockReturnValue({
      projects: [project],
      loading: false,
      error: null,
      refetch,
    });
    mockedDeleteProject.mockResolvedValue(undefined);
    vi.spyOn(window, "confirm").mockReturnValue(true);

    renderPage();
    await userEvent.click(screen.getByTitle("Delete"));

    expect(mockedDeleteProject).toHaveBeenCalledWith(1, "token-abc");
    expect(refetch).toHaveBeenCalled();
  });
});
