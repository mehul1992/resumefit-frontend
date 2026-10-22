import { useState } from "react";
import type React from "react";
import { usersApi, UsersError } from "../../api/users";
import { useAuth } from "../../context/AuthContext";
import { CardHeading, Field, StatusMessage } from "./ProfileUi";
import { CARD_CLASS, OUTLINE_BUTTON_CLASS } from "./profileStyles";
import { validatePassword, type FieldErrors, type PasswordDraft } from "./profileValidation";

const EMPTY: PasswordDraft = { current: "", next: "", confirm: "" };

type Status = { kind: "success" | "error"; message: string } | null;

export default function PasswordCard() {
  const { user, token, updateUser, clearAuth } = useAuth();
  // Google sign-up accounts start without a password (undefined = cached before the field existed).
  const hasPassword = user?.has_password !== false;
  const [draft, setDraft] = useState<PasswordDraft>(EMPTY);
  const [errors, setErrors] = useState<FieldErrors<PasswordDraft>>({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  function setField(field: keyof PasswordDraft) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setDraft((d) => ({ ...d, [field]: value }));
      setErrors((e) => ({ ...e, [field]: undefined }));
      setStatus(null);
    };
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    const nextErrors = validatePassword(draft, hasPassword);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!token) {
      clearAuth();
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      await usersApi.changePassword(
        hasPassword
          ? { current_password: draft.current, new_password: draft.next }
          : { new_password: draft.next },
        token
      );
      setDraft(EMPTY);
      if (user && !hasPassword) updateUser({ ...user, has_password: true });
      setStatus({ kind: "success", message: hasPassword ? "Password updated." : "Password set." });
    } catch (err) {
      if (err instanceof UsersError && err.kind === "unauthorized") {
        clearAuth();
        return;
      }
      if (err instanceof UsersError && err.kind === "bad_request") {
        setErrors({ current: err.message });
      } else {
        setStatus({
          kind: "error",
          message: err instanceof Error ? err.message : "Couldn't update your password.",
        });
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className={CARD_CLASS}>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <CardHeading
          title="Password"
          description={
            hasPassword
              ? "Change the password you use to sign in."
              : "You sign in with Google. Set a password to also sign in with your email."
          }
        />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
          {hasPassword && (
            <Field label="Current password" type="password" value={draft.current} onChange={setField("current")} error={errors.current} autoComplete="current-password" fullWidth />
          )}
          <Field label="New password" type="password" value={draft.next} onChange={setField("next")} error={errors.next} autoComplete="new-password" />
          <Field label="Confirm new password" type="password" value={draft.confirm} onChange={setField("confirm")} error={errors.confirm} autoComplete="new-password" />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3">
          <div className="mr-auto">
            <StatusMessage status={status} />
          </div>
          <button type="submit" disabled={saving} className={OUTLINE_BUTTON_CLASS}>
            {saving ? "Saving…" : hasPassword ? "Update password" : "Set password"}
          </button>
        </div>
      </form>
    </section>
  );
}
