import { fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { jobTrackerApi, type TrackedJob } from "../../api/jobTracker";
import { AppWrapper } from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import JobTracker from "./JobTracker";

vi.mock("../../context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../../api/jobTracker", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../api/jobTracker")>()),
  jobTrackerApi: { listJobs: vi.fn(), createJob: vi.fn(), updateJob: vi.fn() },
}));

const job = (overrides: Partial<TrackedJob>): TrackedJob => ({
  id: 1,
  role: "Backend Engineer",
  company: "Lumen Pay",
  stage: "applied",
  note: null,
  tailoring_job_id: 10,
  cv_status: "completed",
  match_score: 86,
  applied_at: "2026-10-14T10:00:00Z",
  created_at: "2026-10-12T10:00:00Z",
  updated_at: "2026-10-14T10:00:00Z",
  ...overrides,
});

const jobs = [
  job({ id: 1, role: "Staff Platform Engineer", company: "Fieldnote", stage: "saved", applied_at: null, match_score: 74 }),
  job({ id: 2, role: "Python Engineer", company: "Tidal Logistics", stage: "saved", applied_at: null, cv_status: "processing", match_score: null }),
  job({ id: 3, note: "No reply yet · follow up" }),
  job({ id: 4, role: "Backend Lead", company: "Hearthstone Health", stage: "interview" }),
  job({ id: 5, role: "Python Developer", company: "Brightline", stage: "rejected" }),
];

const column = (name: string) => screen.getByRole("region", { name }) as HTMLElement;
const stat = (label: string) => screen.getByText(label).parentElement as HTMLElement;

// jsdom has no DataTransfer; the board only needs get/setData.
function dataTransfer() {
  const data: Record<string, string> = {};
  return {
    setData: (type: string, value: string) => (data[type] = value),
    getData: (type: string) => data[type] ?? "",
    effectAllowed: "",
    dropEffect: "",
  };
}

function drag(card: HTMLElement, target: HTMLElement) {
  const dt = dataTransfer();
  fireEvent.dragStart(card, { dataTransfer: dt });
  fireEvent.dragOver(target, { dataTransfer: dt });
  fireEvent.drop(target, { dataTransfer: dt });
  fireEvent.dragEnd(card, { dataTransfer: dt });
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AppWrapper>
        <JobTracker />
      </AppWrapper>
    </MemoryRouter>
  );
}

