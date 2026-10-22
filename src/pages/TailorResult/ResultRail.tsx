import type { TailoringResult } from "../../api/resumeTailoring";
import { COVERAGE_CLASS, PILL_CLASS } from "../../lib/jobDisplay";
import { CARD_CLASS, UPPER_LABEL_CLASS } from "./resultStyles";

function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? "" : "s"}`;
}

function listNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export default function ResultRail({ result, onViewGaps }: { result: TailoringResult; onViewGaps: () => void }) {
  const after = result.match_after;
  const before = result.match_before;
  const covered = result.requirements.filter((r) => r.status === "covered").length;
  const gaps = result.requirements.filter((r) => r.status !== "covered");
  const applied = result.changes.filter((c) => !c.reverted);
  const projectsUsed = new Set(
    applied.map((c) => c.source_project_id).filter((id): id is number => id !== null)
  ).size;
  const strong = after !== null && after >= 80;

  return (
    <aside aria-label="Match summary" className="flex max-w-[320px] flex-[1_1_280px] flex-col gap-4">
      {after !== null && (
        <section className={`${CARD_CLASS} flex flex-col gap-3.5 p-5`}>
          <h3 className={UPPER_LABEL_CLASS}>JD match</h3>
          <div className="flex items-baseline gap-2.5">
            <span className={`text-[40px] font-semibold leading-none ${strong ? "text-success-500" : "text-warning-500"}`}>
              {after}%
            </span>
            {before !== null && <span className="text-gray-500 dark:text-gray-400">was {before}% before tailoring</span>}
          </div>
          <div
            role="meter"
            aria-label="JD match"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={after}
            className="relative h-2 rounded-full bg-gray-100 dark:bg-white/10"
          >
            <div
              className={`absolute inset-y-0 left-0 rounded-full ${strong ? "bg-success-500" : "bg-warning-500"}`}
              style={{ width: `${after}%` }}
            />
            {before !== null && (
              <div
                aria-hidden="true"
                className="absolute -top-[3px] h-3.5 w-0.5 bg-gray-900 dark:bg-white"
                style={{ left: `${before}%` }}
              />
            )}
          </div>
          <span className="text-gray-600 dark:text-gray-400">
            {covered} of {plural(result.requirements.length, "requirement")} fully covered ·{" "}
            {plural(applied.length, "bullet")} rewritten · {plural(projectsUsed, "project")} used
          </span>
        </section>
      )}

      {result.keywords.length > 0 && (
        <section className={`${CARD_CLASS} flex flex-col gap-3 p-5`}>
          <h3 className={UPPER_LABEL_CLASS}>Keywords</h3>
          <ul className="flex flex-wrap gap-1.5">
            {result.keywords.map((k) => (
              <li key={k.label} className={`${PILL_CLASS} ${COVERAGE_CLASS[k.coverage]}`}>
                {k.label}
                <span className="sr-only"> ({k.coverage})</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {gaps.length > 0 && (
        <section className="flex flex-col gap-2 rounded-2xl border border-warning-200 bg-warning-50 px-5 py-[18px] dark:border-warning-500/30 dark:bg-warning-500/10">
          <h3 className="font-semibold text-warning-900 dark:text-warning-400">
            {plural(gaps.length, "gap")} could lift your match
          </h3>
          <p className="text-warning-800 dark:text-warning-500">
            {listNames(gaps.slice(0, 3).map((g) => g.requirement))}
            {gaps.length > 3 ? ` and ${gaps.length - 3} more` : ""}{" "}
            {gaps.length === 1 ? "isn't" : "aren't"} fully covered by your projects.
          </p>
          <button
            type="button"
            onClick={onViewGaps}
            className="self-start p-0 font-medium text-warning-700 hover:underline dark:text-warning-500"
          >
            View gap analysis ›
          </button>
        </section>
      )}
    </aside>
  );
}
