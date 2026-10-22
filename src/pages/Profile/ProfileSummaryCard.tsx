import { useRef, useState } from "react";
import type React from "react";
import { usersApi, UsersError } from "../../api/users";
import UserAvatar from "../../components/common/UserAvatar";
import { useAuth } from "../../context/AuthContext";
import { CARD_CLASS, OUTLINE_BUTTON_CLASS } from "./profileStyles";

// Keep in sync with AVATAR_CONTENT_TYPES / AVATAR_MAX_BYTES in the backend.
const AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_MAX_BYTES = 2 * 1024 * 1024;

export default function ProfileSummaryCard() {
  const { user, token, updateUser, clearAuth } = useAuth();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fullName = user ? `${user.first_name} ${user.last_name}`.trim() : "";
  const subtitle = [user?.designation, user?.location].filter(Boolean).join(" · ");

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    // Reset so picking the same file again still fires a change event.
    event.target.value = "";
    if (!file) return;
    if (!token) {
      clearAuth();
      return;
    }
    if (!AVATAR_TYPES.includes(file.type)) {
      setError("Photo must be a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > AVATAR_MAX_BYTES) {
      setError("Photo must be 2 MB or smaller.");
      return;
    }

    setUploading(true);
    setError(null);
    try {
      updateUser(await usersApi.uploadAvatar(file, token));
    } catch (err) {
      if (err instanceof UsersError && err.kind === "unauthorized") {
        clearAuth();
        return;
      }
      setError(err instanceof Error ? err.message : "Couldn't upload your photo.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <section className={`${CARD_CLASS} flex flex-wrap items-center gap-5`}>
      <UserAvatar user={user} className="h-20 w-20" textClassName="text-2xl" />
      <div className="flex flex-[1_1_200px] flex-col gap-1">
        <h2 className="m-0 text-lg font-semibold text-gray-900 dark:text-white/90">{fullName}</h2>
        <span className="text-gray-600 dark:text-gray-400">
          {subtitle || "Add a headline and location below."}
        </span>
        {error && (
          <span role="alert" className="text-[13px] text-error-600 dark:text-error-500">
            {error}
          </span>
        )}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept={AVATAR_TYPES.join(",")}
        className="hidden"
        onChange={handleFileChange}
        data-testid="avatar-input"
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={uploading}
        className={OUTLINE_BUTTON_CLASS}
      >
        {uploading ? "Uploading…" : "Change photo"}
      </button>
    </section>
  );
}