describe("JobTracker", () => {
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
    vi.mocked(jobTrackerApi.listJobs).mockResolvedValue(jobs);
  });

  it("shows stats and a card per job in its stage column", async () => {
    renderPage();
    expect(await within(column("Saved")).findByText("Staff Platform Engineer")).toBeInTheDocument();

    expect(within(stat("Jobs tracked")).getByText("5")).toBeInTheDocument();
    expect(within(stat("Applications sent")).getByText("3")).toBeInTheDocument();
    expect(within(stat("In interview")).getByText("1")).toBeInTheDocument();
    // Interview + Rejected responded, out of 3 sent.
    expect(within(stat("Response rate")).getByText("67%")).toBeInTheDocument();

    const saved = column("Saved");
    expect(within(saved).getByRole("link", { name: "CV · 74%" })).toHaveAttribute("href", "/resumes/10");
    expect(within(saved).getByText("CV processing…")).toBeInTheDocument();
    expect(within(column("Applied")).getByText("No reply yet · follow up")).toBeInTheDocument();
    expect(within(column("Applied")).getByText("Applied 14 Oct")).toBeInTheDocument();
    expect(within(column("Rejected")).queryByRole("button")).not.toBeInTheDocument();
  });

  it("moves a card to the next stage and updates the stats immediately", async () => {
    vi.mocked(jobTrackerApi.updateJob).mockImplementation(async (id, input) => ({
      ...jobs.find((j) => j.id === id)!,
      stage: input.stage!,
    }));
    renderPage();
    const card = (await screen.findByText("Backend Lead")).closest("li") as HTMLElement;

    await userEvent.click(within(card).getByRole("button", { name: "Move to Offer →" }));

    expect(jobTrackerApi.updateJob).toHaveBeenCalledWith(4, { stage: "offer" }, "token-123");
    expect(within(column("Offer")).getByText("Backend Lead")).toBeInTheDocument();
    expect(within(stat("In interview")).getByText("0")).toBeInTheDocument();
  });

  it("puts the card back when the move fails", async () => {
    vi.mocked(jobTrackerApi.updateJob).mockRejectedValue(new Error("Server unavailable"));
    renderPage();
    const card = (await screen.findByText("Staff Platform Engineer")).closest("li") as HTMLElement;

    await userEvent.click(within(card).getByRole("button", { name: "Move to Applied →" }));

    expect(await screen.findByText("Server unavailable")).toBeInTheDocument();
    expect(within(column("Saved")).getByText("Staff Platform Engineer")).toBeInTheDocument();
  });

  it("adds a job by hand", async () => {
    vi.mocked(jobTrackerApi.createJob).mockResolvedValue(
      job({ id: 9, role: "Platform Engineer", company: "Acme", stage: "saved", applied_at: null, tailoring_job_id: null, cv_status: null, match_score: null })
    );
    renderPage();
    await screen.findByText("Staff Platform Engineer");

    await userEvent.click(screen.getByRole("button", { name: "+ Add job" }));
    await userEvent.click(screen.getByRole("button", { name: "Add job" }));
    expect(screen.getByText("Role is required.")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("Role"), "Platform Engineer");
    await userEvent.type(screen.getByLabelText("Company"), "Acme");
    await userEvent.click(screen.getByRole("button", { name: "Add job" }));

    expect(jobTrackerApi.createJob).toHaveBeenCalledWith(
      { role: "Platform Engineer", company: "Acme", note: undefined },
      "token-123"
    );
    expect(await within(column("Saved")).findByText("Platform Engineer")).toBeInTheDocument();
    expect(within(stat("Jobs tracked")).getByText("6")).toBeInTheDocument();
  });

  it("drags a card into any other column, including backwards", async () => {
    vi.mocked(jobTrackerApi.updateJob).mockImplementation(async (id, input) => ({
      ...jobs.find((j) => j.id === id)!,
      stage: input.stage!,
    }));
    renderPage();
    const card = (await screen.findByText("Backend Lead")).closest("li") as HTMLElement;
    expect(card).toHaveAttribute("draggable", "true");

    drag(card, column("Saved"));

    expect(jobTrackerApi.updateJob).toHaveBeenCalledWith(4, { stage: "saved" }, "token-123");
    const moved = within(column("Saved")).getByText("Backend Lead").closest("li") as HTMLElement;
    // Back in Saved it reads as saved again, with the forward move offered.
    expect(within(moved).getByText("Saved 12 Oct")).toBeInTheDocument();
    expect(within(moved).getByRole("button", { name: "Move to Applied →" })).toBeInTheDocument();
    expect(within(stat("In interview")).getByText("0")).toBeInTheDocument();
  });

  it("ignores a drop onto the card's own column", async () => {
    renderPage();
    const card = (await screen.findByText("Backend Lead")).closest("li") as HTMLElement;

    drag(card, column("Interview"));

    expect(jobTrackerApi.updateJob).not.toHaveBeenCalled();
    expect(within(column("Interview")).getByText("Backend Lead")).toBeInTheDocument();
  });

  it("highlights the column under the dragged card", async () => {
    renderPage();
    const card = (await screen.findByText("Backend Lead")).closest("li") as HTMLElement;
    const dt = dataTransfer();

    fireEvent.dragStart(card, { dataTransfer: dt });
    fireEvent.dragOver(column("Offer"), { dataTransfer: dt });
    expect(column("Offer")).toHaveClass("ring-2");
    expect(card).toHaveClass("opacity-50");

    fireEvent.dragEnd(card, { dataTransfer: dt });
    expect(column("Offer")).not.toHaveClass("ring-2");
    expect(card).not.toHaveClass("opacity-50");
  });
});
