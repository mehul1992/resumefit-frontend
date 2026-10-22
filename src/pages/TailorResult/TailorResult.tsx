import { useState } from "react";
import type React from "react";
import { Link, useParams, useSearchParams } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import { useTailoringResult } from "../../hooks/useTailoringResult";
import { jobTrackerApi, TrackerError } from "../../api/jobTracker";
import { resumeTailoringApi, TailoringError, type TailoringChange } from "../../api/resumeTailoring";
import { formatSubmitted, jobTitle } from "../../lib/jobDisplay";
import ChangesTab from "./ChangesTab";
import GapAnalysisTab from "./GapAnalysisTab";
import ResultRail from "./ResultRail";
import {
  CARD_CLASS,
  OUTLINE_ACTION_CLASS,
  PRIMARY_ACTION_CLASS,
  SAVED_ACTION_CLASS,
} from "./resultStyles";

type Tab = "changes" | "gaps" | "jd";
const TABS: { id: Tab; label: string }[] = [
  { id: "changes", label: "Changes" },
  { id: "gaps", label: "Gap analysis" },
  { id: "jd", label: "Job description" },
];

function isTab(value: string | null): value is Tab {
  return value === "changes" || value === "gaps" || value === "jd";
}

function Breadcrumb({ current }: { current: string }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white/90">Tailored resume</h2>
      <nav aria-label="Breadcrumb">
        <ol className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
          <li>
            <Link to="/">Home</Link>
          </li>
          <li aria-hidden="true">›</li>
          <li>
            <Link to="/resumes">Processed Resumes</Link>
          </li>
          <li aria-hidden="true">›</li>
          <li aria-current="page" className="text-gray-800 dark:text-white/90">
            {current}
          </li>
        </ol>
      </nav>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return <div className={`${CARD_CLASS} p-6 text-center text-gray-500 dark:text-gray-400`}>{children}</div>;
}

