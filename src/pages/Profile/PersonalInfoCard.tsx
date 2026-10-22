import { useEffect, useState } from "react";
import type React from "react";
import { usersApi, UsersError } from "../../api/users";
import { useAuth } from "../../context/AuthContext";
import { CardHeading, Field, StatusMessage } from "./ProfileUi";
import { CARD_CLASS, OUTLINE_BUTTON_CLASS, PRIMARY_BUTTON_CLASS } from "./profileStyles";
import {
  draftFromUser,
  validateProfile,
  type FieldErrors,
  type ProfileDraft,
} from "./profileValidation";

type Status = { kind: "success" | "error"; message: string } | null;

export default function PersonalInfoCard() {
  const { user, token, updateUser, clearAuth } = useAuth();
  const [saved, setSaved] = useState<ProfileDraft>(() => draftFromUser(user));
  const [draft, setDraft] = useState<ProfileDraft>(saved);
  const [errors, setErrors] = useState<FieldErrors<ProfileDraft>>({});
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  const dirty = (Object.keys(draft) as (keyof ProfileDraft)[]).some((k) => draft[k] !== saved[k]);

  // Pick up the background /users/me refresh, but never clobber unsaved edits.
  useEffect(() => {
    const next = draftFromUser(user);
    setSaved(next);
    if (!dirty) setDraft(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- only react to the user changing
  }, [user]);

  function setField(field: keyof ProfileDraft) {
    return (event: React.ChangeEvent<HTMLInputElement>) => {
      const value = event.target.value;
      setDraft((d) => ({ ...d, [field]: value }));
      setErrors((e) => ({ ...e, [field]: undefined }));
      setStatus(null);
    };
  }

  function handleCancel() {
    setDraft(saved);
    setErrors({});
    setStatus(null);
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    const nextErrors = validateProfile(draft);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    if (!token) {
      clearAuth();
      return;
    }

    setSaving(true);
    setStatus(null);
    try {
      const updated = await usersApi.updateMe(
        {
          first_name: draft.firstName.trim(),
          last_name: draft.lastName.trim(),
          email: draft.email.trim(),
          mobile_number: draft.phone.trim() || null,
          location: draft.location.trim() || null,
          linkedin_url: draft.linkedin.trim() || null,
          designation: draft.headline.trim() || null,
        },
        token
      );
      const next = draftFromUser(updated);
      setSaved(next);
      setDraft(next);
      updateUser(updated);
      setStatus({ kind: "success", message: "Profile saved." });
    } catch (err) {
      if (err instanceof UsersError && err.kind === "unauthorized") {
        clearAuth();
        return;
      }
      if (err instanceof UsersError && err.kind === "conflict") {
        setErrors({ email: err.message });
      } else {
        setStatus({
          kind: "error",
          message: err instanceof Error ? err.message : "Couldn't save your profile.",
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
          title="Personal information"
          description="Used as the header details on tailored resumes."
        />
        <div className="grid grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5">
          <Field label="First name" value={draft.firstName} onChange={setField("firstName")} error={errors.firstName} autoComplete="given-name" required />
          <Field label="Last name" value={draft.lastName} onChange={setField("lastName")} error={errors.lastName} autoComplete="family-name" required />
          <Field label="Email address" type="email" value={draft.email} onChange={setField("email")} error={errors.email} autoComplete="email" required />
          <Field label="Phone" type="tel" value={draft.phone} onChange={setField("phone")} error={errors.phone} autoComplete="tel" />
          <Field label="Location" value={draft.location} onChange={setField("location")} error={errors.location} placeholder="City, Country" />
          <Field label="LinkedIn" value={draft.linkedin} onChange={setField("linkedin")} error={errors.linkedin} placeholder="linkedin.com/in/your-name" />
          <Field label="Headline" value={draft.headline} onChange={setField("headline")} error={errors.headline} placeholder="e.g. Full-stack developer" fullWidth />
        </div>
        <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-200 pt-6 dark:border-gray-800">
          <div className="mr-auto">
            <StatusMessage status={status} />
          </div>
          <button type="button" onClick={handleCancel} disabled={!dirty || saving} className={OUTLINE_BUTTON_CLASS}>
            Cancel
          </button>
          <button type="submit" disabled={!dirty || saving} className={PRIMARY_BUTTON_CLASS}>
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </form>
    </section>
  );
}
