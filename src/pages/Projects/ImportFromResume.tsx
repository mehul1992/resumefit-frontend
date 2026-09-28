import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import {
  projectsApi,
  ProjectsError,
  type ExtractedProjectCandidate,
} from "../../api/projects";
import TechChipsInput from "./TechChipsInput";

interface CandidateRow extends ExtractedProjectCandidate {
  selected: boolean;
  editing: boolean;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_DESCRIPTION_LENGTH = 240;

function StepBar({ current }: { current: 1 | 2 }) {
  const steps: { number: 1 | 2; label: string }[] = [
    { number: 1, label: "Upload PDF" },
    { number: 2, label: "Review & select" },
  ];
  return (
    <div className="mb-8 flex items-center justify-center gap-3">
      {steps.map((step, i) => {
        const reached = current >= step.number;
        return (
          <div key={step.number} className="flex items-center gap-3">
            <div className="flex flex-col items-center gap-1.5">
              <div
                className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-semibold transition-colors ${
                  reached
                    ? "bg-brand-500 text-white"
                    : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                }`}
              >
                {step.number}
              </div>
              <span
                className={`whitespace-nowrap text-xs font-medium ${
                  reached ? "text-brand-500" : "text-gray-400"
                }`}
              >
                {step.label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`-mt-5 w-24 border-t-2 ${
                  current > step.number ? "border-brand-500" : "border-gray-200 dark:border-gray-700"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function ImportFromResume() {
  const { token, clearAuth } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [rows, setRows] = useState<CandidateRow[]>([]);
  const [extracting, setExtracting] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = (f: File) => {
    if (f.type !== "application/pdf") {
      setError("Please upload a PDF file.");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError("File is too large — max 5 MB.");
      return;
    }
    setError(null);
    setFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const runExtraction = async () => {
    if (!file) return;
    if (!token) {
      clearAuth();
      return;
    }
    setExtracting(true);
    setError(null);
    try {
      const { candidates } = await projectsApi.extractResume(file, token);
      setRows(candidates.map((c) => ({ ...c, selected: true, editing: false })));
      setStep(2);
    } catch (err) {
      const projectsError =
        err instanceof ProjectsError
          ? err
          : new ProjectsError(
              "server_error",
              "extract_resume",
              "Something went wrong. Please try again."
            );
      if (projectsError.kind === "unauthorized") {
        clearAuth();
        return;
      }
      setError(projectsError.message);
    } finally {
      setExtracting(false);
    }
  };

  const toggleSelected = (index: number) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, selected: !r.selected } : r)));
  };

  const toggleEditing = (index: number) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, editing: !r.editing } : r)));
  };

  const updateDescription = (index: number, description: string) => {
    setRows((prev) =>
      prev.map((r, i) => (i === index ? { ...r, description: description.slice(0, MAX_DESCRIPTION_LENGTH) } : r))
    );
  };

  const updateTech = (index: number, tech: string[]) => {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, tech } : r)));
  };

  const selectedRows = rows.filter((r) => r.selected);
  const techSuggestions = Array.from(new Set(rows.flatMap((r) => r.tech)));

  const handleReplaceFile = () => {
    setStep(1);
    setFile(null);
    setRows([]);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!token) {
      clearAuth();
      return;
    }
    const invalid = selectedRows.some(
      (r) => r.description.trim().length === 0 || r.tech.length === 0
    );
    if (invalid) {
      setError("Each selected project needs a description and at least one tech tag.");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await projectsApi.bulkCreateProjects(
        selectedRows.map((r) => ({ description: r.description.trim(), tech: r.tech })),
        "resume_import",
        token
      );
      navigate("/projects");
    } catch (err) {
      const projectsError =
        err instanceof ProjectsError
          ? err
          : new ProjectsError("server_error", "bulk_create", "Something went wrong. Please try again.");
      if (projectsError.kind === "unauthorized") {
        clearAuth();
        return;
      }
      setError(projectsError.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <PageMeta
        title="Import from Resume | ResumeFit"
        description="Extract reusable project bullets from your resume"
      />
      <PageBreadCrumb pageTitle="Import from Resume" />

      <StepBar current={step} />

      <div className="mx-auto max-w-3xl">
        {error && (
          <div className="mb-4 flex items-start gap-3 rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
            <p className="flex-1">{error}</p>
            <button
              onClick={() => setError(null)}
              className="shrink-0 text-xs font-semibold underline hover:no-underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {step === 1 && (
          <>
            <div
              onClick={() => inputRef.current?.click()}
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={handleDrop}
              className={`mb-6 flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed p-10 transition-colors ${
                dragging
                  ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                  : "border-gray-200 hover:border-brand-400 hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-800"
              }`}
            >
              <div className="text-center text-sm text-gray-500 dark:text-gray-400">
                <span className="font-medium text-brand-500">Click to upload</span> or drag and drop
                <p className="mt-1 text-xs text-gray-400">PDF up to 5 MB</p>
              </div>
              <input
                ref={inputRef}
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFile(f);
                }}
              />
            </div>

            {file && (
              <div className="mb-6 flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-xs font-semibold text-brand-500 dark:bg-brand-500/10">
                    PDF
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-800 dark:text-white">{file.name}</p>
                    <p className="text-xs text-gray-400">{(file.size / 1024).toFixed(0)} KB</p>
                  </div>
                </div>
                <button onClick={() => setFile(null)} className="text-gray-400 hover:text-error-500">
                  Remove
                </button>
              </div>
            )}

            <div className="flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-800">
              <button
                onClick={() => navigate("/projects")}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={runExtraction}
                disabled={!file || extracting}
                className="rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {extracting ? "Parsing…" : "Continue"}
              </button>
            </div>
          </>
        )}

        {step === 2 && file && (
          <>
            <div className="mb-4 flex items-center gap-3.5 rounded-xl border border-gray-200 bg-white px-4 py-3.5 dark:border-gray-700 dark:bg-gray-900">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-xs font-semibold text-brand-500 dark:bg-brand-500/10">
                PDF
              </div>
              <p className="flex-1 text-sm text-gray-700 dark:text-gray-300">
                {file.name} — parsed, <strong>{rows.length} project{rows.length === 1 ? "" : "s"} found</strong>
              </p>
              <button onClick={handleReplaceFile} className="text-sm text-brand-500 hover:underline">
                Replace file
              </button>
            </div>
            <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
              We extracted these from your resume. Uncheck any you don't want, edit the tech chips,
              then add them.
            </p>

            <div className="mb-5 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
              {rows.map((row, index) => (
                <div
                  key={index}
                  className={`flex items-start gap-3.5 border-b border-gray-100 px-5 py-4 last:border-0 dark:border-white/[0.05] ${
                    row.selected ? "" : "bg-gray-50 opacity-60 dark:bg-white/[0.02]"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={row.selected}
                    onChange={() => toggleSelected(index)}
                    className="mt-1 h-4 w-4 rounded border-gray-300 text-brand-500"
                  />
                  <div className="min-w-0 flex-1">
                    {row.editing ? (
                      <textarea
                        autoFocus
                        rows={2}
                        value={row.description}
                        onChange={(e) => updateDescription(index, e.target.value)}
                        onBlur={() => toggleEditing(index)}
                        maxLength={MAX_DESCRIPTION_LENGTH}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none dark:border-gray-700 dark:bg-gray-900 dark:text-white"
                      />
                    ) : (
                      <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                        {row.description}
                      </p>
                    )}
                    <div className="mt-2">
                      <TechChipsInput
                        value={row.tech}
                        onChange={(t) => updateTech(index, t)}
                        suggestions={techSuggestions}
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => toggleEditing(index)}
                    title="Edit description"
                    className="text-gray-400 hover:text-brand-500"
                  >
                    ✎
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-800">
              <p className="text-sm text-gray-400">
                {selectedRows.length} of {rows.length} selected
              </p>
              <div className="flex gap-2.5">
                <button
                  onClick={() => navigate("/projects")}
                  className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={selectedRows.length === 0 || submitting}
                  className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Adding…" : `Add ${selectedRows.length} Project${selectedRows.length === 1 ? "" : "s"}`}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </>
  );
}
