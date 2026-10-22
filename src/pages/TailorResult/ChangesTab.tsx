import type { DiffSegment, TailoringChange } from "../../api/resumeTailoring";
import { CARD_CLASS, SMALL_BUTTON_CLASS, UPPER_LABEL_CLASS } from "./resultStyles";

const SEGMENT_CLASS: Record<DiffSegment["kind"], string> = {
  same: "",
  removed: "rounded-[3px] bg-error-50 text-error-700 line-through dark:bg-error-500/15 dark:text-error-400",
  added: "rounded-[3px] bg-success-100 text-success-800 dark:bg-success-500/20 dark:text-success-400",
};

function Segments({ segments }: { segments: DiffSegment[] }) {
  return (
    <>
      {segments.map((s, i) => (
        <span key={i} className={SEGMENT_CLASS[s.kind]}>
          {s.text}
        </span>
      ))}
    </>
  );
}

interface ChangesTabProps {
  changes: TailoringChange[];
  busyId: string | null;
  onToggle: (change: TailoringChange) => void;
}

export default function ChangesTab({ changes, busyId, onToggle }: ChangesTabProps) {
  if (changes.length === 0) {
    return (
      <div className={`${CARD_CLASS} p-6 text-center text-gray-500 dark:text-gray-400`}>
        No rewrites were needed — your CV already covered this job description.
      </div>
    );
  }

  return (
    <>
      <div aria-hidden="true" className={`grid grid-cols-2 gap-4 px-1 ${UPPER_LABEL_CLASS}`}>
        <span>Original</span>
        <span>Tailored</span>
      </div>
      {changes.map((change) => {
        // A reverted change shows the original text, unhighlighted, on both sides.
        const originalText = change.original_segments.map((s) => s.text).join("");
        return (
          <article key={change.id} aria-label={change.section} className={`${CARD_CLASS} overflow-hidden`}>
            <div className="border-b border-gray-200 bg-gray-50 px-4 py-2.5 text-xs font-medium text-gray-600 dark:border-gray-800 dark:bg-white/[0.02] dark:text-gray-400">
              {change.section}
            </div>
            <div className="grid grid-cols-2">
              <p className="m-0 border-r border-gray-200 p-4 leading-relaxed text-gray-600 dark:border-gray-800 dark:text-gray-400">
                <span className="sr-only">Original: </span>
                {change.original_segments.length ? <Segments segments={change.original_segments} /> : <em className="text-gray-400">Not in original CV</em>}
              </p>
              <p className="m-0 p-4 leading-relaxed text-gray-900 dark:text-white/90">
                <span className="sr-only">Tailored: </span>
                {change.reverted ? originalText || <em className="text-gray-400">Removed</em> : <Segments segments={change.tailored_segments} />}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 border-t border-gray-100 px-4 py-2.5 text-[13px] text-gray-500 dark:border-white/[0.05] dark:text-gray-400">
              <span>Source:</span>
              <span className="rounded-full bg-brand-50 px-2.5 py-[3px] text-xs font-medium text-brand-800 dark:bg-brand-500/15 dark:text-brand-400">
                {change.source_label}
              </span>
              <span
                className={`ml-auto text-xs font-medium ${
                  change.reverted ? "text-warning-700 dark:text-warning-500" : "text-success-800 dark:text-success-500"
                }`}
              >
                {change.reverted ? "Reverted to original" : "Applied"}
              </span>
              <button
                type="button"
                onClick={() => onToggle(change)}
                disabled={busyId === change.id}
                className={SMALL_BUTTON_CLASS}
              >
                {change.reverted ? "Re-apply" : "Revert"}
              </button>
            </div>
          </article>
        );
      })}
    </>
  );
}
