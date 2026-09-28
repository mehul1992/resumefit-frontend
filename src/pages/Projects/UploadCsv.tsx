import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import { useAuth } from "../../context/AuthContext";
import { projectsApi, ProjectsError } from "../../api/projects";

const MAX_FILE_SIZE = 1 * 1024 * 1024;
const MAX_DESCRIPTION_LENGTH = 240;
const CSV_TEMPLATE =
  'description,tech\n' +
  '"Integrated Celery + RabbitMQ for async background job orchestration, decoupling time-sensitive workflows from the main request path","Celery,RabbitMQ"\n';

interface ParsedRow {
  index: number;
  description: string;
  tech: string[];
  error: string | null;
}

// Minimal RFC4180-ish parser: handles quoted fields, escaped quotes ("")
// inside them, and both \n and \r\n line endings.
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (inQuotes) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += char;
      }
    } else if (char === '"') {
      inQuotes = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  return rows.filter((r) => r.some((cell) => cell.trim().length > 0));
}

function parseProjectsCsv(text: string): ParsedRow[] {
  const rows = parseCsv(text);
  if (rows.length === 0) return [];

  const header = rows[0].map((h) => h.trim().toLowerCase());
  const descriptionIndex = header.indexOf("description");
  const techIndex = header.indexOf("tech");

  return rows.slice(1).map((cols, i) => {
    const description = (descriptionIndex >= 0 ? cols[descriptionIndex] ?? "" : "").trim();
    const tech = (techIndex >= 0 ? cols[techIndex] ?? "" : "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    let error: string | null = null;
    if (!description) {
      error = "empty description — row will be skipped";
    } else if (description.length > MAX_DESCRIPTION_LENGTH) {
      error = `description exceeds ${MAX_DESCRIPTION_LENGTH} characters — row will be skipped`;
    } else if (tech.length === 0) {
      error = "no tech listed — row will be skipped";
    }

    return { index: i + 1, description, tech, error };
  });
}

function downloadTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "projects-template.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function UploadCsv() {
  const { token, clearAuth } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validRows = rows.filter((r) => !r.error);
  const skippedRows = rows.filter((r) => r.error);

  const handleFile = async (f: File) => {
    if (!f.name.toLowerCase().endsWith(".csv") && f.type !== "text/csv") {
      setError("Please upload a CSV file.");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      setError("File is too large — max 1 MB.");
      return;
    }
    setError(null);
    setFile(f);
    const text = await f.text();
    setRows(parseProjectsCsv(text));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  };

  const handleRemove = () => {
    setFile(null);
    setRows([]);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!token) {
      clearAuth();
      return;
    }
    if (validRows.length === 0) return;

    setSubmitting(true);
    setError(null);
    try {
      await projectsApi.bulkCreateProjects(
        validRows.map((r) => ({ description: r.description, tech: r.tech })),
        "csv",
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
      <PageMeta title="Upload CSV | ResumeFit" description="Bulk import projects from a CSV file" />
      <PageBreadCrumb pageTitle="Upload CSV" />

      <div className="mx-auto max-w-3xl">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">Bulk upload projects</h2>
          <button onClick={downloadTemplate} className="text-sm text-brand-500 hover:underline">
            Download CSV template
          </button>
        </div>
        <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
          Columns:{" "}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">description</code>{" "}
          <code className="rounded bg-gray-100 px-1.5 py-0.5 text-xs dark:bg-gray-800">tech</code> (comma-separated)
          — one project per row.
        </p>

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

        {!file && (
          <div
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={`mb-4 flex cursor-pointer items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-8 text-sm transition-colors ${
              dragging
                ? "border-brand-500 bg-brand-50 dark:bg-brand-500/10"
                : "border-gray-300 text-gray-400 hover:border-brand-400 dark:border-gray-700"
            }`}
          >
            <span>
              <span className="font-medium text-brand-500">Click to upload</span> or drag CSV · max 1 MB
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
          </div>
        )}

        {file && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-gray-200 bg-white px-4 py-3 text-sm dark:border-gray-700 dark:bg-gray-900">
            <span className="rounded bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
              CSV
            </span>
            <span className="flex-1 text-gray-700 dark:text-gray-300">
              {file.name} — <strong>{rows.length} row{rows.length === 1 ? "" : "s"} parsed</strong>
              {skippedRows.length > 0 &&
                `, ${skippedRows.length} error${skippedRows.length === 1 ? "" : "s"}`}
            </span>
            <button onClick={handleRemove} className="text-xs text-brand-500 hover:underline">
              Remove
            </button>
          </div>
        )}

        {rows.length > 0 && (
          <div className="mb-5 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
            <div className="grid grid-cols-[40px_1fr_180px] border-b border-gray-200 px-5 py-2.5 text-xs font-medium uppercase tracking-wide text-gray-400 dark:border-gray-800">
              <span>#</span>
              <span>Description</span>
              <span>Tech</span>
            </div>
            {rows.map((row) => (
              <div
                key={row.index}
                className={`grid grid-cols-[40px_1fr_180px] border-b border-gray-100 px-5 py-3 text-sm last:border-0 dark:border-white/[0.05] ${
                  row.error ? "bg-error-50 dark:bg-error-500/10" : ""
                }`}
              >
                <span className="text-gray-400">{row.index}</span>
                {row.error ? (
                  <span className="text-error-600 dark:text-error-400">⚠ {row.error}</span>
                ) : (
                  <span className="truncate text-gray-700 dark:text-gray-300">{row.description}</span>
                )}
                <span className="truncate text-gray-500 dark:text-gray-400">{row.tech.join(", ")}</span>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-200 pt-4 dark:border-gray-800">
          <p className="text-sm text-gray-400">
            {validRows.length} valid · {skippedRows.length} skipped
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
              disabled={validRows.length === 0 || submitting}
              className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Importing…" : `Import ${validRows.length} Project${validRows.length === 1 ? "" : "s"}`}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
