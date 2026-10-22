import { useEffect, useState } from "react";
import type React from "react";
import { Modal } from "../../components/ui/modal";
import { useAuth } from "../../context/AuthContext";
import { jobTrackerApi, TrackerError, type TrackedJob } from "../../api/jobTracker";
import { Field } from "../Profile/ProfileUi";
import { OUTLINE_BUTTON_CLASS, PRIMARY_BUTTON_CLASS } from "../Profile/profileStyles";

interface AddJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdded: (job: TrackedJob) => void;
}

// Not in the handoff ("Add job flow not designed"): a minimal form for jobs the
// user is pursuing without a tailored CV yet. New jobs start in Saved.
export default function AddJobModal({ isOpen, onClose, onAdded }: AddJobModalProps) {
  const { token, clearAuth } = useAuth();
  const [role, setRole] = useState("");
  const [company, setCompany] = useState("");
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<{ role?: string; company?: string }>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setRole("");
    setCompany("");
    setNote("");
    setErrors({});
    setError(null);
  }, [isOpen]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors = {
      role: role.trim() ? undefined : "Role is required.",
      company: company.trim() ? undefined : "Company is required.",
    };
    setErrors(nextErrors);
    if (nextErrors.role || nextErrors.company || saving) return;
    if (!token) return clearAuth();

    setSaving(true);
    setError(null);
    try {
      const job = await jobTrackerApi.createJob(
        { role: role.trim(), company: company.trim(), note: note.trim() || undefined },
        token
      );
      onAdded(job);
      onClose();
    } catch (err) {
      if (err instanceof TrackerError && err.kind === "unauthorized") return clearAuth();
      setError(err instanceof Error ? err.message : "Couldn't add the job.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="m-4 max-w-[512px] p-6">
      <form onSubmit={handleSubmit} noValidate aria-labelledby="add-job-title" className="flex flex-col gap-5 text-sm">
        <h2 id="add-job-title" className="pr-12 text-xl font-semibold text-gray-900 dark:text-white/90">
          Add job
        </h2>
        <Field label="Role" value={role} onChange={(e) => setRole(e.target.value)} error={errors.role} maxLength={200} autoFocus />
        <Field label="Company" value={company} onChange={(e) => setCompany(e.target.value)} error={errors.company} maxLength={200} />
        <Field
          label="Note (optional)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Referral from Priya"
          maxLength={240}
        />
        {error && (
          <p role="alert" className="text-[13px] text-error-600 dark:text-error-500">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2.5 border-t border-gray-200 pt-5 dark:border-gray-800">
          <button type="button" onClick={onClose} className={OUTLINE_BUTTON_CLASS}>
            Cancel
          </button>
          <button type="submit" disabled={saving} className={PRIMARY_BUTTON_CLASS}>
            {saving ? "Adding…" : "Add job"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
