import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { TailoringError, type TailoringJobListItem } from "../../api/resumeTailoring";
import { AppWrapper } from "../../components/common/PageMeta";
import { useTailoringJobs } from "../../hooks/useTailoringJobs";
import ProcessedResumes from "./ProcessedResumes";

vi.mock("../../hooks/useTailoringJobs", () => ({
  useTailoringJobs: vi.fn(),
}));

const mockedUseTailoringJobs = vi.mocked(useTailoringJobs);

function renderPage() {
  return render(
    <MemoryRouter>
      <AppWrapper>
        <ProcessedResumes />
      </AppWrapper>
    </MemoryRouter>
  );
}

const job: TailoringJobListItem = {
  id: 1,
  status: "completed",
  error_message: null,
  created_at: "2026-07-02T10:00:00Z",
  updated_at: "2026-07-02T10:00:05Z",
  original_resume_download_url: "https://s3.example.com/original",
  tailored_resume_download_url: "https://s3.example.com/tailored",
};

describe("ProcessedResumes", () => {
  it("shows a spinner while loading", () => {
    mockedUseTailoringJobs.mockReturnValue({
      jobs: [],
      loading: true,
      error: null,
      refetch: vi.fn(),
    });

    const { container } = renderPage();
    expect(container.querySelector("svg.animate-spin")).toBeInTheDocument();
  });

  it("shows an empty state when there are no jobs", () => {
    mockedUseTailoringJobs.mockReturnValue({
      jobs: [],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderPage();
    expect(screen.getByText(/haven't tailored any resumes yet/i)).toBeInTheDocument();
  });

  it("renders a row per job with status badge and download links", () => {
    mockedUseTailoringJobs.mockReturnValue({
      jobs: [job],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderPage();

    expect(screen.getByText("Completed")).toBeInTheDocument();
    const links = screen.getAllByRole("link", { name: "Download" });
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", job.original_resume_download_url);
    expect(links[1]).toHaveAttribute("href", job.tailored_resume_download_url!);
  });

  it("shows a placeholder instead of a tailored-resume link until the job completes", () => {
    mockedUseTailoringJobs.mockReturnValue({
      jobs: [{ ...job, status: "processing", tailored_resume_download_url: null }],
      loading: false,
      error: null,
      refetch: vi.fn(),
    });

    renderPage();
    expect(screen.getAllByRole("link", { name: "Download" })).toHaveLength(1);
  });

  it("shows the error banner with a retry button that calls refetch", async () => {
    const refetch = vi.fn();
    mockedUseTailoringJobs.mockReturnValue({
      jobs: [],
      loading: false,
      error: new TailoringError("forbidden", "list_jobs", "Your account is inactive."),
      refetch,
    });

    renderPage();
    expect(screen.getByText("Your account is inactive.")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
