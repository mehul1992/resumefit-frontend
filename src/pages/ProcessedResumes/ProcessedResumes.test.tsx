import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jobTrackerApi, type TrackedJob } from "../../api/jobTracker";
import { resumeTailoringApi, TailoringError, type TailoringJobListItem } from "../../api/resumeTailoring";
import { AppWrapper } from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import { useTailoringJobs } from "../../hooks/useTailoringJobs";
import ProcessedResumes from "./ProcessedResumes";

vi.mock("../../hooks/useTailoringJobs", () => ({ useTailoringJobs: vi.fn() }));
vi.mock("../../context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../../api/jobTracker", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/jobTracker")>()),
  jobTrackerApi: { createJob: vi.fn() },
}));
vi.mock("../../api/resumeTailoring", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/resumeTailoring")>();
  return { ...actual, resumeTailoringApi: { ...actual.resumeTailoringApi, retryJob: vi.fn() } };
});

const mockedUseTailoringJobs = vi.mocked(useTailoringJobs);

const now = Date.now();
const daysAgo = (n: number) => new Date(now - n * 86_400_000).toISOString();

const base: TailoringJobListItem = {
  id: 1,
  status: "completed",
  error_message: null,
  created_at: daysAgo(0),
  updated_at: daysAgo(0),
  role: "Senior Backend Engineer (Python)",
  company: "Orbit Retail",
  match_score: 91,
  original_resume_download_url: "https://s3.example.com/original",
  tailored_resume_download_url: "https://s3.example.com/tailored",
  tracked_job: { id: 7, stage: "applied" },
};

const jobs: TailoringJobListItem[] = [
  base,
  {
    ...base,
    id: 2,
    role: "Python Engineer",
    company: "Tidal Logistics",
    status: "processing",
    match_score: null,
    tailored_resume_download_url: null,
    tracked_job: null,
    created_at: daysAgo(2),
  },
  { ...base, id: 3, role: "Software Engineer II", company: "Parcelo", match_score: 69, tracked_job: null, created_at: daysAgo(39) },
  {
    ...base,
    id: 4,
    role: "Data Platform Engineer",
    company: "Quarry",
    status: "failed",
    error_message: "Error code: 401 – authentication_error",
    match_score: null,
    tailored_resume_download_url: null,
    tracked_job: null,
    created_at: daysAgo(48),
  },
];

const refresh = vi.fn();

function renderPage(overrides: Partial<ReturnType<typeof useTailoringJobs>> = {}) {
  mockedUseTailoringJobs.mockReturnValue({
    jobs,
    loading: false,
    error: null,
    refetch: vi.fn(),
    refresh,
    ...overrides,
  });
  return render(
    <MemoryRouter>
      <AppWrapper>
        <ProcessedResumes />
      </AppWrapper>
    </MemoryRouter>
  );
}

const rowFor = (role: string) => screen.getByText(role).closest('[role="row"]') as HTMLElement;

describe("ProcessedResumes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: "token-123",
      setAuth: vi.fn(),
      updateUser: vi.fn(),
      clearAuth: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: true,
    });
  });

  it("shows a spinner while loading", () => {
    const { container } = renderPage({ jobs: [], loading: true });
    expect(container.querySelector("svg.animate-spin")).toBeInTheDocument();
  });

  it("shows an empty state when there are no runs", () => {
    renderPage({ jobs: [] });
    expect(screen.getByText(/haven't tailored any resumes yet/i)).toBeInTheDocument();
  });

  it("labels each run with its job, status, match and documents", () => {
    renderPage();
    expect(screen.getByText("Showing 4 of 4")).toBeInTheDocument();

    const done = within(rowFor("Senior Backend Engineer (Python)"));
    expect(done.getByText("Completed")).toBeInTheDocument();
    expect(done.getByText("91%")).toBeInTheDocument();
    expect(done.getByRole("link", { name: "Original" })).toHaveAttribute("href", base.original_resume_download_url);
    expect(done.getByRole("link", { name: "Tailored" })).toHaveAttribute("href", base.tailored_resume_download_url!);
    expect(done.getByRole("link", { name: "Preview" })).toHaveAttribute("href", "/resumes/1");
    expect(done.getByRole("link", { name: "View JD" })).toHaveAttribute("href", "/resumes/1?tab=jd");
    expect(done.getByRole("link", { name: "Applied" })).toHaveAttribute("href", "/tracker");

    const pending = within(rowFor("Python Engineer"));
    expect(pending.getByText("Processing")).toBeInTheDocument();
    expect(pending.queryByRole("link", { name: "Preview" })).not.toBeInTheDocument();

    const failed = within(rowFor("Data Platform Engineer"));
    expect(failed.getByText("Error code: 401 – authentication_error")).toBeInTheDocument();
    expect(failed.getByRole("button", { name: "Retry" })).toBeInTheDocument();
  });

  it("combines search, status and date filters", async () => {
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Pending" }));
    expect(screen.getByText("Showing 1 of 4")).toBeInTheDocument();
    expect(screen.getByText("Python Engineer")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "All" }));
    await userEvent.click(screen.getByRole("button", { name: "30 days" }));
    expect(screen.getByText("Showing 2 of 4")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search by role or company"), "tidal");
    expect(screen.getByText("Showing 1 of 4")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Search by role or company"), "zzz");
    expect(screen.getByText("No resumes match these filters.")).toBeInTheDocument();
  });

  it("tracks a completed run and shows its stage", async () => {
    vi.mocked(jobTrackerApi.createJob).mockResolvedValue({ id: 9, stage: "saved" } as TrackedJob);
    renderPage();

    await userEvent.click(within(rowFor("Software Engineer II")).getByRole("button", { name: "+ Track" }));

    expect(jobTrackerApi.createJob).toHaveBeenCalledWith({ tailoring_job_id: 3 }, "token-123");
    expect(await within(rowFor("Software Engineer II")).findByRole("link", { name: "Saved" })).toBeInTheDocument();
  });

  it("retries a failed run", async () => {
    vi.mocked(resumeTailoringApi.retryJob).mockResolvedValue({} as never);
    renderPage();

    await userEvent.click(within(rowFor("Data Platform Engineer")).getByRole("button", { name: "Retry" }));

    expect(resumeTailoringApi.retryJob).toHaveBeenCalledWith(4, "token-123");
    expect(refresh).toHaveBeenCalled();
  });

  it("shows the load error with a retry button that calls refetch", async () => {
    const refetch = vi.fn();
    renderPage({
      jobs: [],
      error: new TailoringError("forbidden", "list_jobs", "Your account is inactive."),
      refetch,
    });
    expect(screen.getByText("Your account is inactive.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
