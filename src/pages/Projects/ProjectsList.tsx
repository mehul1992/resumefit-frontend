import { useMemo, useState } from "react";
import { Link } from "react-router";
import PageMeta from "../../components/common/PageMeta";
import PageBreadCrumb from "../../components/common/PageBreadCrumb";
import Badge from "../../components/ui/badge/Badge";
import { PencilIcon, TrashBinIcon } from "../../icons";
import { useModal } from "../../hooks/useModal";
import { useProjects } from "../../hooks/useProjects";
import { useAuth } from "../../context/AuthContext";
import { projectsApi, ProjectsError, type Project, type ProjectSort } from "../../api/projects";
import ProjectFormModal from "./ProjectFormModal";

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="mb-6 flex items-start justify-between gap-3 rounded-xl border border-error-200 bg-error-50 p-4 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
      <div className="flex items-start gap-3">
        <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-4.75a.75.75 0 001.5 0v-4.5a.75.75 0 00-1.5 0v4.5zm.75-7a.75.75 0 100 1.5.75.75 0 000-1.5z"
          />
        </svg>
        <p>{message}</p>
      </div>
      <button onClick={onRetry} className="shrink-0 text-xs font-semibold underline hover:no-underline">
        Retry
      </button>
    </div>
  );
}

const addActionClasses =
  "inline-flex items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-white/[0.03]";

export default function ProjectsList() {
  const { token, clearAuth } = useAuth();
  const [search, setSearch] = useState("");
  const [tech, setTech] = useState("");
  const [sort, setSort] = useState<ProjectSort>("recent");
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const { isOpen, openModal, closeModal } = useModal();

  const all = useProjects({});
  const filtered = useProjects({
    search: search || undefined,
    tech: tech || undefined,
    sort,
  });

  const techOptions = useMemo(() => {
    const set = new Set<string>();
    all.projects.forEach((p) => p.tech.forEach((t) => set.add(t)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [all.projects]);

  const refetchAll = () => {
    all.refetch();
    filtered.refetch();
  };

  const openAddModal = () => {
    setEditingProject(null);
    openModal();
  };

  const openEditModal = (project: Project) => {
    setEditingProject(project);
    openModal();
  };

  const handleDelete = async (project: Project) => {
    if (!token) {
      clearAuth();
      return;
    }
    if (!window.confirm(`Delete this project?\n\n"${project.description}"`)) return;

    setDeletingId(project.id);
    setDeleteError(null);
    try {
      await projectsApi.deleteProject(project.id, token);
      refetchAll();
    } catch (err) {
      const projectsError =
        err instanceof ProjectsError
          ? err
          : new ProjectsError("server_error", "delete", "Something went wrong. Please try again.");
      if (projectsError.kind === "unauthorized") {
        clearAuth();
        return;
      }
      setDeleteError(projectsError.message);
    } finally {
      setDeletingId(null);
    }
  };

  const hasAnyProjects = all.projects.length > 0;
  const showEmptyState = !all.loading && !all.error && !hasAnyProjects;

  return (
    <>
      <PageMeta
        title="Projects | ResumeFit"
        description="Reusable resume bullets used by the tailoring engine"
      />
      <PageBreadCrumb pageTitle="Projects" />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {all.projects.length} project{all.projects.length === 1 ? "" : "s"} · used by the
          tailoring engine to pick the most relevant work per JD
        </p>
        <div className="flex gap-2.5">
          <Link to="/projects/import-resume" className={addActionClasses}>
            Import from Resume
          </Link>
          <Link to="/projects/upload-csv" className={addActionClasses}>
            Upload CSV
          </Link>
          <button
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600"
          >
            + Add Project
          </button>
        </div>
      </div>

      {!showEmptyState && (
        <div className="mb-4 flex flex-wrap items-center gap-2.5 text-sm">
          <select
            value={tech}
            onChange={(e) => setTech(e.target.value)}
            className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            <option value="">All tech</option>
            {techOptions.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as ProjectSort)}
            className="rounded-full border border-gray-300 bg-white px-3 py-1.5 text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
          >
            <option value="recent">Sort: Recent</option>
            <option value="az">Sort: A–Z</option>
          </select>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter projects…"
            className="w-56 rounded-full border border-gray-300 bg-white px-4 py-1.5 placeholder-gray-400 dark:border-gray-700 dark:bg-gray-900 dark:text-white dark:placeholder-gray-500"
          />
        </div>
      )}

      {(filtered.error || deleteError) && (
        <ErrorBanner
          message={deleteError ?? filtered.error?.message ?? "Something went wrong."}
          onRetry={() => {
            setDeleteError(null);
            refetchAll();
          }}
        />
      )}

      {filtered.loading ? (
        <div className="flex items-center justify-center py-20">
          <svg className="h-6 w-6 animate-spin text-brand-500" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
          </svg>
        </div>
      ) : showEmptyState ? (
        <div className="flex flex-col items-center justify-center gap-2 py-20 text-center">
          <p className="text-gray-500 dark:text-gray-400">No projects yet.</p>
          <p className="text-sm text-gray-400">
            Use Import from Resume, Upload CSV, or + Add Project above to get started.
          </p>
        </div>
      ) : filtered.error ? null : filtered.projects.length === 0 ? (
        <div className="flex items-center justify-center py-20 text-center">
          <p className="text-gray-500 dark:text-gray-400">No projects match your filters.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-white/[0.03]">
          {filtered.projects.map((project) => (
            <div
              key={project.id}
              className="flex items-start gap-4 border-b border-gray-100 px-5 py-4 last:border-0 hover:bg-gray-50/50 dark:border-white/[0.05] dark:hover:bg-white/[0.02]"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm leading-relaxed text-gray-700 dark:text-gray-300">
                  {project.description}
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {project.tech.map((t) => (
                    <Badge key={t} size="sm" color="light">
                      {t}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 gap-2 text-gray-400">
                <button
                  onClick={() => openEditModal(project)}
                  title="Edit"
                  className="hover:text-brand-500"
                >
                  <PencilIcon className="size-4" />
                </button>
                <button
                  onClick={() => handleDelete(project)}
                  disabled={deletingId === project.id}
                  title="Delete"
                  className="hover:text-error-500 disabled:opacity-50"
                >
                  <TrashBinIcon className="size-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ProjectFormModal
        isOpen={isOpen}
        onClose={closeModal}
        project={editingProject}
        techSuggestions={techOptions}
        onSaved={refetchAll}
      />
    </>
  );
}
