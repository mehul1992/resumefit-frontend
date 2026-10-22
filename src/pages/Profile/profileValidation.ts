import type { UserResponse } from "../../api/auth";

export interface ProfileDraft {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  headline: string;
}

export interface PasswordDraft {
  current: string;
  next: string;
  confirm: string;
}

export type FieldErrors<T> = Partial<Record<keyof T, string>>;

// Keep in sync with PasswordChangeRequest.new_password in the backend.
export const MIN_PASSWORD_LENGTH = 8;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^\+?[\d\s().-]{7,20}$/;
const LINKEDIN_RE = /^(https?:\/\/)?([\w-]+\.)?linkedin\.com\/\S+$/i;

export function draftFromUser(user: UserResponse | null): ProfileDraft {
  return {
    firstName: user?.first_name ?? "",
    lastName: user?.last_name ?? "",
    email: user?.email ?? "",
    phone: user?.mobile_number ?? "",
    location: user?.location ?? "",
    linkedin: user?.linkedin_url ?? "",
    headline: user?.designation ?? "",
  };
}

export function validateProfile(draft: ProfileDraft): FieldErrors<ProfileDraft> {
  const errors: FieldErrors<ProfileDraft> = {};
  if (!draft.firstName.trim()) errors.firstName = "First name is required.";
  if (!draft.lastName.trim()) errors.lastName = "Last name is required.";
  if (!draft.email.trim()) errors.email = "Email address is required.";
  else if (!EMAIL_RE.test(draft.email.trim())) errors.email = "Enter a valid email address.";
  if (draft.phone.trim() && !PHONE_RE.test(draft.phone.trim())) {
    errors.phone = "Enter a valid phone number.";
  }
  if (draft.linkedin.trim() && !LINKEDIN_RE.test(draft.linkedin.trim())) {
    errors.linkedin = "Enter a LinkedIn URL, e.g. linkedin.com/in/your-name.";
  }
  return errors;
}

// requireCurrent is false for Google-only accounts setting their first password.
export function validatePassword(draft: PasswordDraft, requireCurrent = true): FieldErrors<PasswordDraft> {
  const errors: FieldErrors<PasswordDraft> = {};
  if (requireCurrent && !draft.current) errors.current = "Enter your current password.";
  if (draft.next.length < MIN_PASSWORD_LENGTH) {
    errors.next = `New password must be at least ${MIN_PASSWORD_LENGTH} characters.`;
  }
  if (draft.confirm !== draft.next) errors.confirm = "Passwords don't match.";
  return errors;
}
