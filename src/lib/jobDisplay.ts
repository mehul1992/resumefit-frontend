// Labels and colours shared by Processed Resumes, Tailor Result and Job Tracker.
import type { Coverage, JobStage, TailoringJobStatus } from "../api/resumeTailoring";

export const PILL_CLASS = "inline-flex rounded-full px-2.5 py-[3px] text-xs font-medium";

export const STAGES: JobStage[] = ["saved", "applied", "interview", "offer", "rejected"];

export const STAGE_LABEL: Record<JobStage, string> = {
  saved: "Saved",
  applied: "Applied",
  interview: "Interview",
  offer: "Offer",
  rejected: "Rejected",
};

export const STAGE_CHIP_CLASS: Record<JobStage, string> = {
  saved: "bg-gray-100 text-gray-600 dark:bg-white/5 dark:text-gray-400",
  applied: "bg-brand-50 text-brand-800 dark:bg-brand-500/15 dark:text-brand-400",
  interview: "bg-[#f4ebff] text-[#6927da] dark:bg-theme-purple-500/15 dark:text-theme-purple-500",
  offer: "bg-success-50 text-success-800 dark:bg-success-500/15 dark:text-success-500",
  rejected: "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-500",
};

export const STAGE_DOT_CLASS: Record<JobStage, string> = {
  saved: "bg-gray-500",
  applied: "bg-brand-500",
  interview: "bg-theme-purple-500",
  offer: "bg-success-500",
  rejected: "bg-error-500",
};

export const RUN_STATUS: Record<TailoringJobStatus, { label: string; className: string }> = {
  completed: {
    label: "Completed",
    className: "bg-success-50 text-success-800 dark:bg-success-500/15 dark:text-success-500",
  },
  pending: {
    label: "Pending",
    className: "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-500",
  },
  processing: {
    label: "Processing",
    className: "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-500",
  },
  failed: {
    label: "Failed",
    className: "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-500",
  },
};

export const COVERAGE_LABEL: Record<Coverage, string> = {
  covered: "Covered",
  partial: "Partial",
  missing: "Missing",
};

export const COVERAGE_CLASS: Record<Coverage, string> = {
  covered: "bg-success-50 text-success-800 dark:bg-success-500/15 dark:text-success-500",
  partial: "bg-warning-50 text-warning-700 dark:bg-warning-500/15 dark:text-warning-500",
  missing: "bg-error-50 text-error-700 dark:bg-error-500/15 dark:text-error-500",
};

// "21 Oct 2026, 21:18" — en-GB gives day-first dates and a 24h clock.
const SUBMITTED_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

const SHORT_DATE_FORMAT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

export function formatSubmitted(iso: string): string {
  return SUBMITTED_FORMAT.format(new Date(iso));
}

export function formatShortDate(iso: string): string {
  return SHORT_DATE_FORMAT.format(new Date(iso));
}

export function daysSince(iso: string, now: Date = new Date()): number {
  return (now.getTime() - new Date(iso).getTime()) / 86_400_000;
}

export function jobTitle(role: string | null, id: number): string {
  return role || `Tailored resume #${id}`;
}
