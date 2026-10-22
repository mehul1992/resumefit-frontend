import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jobTrackerApi, type TrackedJob } from "../../api/jobTracker";
import { resumeTailoringApi, type TailoringResult } from "../../api/resumeTailoring";
import { AppWrapper } from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import TailorResult from "./TailorResult";

vi.mock("../../context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../../api/jobTracker", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/jobTracker")>()),
  jobTrackerApi: { createJob: vi.fn() },
}));
vi.mock("../../api/resumeTailoring", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/resumeTailoring")>();
  return {
    ...actual,
    resumeTailoringApi: { getResult: vi.fn(), setChangeReverted: vi.fn(), retryJob: vi.fn() },
  };
});

const result: TailoringResult = {
  id: 42,
  status: "completed",
  error_message: null,
  created_at: "2026-10-21T15:48:00Z",
  updated_at: "2026-10-21T15:49:00Z",
  role: "Senior Backend Engineer (Python)",
  company: "Orbit Retail",
  job_description: "We are hiring a Senior Backend Engineer.\n\nRequirements:\n• Python",
  original_resume_download_url: "https://s3.example.com/original",
  tailored_resume_download_url: "https://s3.example.com/tailored",
  pdf_up_to_date: true,
  has_analysis: true,
  match_before: 62,
  match_after: 91,
  changes: [
    {
      id: "c1",
      section: "Experience · Northwind Commerce",
      source_label: "Celery & RabbitMQ",
      source_project_id: 5,
      original_segments: [
        { text: "Used ", kind: "same" },
        { text: "background jobs.", kind: "removed" },
      ],
      tailored_segments: [
        { text: "Used ", kind: "same" },
        { text: "Celery and RabbitMQ.", kind: "added" },
      ],
      reverted: false,
    },
  ],
  requirements: [
    { requirement: "Python", importance: "must", status: "covered", evidence: "3 projects", action: "none" },
    { requirement: "Mentor mid-level engineers", importance: "must", status: "missing", evidence: "No project mentions mentoring", action: "add_project" },
    { requirement: "AWS", importance: "nice_to_have", status: "partial", evidence: "ECS only", action: "add_project" },
  ],
  keywords: [
    { label: "Python", coverage: "covered" },
    { label: "Mentoring", coverage: "missing" },
  ],
  tracked_job: null,
};

function renderPage(path = "/resumes/42") {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <AppWrapper>
        <Routes>
          <Route path="/resumes/:id" element={<TailorResult />} />
        </Routes>
      </AppWrapper>
    </MemoryRouter>
  );
}

