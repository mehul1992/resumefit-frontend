import { useMemo, useState } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { useTailoringJobs } from "../../hooks/useTailoringJobs";
import { jobTrackerApi, TrackerError } from "../../api/jobTracker";
import {
  resumeTailoringApi,
  TailoringError,
  type TailoringJobListItem,
  type TrackerLink,
} from "../../api/resumeTailoring";
import {
  daysSince,
  formatSubmitted,
  jobTitle,
  PILL_CLASS,
  RUN_STATUS,
  STAGE_CHIP_CLASS,
  STAGE_LABEL,
} from "../../lib/jobDisplay";

type StatusFilter = "All" | "Completed" | "Pending" | "Failed";
type RangeFilter = "Any time" | "7 days" | "30 days";

const STATUS_FILTERS: StatusFilter[] = ["All", "Completed", "Pending", "Failed"];
const RANGE_FILTERS: RangeFilter[] = ["Any time", "7 days", "30 days"];
const RANGE_DAYS: Record<RangeFilter, number> = { "Any time": Infinity, "7 days": 7, "30 days": 30 };

const GRID_CLASS = "grid grid-cols-[2.4fr_1.3fr_1.2fr_1fr_2fr_1.1fr] items-center gap-4 px-5 py-3.5";
const LINK_CLASS = "font-medium text-brand-600 hover:text-[#2a31d8] dark:text-brand-400";

function matchesStatus(job: TailoringJobListItem, filter: StatusFilter): boolean {
  if (filter === "All") return true;
  if (filter === "Pending") return job.status === "pending" || job.status === "processing";
  return job.status === filter.toLowerCase();
}

function Chip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`h-10 rounded-full border px-3.5 font-medium transition-colors duration-150 ${
        active
          ? "border-brand-500 bg-brand-500 text-white"
          : "border-gray-300 bg-white text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300 dark:hover:bg-white/5"
      }`}
    >
      {label}
    </button>
  );
}

function MatchBar({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 flex-1 rounded-full bg-gray-100 dark:bg-white/10">
        <div
          className={`h-1.5 rounded-full ${score >= 80 ? "bg-success-500" : "bg-warning-500"}`}
          style={{ width: `${score}%` }}
        />
      </div>
      <span className="w-[34px] text-[13px] font-semibold text-gray-900 dark:text-white/90">{score}%</span>
    </div>
  );
}

const Dash = () => <span className="text-gray-400">—</span>;

interface RowProps {
  job: TailoringJobListItem;
  tracked: TrackerLink | null;
  busy: boolean;
  onTrack: () => void;
  onRetry: () => void;
}

