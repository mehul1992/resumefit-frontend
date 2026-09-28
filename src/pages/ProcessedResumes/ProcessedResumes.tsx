import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "../../components/ui/table";
import Badge from "../../components/ui/badge/Badge";
import { useTailoringJobs } from "../../hooks/useTailoringJobs";
import type { TailoringJobListItem, TailoringJobStatus } from "../../api/resumeTailoring";

const STATUS_BADGE: Record<TailoringJobStatus, { color: "warning" | "info" | "success" | "error"; label: string }> = {
  pending: { color: "warning", label: "Pending" },
  processing: { color: "info", label: "Processing" },
  completed: { color: "success", label: "Completed" },
  failed: { color: "error", label: "Failed" },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function JobRow({ job }: { job: TailoringJobListItem }) {
  const { color, label } = STATUS_BADGE[job.status];

  return (
    <TableRow>
      <TableCell className="px-5 py-4 sm:px-6 text-start text-gray-500 text-theme-sm dark:text-gray-400">
        {formatDate(job.created_at)}
      </TableCell>
      <TableCell className="px-4 py-3 text-start">
        <Badge size="sm" color={color}>
          {label}
        </Badge>
        {job.status === "failed" && job.error_message && (
          <p className="mt-1 text-xs text-error-500">{job.error_message}</p>
        )}
      </TableCell>
      <TableCell className="px-4 py-3 text-start text-theme-sm">
        <a
          href={job.original_resume_download_url}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-brand-500 hover:text-brand-600"
        >
          Download
        </a>
      </TableCell>
      <TableCell className="px-4 py-3 text-start text-theme-sm">
        {job.tailored_resume_download_url ? (
          <a
            href={job.tailored_resume_download_url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-brand-500 hover:text-brand-600"
          >
            Download
          </a>
        ) : (
          <span className="text-gray-400">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}

export default function ProcessedResumes() {
  const { jobs, loading, error, refetch } = useTailoringJobs();

  return (
    <>
      <PageMeta
        title="Processed Resumes | ResumeFit"
        description="View and download your tailored resumes"
      />
      <PageBreadCrumb pageTitle="Processed Resumes" />

      {error && (
        <div className="flex items-start justify-between gap-3 p-4 mb-6 text-sm rounded-xl border text-error-700 bg-error-50 border-error-200 dark:bg-error-500/15 dark:border-error-500/30 dark:text-error-400">
          <div className="flex items-start gap-3">
            <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-4.75a.75.75 0 001.5 0v-4.5a.75.75 0 00-1.5 0v4.5zm.75-7a.75.75 0 100 1.5.75.75 0 000-1.5z"
              />
            </svg>
            <p>{error.message}</p>
          </div>
          <button
            onClick={refetch}
            className="shrink-0 text-xs font-semibold underline hover:no-underline"
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="w-6 h-6 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : error ? null : jobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <p className="text-gray-500 dark:text-gray-400">You haven't tailored any resumes yet.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white dark:border-white/[0.05] dark:bg-white/[0.03]">
          <div className="max-w-full overflow-x-auto">
            <Table>
              <TableHeader className="border-b border-gray-100 dark:border-white/[0.05]">
                <TableRow>
                  <TableCell
                    isHeader
                    className="px-5 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Submitted
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Status
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Original Resume
                  </TableCell>
                  <TableCell
                    isHeader
                    className="px-4 py-3 font-medium text-gray-500 text-start text-theme-xs dark:text-gray-400"
                  >
                    Tailored Resume
                  </TableCell>
                </TableRow>
              </TableHeader>
              <TableBody className="divide-y divide-gray-100 dark:divide-white/[0.05]">
                {jobs.map((job) => (
                  <JobRow key={job.id} job={job} />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </>
  );
}
