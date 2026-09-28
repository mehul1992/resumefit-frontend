import { useEffect, useState } from "react";
import { Modal } from "../../components/ui/modal";
import Label from "../../components/form/Label";
import TextArea from "../../components/form/input/TextArea";
import Checkbox from "../../components/form/input/Checkbox";
import { useAuth } from "../../context/AuthContext";
import { projectsApi, ProjectsError, type Project } from "../../api/projects";
import TechChipsInput from "./TechChipsInput";

const MAX_DESCRIPTION_LENGTH = 240;

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  project: Project | null;
  techSuggestions: string[];
  onSaved: (project: Project) => void;
}

export default function ProjectFormModal({
  isOpen,
  onClose,
  project,
  techSuggestions,
  onSaved,
}: ProjectFormModalProps) {
  const { token, clearAuth } = useAuth();
  const [description, setDescription] = useState("");
  const [tech, setTech] = useState<string[]>([]);
  const [saveAndAddAnother, setSaveAndAddAnother] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = project !== null;

  useEffect(() => {
    if (isOpen) {
      setDescription(project?.description ?? "");
      setTech(project?.tech ?? []);
      setSaveAndAddAnother(false);
      setError(null);
    }
  }, [isOpen, project]);

  const canSave =
    description.trim().length > 0 &&
    description.length <= MAX_DESCRIPTION_LENGTH &&
    tech.length > 0;

  const handleSave = async () => {
    if (!canSave || submitting) return;
    if (!token) {
      clearAuth();
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const input = { description: description.trim(), tech };
      const saved = isEditing
        ? await projectsApi.updateProject(project.id, input, token)
        : await projectsApi.createProject(input, token);
      onSaved(saved);

      if (!isEditing && saveAndAddAnother) {
        setDescription("");
        setTech([]);
      } else {
        onClose();
      }
    } catch (err) {
      const projectsError =
        err instanceof ProjectsError
          ? err
          : new ProjectsError(
              "server_error",
              isEditing ? "update" : "create",
              "Something went wrong. Please try again."
            );
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
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-lg mx-4">
      <div className="p-6">
        <div className="mb-5 flex items-center justify-between pr-8">
          <h2 className="text-lg font-bold text-gray-900 dark:text-white">
            {isEditing ? "Edit Project" : "Add Project"}
          </h2>
        </div>

        <Label>
          What did you do? <span className="text-error-500">*</span>{" "}
          <span className="font-normal text-gray-400">(1–2 lines, action + outcome)</span>
        </Label>
        <TextArea
          rows={3}
          value={description}
          onChange={(value) => setDescription(value.slice(0, MAX_DESCRIPTION_LENGTH))}
          placeholder="e.g. Integrated Celery + RabbitMQ for async background job orchestration, decoupling time-sensitive workflows from the main request path."
          disabled={submitting}
        />
        <div className="mb-4 mt-1 flex justify-between text-xs text-gray-400">
          <span>Keep it resume-ready — it goes into the tailored CV verbatim</span>
          <span>
            {description.length} / {MAX_DESCRIPTION_LENGTH}
          </span>
        </div>

        <Label>
          Tech used <span className="text-error-500">*</span>
        </Label>
        <TechChipsInput
          value={tech}
          onChange={setTech}
          suggestions={techSuggestions}
          disabled={submitting}
        />
        <p className="mb-5 mt-1 text-xs text-gray-400">
          Autocomplete from tech already in your projects
        </p>

        {error && (
          <div className="mb-4 rounded-lg border border-error-200 bg-error-50 px-3.5 py-2.5 text-sm text-error-700 dark:border-error-500/30 dark:bg-error-500/15 dark:text-error-400">
            {error}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-gray-100 pt-4 dark:border-gray-800">
          {isEditing ? (
            <span />
          ) : (
            <Checkbox
              label="Save & add another"
              checked={saveAndAddAnother}
              onChange={setSaveAndAddAnother}
              disabled={submitting}
            />
          )}
          <div className="flex gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 dark:border-gray-700 dark:text-gray-300"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={!canSave || submitting}
              className="rounded-lg bg-brand-500 px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-brand-600 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting ? "Saving…" : "Save Project"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