function ResumeRow({ job, tracked, busy, onTrack, onRetry }: RowProps) {
  const status = RUN_STATUS[job.status];
  const ready = job.status === "completed";

  return (
    <div role="row" className={`${GRID_CLASS} border-b border-gray-100 last:border-b-0 dark:border-white/[0.05]`}>
      <div role="cell" className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate font-medium text-gray-900 dark:text-white/90">{jobTitle(job.role, job.id)}</span>
        <span className="text-[13px] text-gray-500 dark:text-gray-400">
          {job.company ? `${job.company} · ` : ""}
          <Link to={`/resumes/${job.id}?tab=jd`} className={LINK_CLASS}>
            View JD
          </Link>
        </span>
      </div>
      <span role="cell" className="tabular-nums text-gray-700 dark:text-gray-300">
        {formatSubmitted(job.created_at)}
      </span>
      <div role="cell" className="flex flex-col items-start gap-1.5">
        <span className={`${PILL_CLASS} ${status.className}`}>{status.label}</span>
        {job.status === "failed" && job.error_message && (
          <span className="text-xs text-error-700 dark:text-error-500">{job.error_message}</span>
        )}
      </div>
      <div role="cell">{ready && job.match_score !== null ? <MatchBar score={job.match_score} /> : <Dash />}</div>
      <div role="cell" className="flex items-center gap-3.5">
        <a href={job.original_resume_download_url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
          Original
        </a>
        {ready && job.tailored_resume_download_url ? (
          <>
            <a href={job.tailored_resume_download_url} target="_blank" rel="noopener noreferrer" className={LINK_CLASS}>
              Tailored
            </a>
            <Link
              to={`/resumes/${job.id}`}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-[#c7d7fe] bg-brand-50 px-3 text-[13px] font-medium text-brand-800 hover:bg-brand-100 dark:border-brand-500/30 dark:bg-brand-500/15 dark:text-brand-400"
            >
              <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
              Preview
            </Link>
          </>
        ) : (
          <Dash />
        )}
      </div>
      <div role="cell">
        {tracked ? (
          <Link to="/tracker" className={`${PILL_CLASS} ${STAGE_CHIP_CLASS[tracked.stage]}`}>
            {STAGE_LABEL[tracked.stage]}
          </Link>
        ) : ready ? (
          <button type="button" onClick={onTrack} disabled={busy} className={`${LINK_CLASS} text-[13px] disabled:opacity-50`}>
            + Track
          </button>
        ) : job.status === "failed" ? (
          <button type="button" onClick={onRetry} disabled={busy} className={`${LINK_CLASS} text-[13px] disabled:opacity-50`}>
            Retry
          </button>
        ) : null}
      </div>
    </div>
  );
}

export default function ProcessedResumes() {
  const { token, clearAuth } = useAuth();
  const { jobs, loading, error, refetch, refresh } = useTailoringJobs();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("All");
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>("Any time");
  // Tracker entries created from this page, shown before the list refreshes.
  const [trackedNow, setTrackedNow] = useState<Record<number, TrackerLink>>({});
  const [busyId, setBusyId] = useState<number | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return jobs.filter(
      (job) =>
        matchesStatus(job, statusFilter) &&
        daysSince(job.created_at) <= RANGE_DAYS[rangeFilter] &&
        (!q || `${job.role ?? ""} ${job.company ?? ""}`.toLowerCase().includes(q))
    );
  }, [jobs, query, statusFilter, rangeFilter]);

  async function runRowAction(jobId: number, action: (token: string) => Promise<void>) {
    if (!token) {
      clearAuth();
      return;
    }
    setBusyId(jobId);
    setActionError(null);
    try {
      await action(token);
    } catch (err) {
      if ((err instanceof TrackerError || err instanceof TailoringError) && err.kind === "unauthorized") {
        clearAuth();
        return;
      }
      setActionError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusyId(null);
    }
  }

  const handleTrack = (job: TailoringJobListItem) =>
    runRowAction(job.id, async (t) => {
      const tracked = await jobTrackerApi.createJob({ tailoring_job_id: job.id }, t);
      setTrackedNow((prev) => ({ ...prev, [job.id]: { id: tracked.id, stage: tracked.stage } }));
    });

  const handleRetry = (job: TailoringJobListItem) =>
    runRowAction(job.id, async (t) => {
      await resumeTailoringApi.retryJob(job.id, t);
      await refresh();
    });

  return (
    <>
      <PageMeta title="Processed Resumes | ResumeFit" description="View and download your tailored resumes" />
      <PageBreadCrumb pageTitle="Processed Resumes" />

      {(error || actionError) && (
        <div className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
          <p>{error?.message ?? actionError}</p>
          {error && (
            <button onClick={refetch} className="shrink-0 text-xs font-semibold underline hover:no-underline">
              Retry
            </button>
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="h-6 w-6 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : error ? null : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
          <p className="text-gray-500 dark:text-gray-400">You haven't tailored any resumes yet.</p>
          <Link to="/tailor" className={`${LINK_CLASS} text-sm`}>
            Tailor your first CV ›
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-5 text-sm">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex h-10 max-w-[340px] flex-[1_1_260px] items-center gap-2.5 rounded-full border border-gray-300 bg-white px-3.5 text-gray-500 focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100 dark:border-gray-700 dark:bg-gray-900 dark:focus-within:ring-brand-500/20">
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-3.5-3.5" />
              </svg>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search by role or company"
                placeholder="Search role or company..."
                className="min-w-0 flex-1 border-0 bg-transparent text-gray-900 outline-hidden placeholder:text-gray-400 dark:text-white/90"
              />
            </label>
            <div role="group" aria-label="Filter by status" className="flex gap-1.5">
              {STATUS_FILTERS.map((f) => (
                <Chip key={f} label={f} active={statusFilter === f} onClick={() => setStatusFilter(f)} />
              ))}
            </div>
            <span aria-hidden="true" className="h-6 w-px bg-gray-200 dark:bg-gray-800" />
            <div role="group" aria-label="Filter by date" className="flex gap-1.5">
              {RANGE_FILTERS.map((f) => (
                <Chip key={f} label={f} active={rangeFilter === f} onClick={() => setRangeFilter(f)} />
              ))}
            </div>
            <span className="ml-auto text-gray-500 dark:text-gray-400">
              Showing {filtered.length} of {jobs.length}
            </span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div role="table" aria-label="Processed resumes" className="min-w-[960px]">
              <div role="row" className={`${GRID_CLASS} border-b border-gray-200 text-xs font-medium text-gray-500 dark:border-gray-800 dark:text-gray-400`}>
                {["Job", "Submitted", "Status", "JD match", "Documents", "Tracker"].map((h) => (
                  <span key={h} role="columnheader">
                    {h}
                  </span>
                ))}
              </div>
              {filtered.map((job) => (
                <ResumeRow
                  key={job.id}
                  job={job}
                  tracked={trackedNow[job.id] ?? job.tracked_job}
                  busy={busyId === job.id}
                  onTrack={() => handleTrack(job)}
                  onRetry={() => handleRetry(job)}
                />
              ))}
              {filtered.length === 0 && (
                <div className="px-5 py-12 text-center text-gray-500 dark:text-gray-400">
                  No resumes match these filters.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