export default function TailorResult() {
  const jobId = Number(useParams().id);
  const { token, clearAuth } = useAuth();
  const { result, loading, error, setResult, refetch, refresh } = useTailoringResult(jobId);
  const [searchParams, setSearchParams] = useSearchParams();
  const tab: Tab = isTab(searchParams.get("tab")) ? (searchParams.get("tab") as Tab) : "changes";
  const [busyChangeId, setBusyChangeId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [retrying, setRetrying] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const setTab = (next: Tab) => setSearchParams(next === "changes" ? {} : { tab: next }, { replace: true });

  function handleActionError(err: unknown) {
    if ((err instanceof TailoringError || err instanceof TrackerError) && err.kind === "unauthorized") {
      clearAuth();
      return;
    }
    setActionError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
  }

  async function handleToggle(change: TailoringChange) {
    if (!token) return clearAuth();
    const reverted = !change.reverted;
    setBusyChangeId(change.id);
    setActionError(null);
    // Flip immediately; the server response (or a rollback) settles it.
    setResult((prev) => ({
      ...prev,
      changes: prev.changes.map((c) => (c.id === change.id ? { ...c, reverted } : c)),
    }));
    try {
      const updated = await resumeTailoringApi.setChangeReverted(jobId, change.id, reverted, token);
      setResult(() => updated);
    } catch (err) {
      setResult((prev) => ({
        ...prev,
        changes: prev.changes.map((c) => (c.id === change.id ? { ...c, reverted: change.reverted } : c)),
      }));
      handleActionError(err);
    } finally {
      setBusyChangeId(null);
    }
  }

  async function handleSaveToTracker() {
    if (!token) return clearAuth();
    setSaving(true);
    setActionError(null);
    try {
      const tracked = await jobTrackerApi.createJob({ tailoring_job_id: jobId }, token);
      setResult((prev) => ({ ...prev, tracked_job: { id: tracked.id, stage: tracked.stage } }));
    } catch (err) {
      handleActionError(err);
    } finally {
      setSaving(false);
    }
  }

  async function handleRetry() {
    if (!token) return clearAuth();
    setRetrying(true);
    setActionError(null);
    try {
      await resumeTailoringApi.retryJob(jobId, token);
      await refresh();
    } catch (err) {
      handleActionError(err);
    } finally {
      setRetrying(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <svg className="h-6 w-6 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none" aria-label="Loading">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
        </svg>
      </div>
    );
  }

  if (error || !result) {
    return (
      <>
        <Breadcrumb current="Not found" />
        <Notice>
          <p>{error?.message ?? "This resume could not be found."}</p>
          <div className="mt-3 flex justify-center gap-4 text-sm">
            {error?.kind !== "not_found" && (
              <button type="button" onClick={refetch} className="font-medium text-brand-600 hover:underline">
                Try again
              </button>
            )}
            <Link to="/resumes" className="font-medium text-brand-600 hover:underline">
              Back to Processed Resumes
            </Link>
          </div>
        </Notice>
      </>
    );
  }

  const title = jobTitle(result.role, result.id);
  const completed = result.status === "completed";

  return (
    <>
      <PageMeta title={`${title} | ResumeFit`} description="Review the changes made to your tailored CV" />
      <Breadcrumb current={result.company ?? title} />

      <div className="flex flex-col gap-5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-0.5">
            <h1 className="text-lg font-semibold text-gray-900 dark:text-white/90">{title}</h1>
            <span className="text-gray-500 dark:text-gray-400">
              {result.company ? `${result.company} · ` : ""}submitted {formatSubmitted(result.created_at)}
            </span>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <a href={result.original_resume_download_url} target="_blank" rel="noopener noreferrer" className={OUTLINE_ACTION_CLASS}>
              Original
            </a>
            {completed &&
              (result.tracked_job ? (
                <Link to="/tracker" className={SAVED_ACTION_CLASS}>
                  Saved to tracker ✓
                </Link>
              ) : (
                <button type="button" onClick={handleSaveToTracker} disabled={saving} className={OUTLINE_ACTION_CLASS}>
                  {saving ? "Saving…" : "Save to tracker"}
                </button>
              ))}
            {completed &&
              (result.pdf_up_to_date && result.tailored_resume_download_url ? (
                <a href={result.tailored_resume_download_url} target="_blank" rel="noopener noreferrer" className={PRIMARY_ACTION_CLASS}>
                  Download tailored
                </a>
              ) : (
                <button type="button" disabled className={PRIMARY_ACTION_CLASS}>
                  Updating PDF…
                </button>
              ))}
          </div>
        </div>

        {actionError && (
          <p role="alert" className="rounded-xl border border-error-200 bg-error-50 p-3 text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
            {actionError}
          </p>
        )}

        {result.status === "pending" || result.status === "processing" ? (
          <Notice>Your CV is still being tailored — this page updates automatically.</Notice>
        ) : result.status === "failed" ? (
          <Notice>
            <p className="text-error-700 dark:text-error-500">{result.error_message ?? "Tailoring failed."}</p>
            <button type="button" onClick={handleRetry} disabled={retrying} className={`${OUTLINE_ACTION_CLASS} mt-4`}>
              {retrying ? "Retrying…" : "Retry"}
            </button>
          </Notice>
        ) : (
          <>
            <div role="tablist" aria-label="Result sections" className="flex gap-1 border-b border-gray-200 dark:border-gray-800">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  role="tab"
                  id={`tab-${t.id}`}
                  aria-selected={tab === t.id}
                  aria-controls="result-panel"
                  onClick={() => setTab(t.id)}
                  className={`-mb-px border-b-2 px-4 py-3 font-medium transition-colors duration-150 ${
                    tab === t.id
                      ? "border-brand-500 text-brand-500 dark:text-brand-400"
                      : "border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-start gap-5">
              <div id="result-panel" role="tabpanel" aria-labelledby={`tab-${tab}`} className="flex min-w-0 flex-[999_1_560px] flex-col gap-4">
                {tab === "jd" ? (
                  <div className={`${CARD_CLASS} flex flex-col gap-3 p-6`}>
                    <span className="font-semibold text-gray-900 dark:text-white/90">
                      {title}
                      {result.company ? ` — ${result.company}` : ""}
                    </span>
                    <pre className="m-0 whitespace-pre-wrap font-[inherit] leading-[1.65] text-gray-700 dark:text-gray-300">
                      {result.job_description}
                    </pre>
                  </div>
                ) : !result.has_analysis ? (
                  <Notice>
                    Change tracking and gap analysis aren't available for this run — it was tailored before they
                    existed. Tailor the CV again to see them.
                  </Notice>
                ) : tab === "gaps" ? (
                  <GapAnalysisTab requirements={result.requirements} />
                ) : (
                  <ChangesTab changes={result.changes} busyId={busyChangeId} onToggle={handleToggle} />
                )}
              </div>
              {result.has_analysis && <ResultRail result={result} onViewGaps={() => setTab("gaps")} />}
            </div>
          </>
        )}
      </div>
    </>
  );
}
