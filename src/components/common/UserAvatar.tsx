import { useEffect, useState } from "react";
import type { UserResponse } from "../../api/auth";

interface UserAvatarProps {
  user: UserResponse | null;
  className?: string;
  textClassName?: string;
}

// Shows the uploaded photo, falling back to initials when there is none or the
// presigned URL has expired before the next /users/me refresh.
export default function UserAvatar({ user, className = "", textClassName = "text-sm" }: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const url = user?.avatar_url ?? null;

  useEffect(() => setFailed(false), [url]);

  if (url && !failed) {
    return (
      <img
        src={url}
        alt=""
        onError={() => setFailed(true)}
        className={`shrink-0 rounded-full object-cover ${className}`}
      />
    );
  }

  const initials = `${user?.first_name?.[0] ?? ""}${user?.last_name?.[0] ?? ""}`.toUpperCase() || "?";
  return (
    <span
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-brand-50 font-semibold text-brand-500 dark:bg-brand-500/15 dark:text-brand-400 ${textClassName} ${className}`}
    >
      {initials}
    </span>
  );
}
