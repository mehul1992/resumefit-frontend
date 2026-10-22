import { useState } from "react";
import type React from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { useModal } from "../../hooks/useModal";
import { useTrackedJobs } from "../../hooks/useTrackedJobs";
import { jobTrackerApi, TrackerError, type JobStage, type TrackedJob } from "../../api/jobTracker";
import { formatShortDate, STAGE_DOT_CLASS, STAGE_LABEL, STAGES } from "../../lib/jobDisplay";
import AddJobModal from "./AddJobModal";

// Stages a card can still move forward from; Offer and Rejected are final.
const MOVABLE: JobStage[] = ["saved", "applied", "interview"];
const RESPONDED: JobStage[] = ["interview", "offer", "rejected"];
const DRAG_TYPE = "text/plain";

function stats(jobs: TrackedJob[]) {
  const sent = jobs.filter((j) => j.stage !== "saved");
  const responded = sent.filter((j) => RESPONDED.includes(j.stage));
  return [
    { label: "Jobs tracked", value: String(jobs.length) },
    { label: "Applications sent", value: String(sent.length) },
    { label: "In interview", value: String(jobs.filter((j) => j.stage === "interview").length) },
    { label: "Response rate", value: sent.length ? `${Math.round((responded.length / sent.length) * 100)}%` : "0%" },
  ];
}

function CvChip({ job }: { job: TrackedJob }) {
  if (job.tailoring_job_id === null || job.cv_status === null) return null;
  if (job.cv_status === "pending" || job.cv_status === "processing") {
    return <span className="text-xs text-gray-400">CV processing…</span>;
  }
  if (job.cv_status === "failed") {
    return <span className="text-xs text-error-700 dark:text-error-500">CV failed</span>;
  }
  return (
    <Link
      to={`/resumes/${job.tailoring_job_id}`}
      className="rounded-full bg-brand-50 px-2.5 py-[3px] text-xs font-medium text-brand-800 hover:bg-brand-100 dark:bg-brand-500/15 dark:text-brand-400"
    >
      CV{job.match_score !== null ? ` · ${job.match_score}%` : ""}
    </Link>
  );
}

interface JobCardProps {
  job: TrackedJob;
  busy: boolean;
  dragging: boolean;
  onMove: (to: JobStage) => void;
  onDragStart: () => void;
  onDragEnd: () => void;
}

