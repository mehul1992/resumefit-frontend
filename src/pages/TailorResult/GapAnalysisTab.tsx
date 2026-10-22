import { Link } from "react-router";
import type { Coverage, RequirementCoverage } from "../../api/resumeTailoring";
import { COVERAGE_CLASS, COVERAGE_LABEL, PILL_CLASS } from "../../lib/jobDisplay";
import { CARD_CLASS, LINK_CLASS } from "./resultStyles";

const TILE_NUMBER_CLASS: Record<Coverage, string> = {
  covered: "text-success-500",
  partial: "text-warning-500",
  missing: "text-error-500",
};

const ACTION_LINK: Record<RequirementCoverage["action"], { label: string; to: string } | null> = {
  // New project → open the Add Project form; a missing metric means editing an existing one.
  add_project: { label: "Add project", to: "/projects?new=1" },
  add_metric: { label: "Add a metric", to: "/projects" },
  none: null,
};

const ROW_GRID_CLASS = "grid grid-cols-[2.4fr_0.8fr_1fr_2fr_1.2fr] items-center gap-3.5 px-5 py-3.5";

export default function GapAnalysisTab({ requirements }: { requirements: RequirementCoverage[] }) {
  const counts = { covered: 0, partial: 0, missing: 0 };
  for (const r of requirements) counts[r.status] += 1;

  return (
    <>
      <div className="grid grid-cols-3 gap-3">
        {(Object.keys(counts) as Coverage[]).map((c) => (
          <div key={c} className={`${CARD_CLASS} flex flex-col gap-0.5 px-5 py-4`}>
            <span className={`text-[26px] font-semibold ${TILE_NUMBER_CLASS[c]}`}>{counts[c]}</span>
            <span className="text-gray-600 dark:text-gray-400">{COVERAGE_LABEL[c]}</span>
          </div>
        ))}
      </div>
      <section aria-labelledby="gap-title" className={`${CARD_CLASS} overflow-hidden`}>
        <div className="border-b border-gray-200 px-5 py-4 dark:border-gray-800">
          <h3 id="gap-title" className="font-semibold text-gray-900 dark:text-white/90">
            Job requirements vs your projects
          </h3>
          <p className="mt-0.5 text-[13px] text-gray-500 dark:text-gray-400">
            Close gaps by adding a project or sharpening an existing one, then re-tailor.
          </p>
        </div>
        <div className="overflow-x-auto">
          <div role="table" aria-labelledby="gap-title" className="min-w-[640px]">
            {requirements.map((r, i) => {
              const action = ACTION_LINK[r.action];
              return (
                <div key={i} role="row" className={`${ROW_GRID_CLASS} border-b border-gray-100 last:border-b-0 dark:border-white/[0.05]`}>
                  <span role="cell" className="font-medium text-gray-900 dark:text-white/90">{r.requirement}</span>
                  <span role="cell" className="text-xs text-gray-500 dark:text-gray-400">
                    {r.importance === "must" ? "Must" : "Nice to have"}
                  </span>
                  <span role="cell">
                    <span className={`${PILL_CLASS} ${COVERAGE_CLASS[r.status]}`}>{COVERAGE_LABEL[r.status]}</span>
                  </span>
                  <span role="cell" className="text-[13px] text-gray-600 dark:text-gray-400">{r.evidence}</span>
                  <span role="cell">
                    {action && r.status !== "covered" && (
                      <Link to={action.to} className={`${LINK_CLASS} text-[13px]`}>
                        {action.label} ›
                      </Link>
                    )}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