describe("TailorResult", () => {
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
    vi.mocked(resumeTailoringApi.getResult).mockResolvedValue(result);
  });

  it("shows the job header, match summary and the side-by-side changes", async () => {
    renderPage();

    expect(await screen.findByRole("heading", { name: "Senior Backend Engineer (Python)" })).toBeInTheDocument();
    expect(resumeTailoringApi.getResult).toHaveBeenCalledWith(42, "token-123");
    expect(screen.getByRole("link", { name: "Download tailored" })).toHaveAttribute("href", result.tailored_resume_download_url!);
    expect(screen.getByText("91%")).toBeInTheDocument();
    expect(screen.getByText("was 62% before tailoring")).toBeInTheDocument();
    expect(screen.getByText(/1 of 3 requirements fully covered · 1 bullet rewritten · 1 project used/)).toBeInTheDocument();
    expect(screen.getByText("2 gaps could lift your match")).toBeInTheDocument();

    const card = screen.getByRole("article", { name: "Experience · Northwind Commerce" });
    expect(within(card).getByText("background jobs.")).toHaveClass("line-through");
    expect(within(card).getByText("Celery and RabbitMQ.")).toBeInTheDocument();
    expect(within(card).getByText("Celery & RabbitMQ")).toBeInTheDocument();
    expect(within(card).getByText("Applied")).toBeInTheDocument();
  });

  it("reverts a change and waits for the PDF to re-render", async () => {
    vi.mocked(resumeTailoringApi.setChangeReverted).mockResolvedValue({
      ...result,
      pdf_up_to_date: false,
      changes: [{ ...result.changes[0], reverted: true }],
    });
    renderPage();
    const card = await screen.findByRole("article", { name: "Experience · Northwind Commerce" });

    await userEvent.click(within(card).getByRole("button", { name: "Revert" }));

    expect(resumeTailoringApi.setChangeReverted).toHaveBeenCalledWith(42, "c1", true, "token-123");
    expect(within(card).getByText("Reverted to original")).toBeInTheDocument();
    expect(within(card).getByRole("button", { name: "Re-apply" })).toBeInTheDocument();
    expect(within(card).queryByText("Celery and RabbitMQ.")).not.toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Updating PDF…" })).toBeDisabled();
  });

  it("rolls a revert back when saving it fails", async () => {
    vi.mocked(resumeTailoringApi.setChangeReverted).mockRejectedValue(new Error("Server unavailable"));
    renderPage();
    const card = await screen.findByRole("article", { name: "Experience · Northwind Commerce" });

    await userEvent.click(within(card).getByRole("button", { name: "Revert" }));

    expect(await screen.findByText("Server unavailable")).toBeInTheDocument();
    expect(within(card).getByText("Applied")).toBeInTheDocument();
  });

  it("lists gaps with links to add a project, from the tab or the callout", async () => {
    renderPage();
    await userEvent.click(await screen.findByRole("button", { name: "View gap analysis ›" }));

    expect(screen.getByRole("tab", { name: "Gap analysis" })).toHaveAttribute("aria-selected", "true");
    const row = screen.getByText("Mentor mid-level engineers").closest('[role="row"]') as HTMLElement;
    expect(within(row).getByText("Missing")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "Add project ›" })).toHaveAttribute("href", "/projects?new=1");
    const covered = screen.getByText("3 projects").closest('[role="row"]') as HTMLElement;
    expect(within(covered).queryByRole("link")).not.toBeInTheDocument();
  });

  it("opens straight on the job description from ?tab=jd", async () => {
    renderPage("/resumes/42?tab=jd");
    expect(await screen.findByText(/We are hiring a Senior Backend Engineer/)).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Job description" })).toHaveAttribute("aria-selected", "true");
  });

  it("saves the run to the tracker", async () => {
    vi.mocked(jobTrackerApi.createJob).mockResolvedValue({ id: 3, stage: "saved" } as TrackedJob);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Save to tracker" }));

    expect(jobTrackerApi.createJob).toHaveBeenCalledWith({ tailoring_job_id: 42 }, "token-123");
    expect(await screen.findByRole("link", { name: "Saved to tracker ✓" })).toHaveAttribute("href", "/tracker");
  });

  it("explains that older runs have no change tracking", async () => {
    vi.mocked(resumeTailoringApi.getResult).mockResolvedValue({
      ...result,
      has_analysis: false,
      changes: [],
      requirements: [],
      keywords: [],
      match_before: null,
      match_after: null,
    });
    renderPage();
    expect(await screen.findByText(/tailored before they existed/)).toBeInTheDocument();
    expect(screen.queryByText("JD match")).not.toBeInTheDocument();
  });

  it("offers a retry for failed runs", async () => {
    vi.mocked(resumeTailoringApi.getResult).mockResolvedValue({
      ...result,
      status: "failed",
      error_message: "Error code: 401",
      tailored_resume_download_url: null,
    });
    vi.mocked(resumeTailoringApi.retryJob).mockResolvedValue({} as never);
    renderPage();

    await userEvent.click(await screen.findByRole("button", { name: "Retry" }));
    expect(resumeTailoringApi.retryJob).toHaveBeenCalledWith(42, "token-123");
  });
});