function JobCard({ job, busy, dragging, onMove, onDragStart, onDragEnd }: JobCardProps) {
  const next = MOVABLE.includes(job.stage) ? STAGES[STAGES.indexOf(job.stage) + 1] : null;
  // A card dragged back to Saved keeps its applied_at, but reads as saved again.
  const date =
    job.stage !== "saved" && job.applied_at
      ? `Applied ${formatShortDate(job.applied_at)}`
      : `Saved ${formatShortDate(job.created_at)}`;

  return (
    <li
      draggable={!busy}
      onDragStart={(e) => {
        e.dataTransfer.effectAllowed = "move";
        // Firefox won't start a drag without data set.
        e.dataTransfer.setData(DRAG_TYPE, String(job.id));
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      className={`flex cursor-grab flex-col gap-2.5 rounded-xl border border-gray-200 bg-white p-3.5 transition-opacity duration-150 active:cursor-grabbing dark:border-gray-800 dark:bg-gray-900 ${
        dragging ? "opacity-50" : ""
      }`}
    >
      <div className="flex flex-col gap-0.5">
        <span className="font-semibold leading-[1.35] text-gray-900 dark:text-white/90">{job.role}</span>
        <span className="text-[13px] text-gray-500 dark:text-gray-400">{job.company}</span>
      </div>
      {job.note && <span className="text-[13px] text-gray-700 dark:text-gray-300">{job.note}</span>}
      <div className="flex flex-wrap items-center gap-2">
        <CvChip job={job} />
        <span className="ml-auto text-xs text-gray-400">{date}</span>
      </div>
      {next && (
        <button
          type="button"
          onClick={() => onMove(next)}
          disabled={busy}
          className="h-8 rounded-lg border border-gray-300 bg-white text-[13px] font-medium text-gray-700 transition-colors duration-150 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]"
        >
          Move to {STAGE_LABEL[next]} →
        </button>
      )}
    </li>
  );
}

export default function JobTracker() {
  const { token, clearAuth } = useAuth();
  const { jobs, loading, error, setJobs, refetch } = useTrackedJobs();
  const { isOpen, openModal, closeModal } = useModal();
  const [busyId, setBusyId] = useState<number | null>(null);
  const [moveError, setMoveError] = useState<string | null>(null);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dropStage, setDropStage] = useState<JobStage | null>(null);

  const draggingJob = jobs.find((j) => j.id === draggingId) ?? null;

  function endDrag() {
    setDraggingId(null);
    setDropStage(null);
  }

  function handleDrop(event: React.DragEvent, stage: JobStage) {
    event.preventDefault();
    const id = Number(event.dataTransfer.getData(DRAG_TYPE));
    const job = jobs.find((j) => j.id === id);
    endDrag();
    if (job && job.stage !== stage) handleMove(job, stage);
  }

  async function handleMove(job: TrackedJob, stage: JobStage) {
    if (!token) return clearAuth();
    setBusyId(job.id);
    setMoveError(null);
    // Move the card (and the stats) right away; roll back if the save fails.
    setJobs((prev) => prev.map((j) => (j.id === job.id ? { ...j, stage } : j)));
    try {
      const updated = await jobTrackerApi.updateJob(job.id, { stage }, token);
      setJobs((prev) => prev.map((j) => (j.id === job.id ? updated : j)));
    } catch (err) {
      setJobs((prev) => prev.map((j) => (j.id === job.id ? job : j)));
      if (err instanceof TrackerError && err.kind === "unauthorized") return clearAuth();
      setMoveError(err instanceof Error ? err.message : "Couldn't move the job.");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <>
      <PageMeta title="Job Tracker | ResumeFit" description="Track the jobs you're applying for" />
      <PageBreadCrumb pageTitle="Job Tracker" />

      <div className="flex flex-col gap-5 text-sm">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <dl className="flex flex-wrap gap-3">
            {stats(jobs).map((s) => (
              <div key={s.label} className="flex min-w-[120px] flex-col-reverse rounded-2xl border border-gray-200 bg-white px-5 py-3 dark:border-gray-800 dark:bg-white/[0.03]">
                <dt className="text-[13px] text-gray-500 dark:text-gray-400">{s.label}</dt>
                <dd className="text-[22px] font-semibold text-gray-900 dark:text-white/90">{loading ? "–" : s.value}</dd>
              </div>
            ))}
          </dl>
          <button
            type="button"
            onClick={openModal}
            className="h-11 rounded-lg bg-brand-500 px-[18px] font-medium text-white transition-colors duration-150 hover:bg-brand-600"
          >
            + Add job
          </button>
        </div>

        {(error || moveError) && (
          <div role="alert" className="flex items-start justify-between gap-3 rounded-xl border border-error-200 bg-error-50 p-4 text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
            <p>{error?.message ?? moveError}</p>
            {error && (
              <button onClick={refetch} className="shrink-0 text-xs font-semibold underline hover:no-underline">
                Retry
              </button>
            )}
          </div>
        )}

        {!loading && !error && jobs.length === 0 && (
          <p className="text-gray-500 dark:text-gray-400">
            No jobs tracked yet. Use <span className="font-medium">Save to tracker</span> on a tailored resume, or add
            one here.
          </p>
        )}

        <div className="overflow-x-auto">
          <div className="grid min-w-[1000px] grid-cols-5 items-start gap-3.5">
            {STAGES.map((stage) => {
              const cards = jobs.filter((j) => j.stage === stage);
              // Only other columns accept the card being dragged.
              const accepts = draggingJob !== null && draggingJob.stage !== stage;
              return (
                <section
                  key={stage}
                  aria-labelledby={`stage-${stage}`}
                  onDragOver={(e) => {
                    if (!accepts) return;
                    e.preventDefault();
                    e.dataTransfer.dropEffect = "move";
                    if (dropStage !== stage) setDropStage(stage);
                  }}
                  onDragLeave={(e) => {
                    // Ignore leaving into the column's own children.
                    if (!e.currentTarget.contains(e.relatedTarget as Node | null) && dropStage === stage) {
                      setDropStage(null);
                    }
                  }}
                  onDrop={(e) => handleDrop(e, stage)}
                  className={`flex min-h-[420px] flex-col gap-2.5 rounded-2xl p-3 transition-colors duration-150 ${
                    dropStage === stage
                      ? "bg-brand-50 ring-2 ring-brand-300 ring-inset dark:bg-brand-500/10 dark:ring-brand-500/40"
                      : "bg-gray-100 dark:bg-white/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-2 px-1.5 py-1">
                    <span aria-hidden="true" className={`h-2 w-2 rounded-full ${STAGE_DOT_CLASS[stage]}`} />
                    <h3 id={`stage-${stage}`} className="font-semibold text-gray-900 dark:text-white/90">
                      {STAGE_LABEL[stage]}
                    </h3>
                    <span className="ml-auto rounded-full bg-white px-2 py-0.5 text-xs font-medium text-gray-600 dark:bg-gray-900 dark:text-gray-400">
                      <span className="sr-only">Jobs: </span>
                      {cards.length}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-2.5">
                    {cards.map((job) => (
                      <JobCard
                        key={job.id}
                        job={job}
                        busy={busyId === job.id}
                        dragging={draggingId === job.id}
                        onMove={(to) => handleMove(job, to)}
                        onDragStart={() => setDraggingId(job.id)}
                        onDragEnd={endDrag}
                      />
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
        </div>
      </div>

      <AddJobModal isOpen={isOpen} onClose={closeModal} onAdded={(job) => setJobs((prev) => [job, ...prev])} />
    </>
  );
}
