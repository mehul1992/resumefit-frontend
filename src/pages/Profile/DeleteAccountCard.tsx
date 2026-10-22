import { useState } from "react";
import { useNavigate } from "react-router";
import { usersApi, UsersError } from "../../api/users";
import { Modal } from "../../components/ui/modal";
import { useAuth } from "../../context/AuthContext";
import { CardHeading } from "./ProfileUi";
import {
  CARD_CLASS,
  DANGER_BUTTON_CLASS,
  DANGER_OUTLINE_BUTTON_CLASS,
  OUTLINE_BUTTON_CLASS,
} from "./profileStyles";

const CONFIRM_WORD = "DELETE";

export default function DeleteAccountCard() {
  const { token, clearAuth } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function openDialog() {
    setConfirmText("");
    setError(null);
    setIsOpen(true);
  }

  function closeDialog() {
    if (!deleting) setIsOpen(false);
  }

  async function handleDelete() {
    if (confirmText !== CONFIRM_WORD || deleting) return;
    if (!token) {
      clearAuth();
      return;
    }

    setDeleting(true);
    setError(null);
    try {
      await usersApi.deleteMe(token);
      clearAuth();
      navigate("/signin", { replace: true });
    } catch (err) {
      if (err instanceof UsersError && err.kind === "unauthorized") {
        clearAuth();
        return;
      }
      setError(err instanceof Error ? err.message : "Couldn't delete your account.");
      setDeleting(false);
    }
  }

  return (
    <section className={`${CARD_CLASS} flex flex-wrap items-center justify-between gap-4`}>
      <CardHeading
        title="Delete account"
        description="Permanently remove your account, projects and processed resumes."
      />
      <button type="button" onClick={openDialog} className={DANGER_OUTLINE_BUTTON_CLASS}>
        Delete account
      </button>

      <Modal isOpen={isOpen} onClose={closeDialog} showCloseButton={false} className="m-4 max-w-[480px] p-6">
        <div role="alertdialog" aria-modal="true" aria-labelledby="delete-account-title" aria-describedby="delete-account-description" className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <h3 id="delete-account-title" className="text-lg font-semibold text-gray-900 dark:text-white/90">
              Delete your account?
            </h3>
            <p id="delete-account-description" className="text-sm text-gray-600 dark:text-gray-400">
              This permanently deletes your account, projects and processed resumes. This can't be undone.
            </p>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-gray-700 dark:text-gray-400">
              Type <span className="font-semibold">{CONFIRM_WORD}</span> to confirm
            </span>
            <input
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
              autoComplete="off"
              className="h-11 rounded-lg border border-gray-300 bg-transparent px-3.5 text-sm text-gray-900 outline-hidden transition-[border-color,box-shadow] duration-150 focus:border-error-500 focus:ring-4 focus:ring-error-500/15 dark:border-gray-700 dark:text-white/90"
            />
          </label>
          {error && (
            <p role="alert" className="text-[13px] text-error-600 dark:text-error-500">
              {error}
            </p>
          )}
          <div className="flex flex-wrap justify-end gap-3">
            <button type="button" onClick={closeDialog} disabled={deleting} className={OUTLINE_BUTTON_CLASS}>
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={confirmText !== CONFIRM_WORD || deleting}
              className={DANGER_BUTTON_CLASS}
            >
              {deleting ? "Deleting…" : "Delete account"}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  );
}
