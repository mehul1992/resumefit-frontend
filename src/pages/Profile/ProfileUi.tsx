import { useId } from "react";
import type React from "react";

export function CardHeading({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col gap-1">
      <h2 className="m-0 text-lg font-semibold text-gray-900 dark:text-white/90">{title}</h2>
      <p className="text-gray-600 dark:text-gray-400">{description}</p>
    </div>
  );
}

interface FieldProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "className"> {
  label: string;
  error?: string;
  fullWidth?: boolean;
}

export function Field({ label, error, fullWidth = false, ...inputProps }: FieldProps) {
  const errorId = useId();
  // The error sits outside the <label> so it isn't read as part of the input's
  // name; aria-describedby links it instead.
  return (
    <div className={`flex flex-col gap-1.5 ${fullWidth ? "col-span-full" : ""}`}>
      <label className="flex flex-col gap-1.5">
        <span className="text-[13px] font-medium text-gray-700 dark:text-gray-400">{label}</span>
        <input
          {...inputProps}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={`h-11 rounded-lg border bg-transparent px-3.5 text-sm text-gray-900 outline-hidden transition-[border-color,box-shadow] duration-150 placeholder:text-gray-400 focus:ring-4 disabled:opacity-60 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30 ${
            error
              ? "border-error-500 focus:border-error-500 focus:ring-error-500/15"
              : "border-gray-300 focus:border-brand-500 focus:ring-brand-100 dark:border-gray-700 dark:focus:border-brand-500 dark:focus:ring-brand-500/20"
          }`}
        />
      </label>
      {error && (
        <span id={errorId} className="text-[13px] text-error-600 dark:text-error-500">
          {error}
        </span>
      )}
    </div>
  );
}

export function StatusMessage({ status }: { status: { kind: "success" | "error"; message: string } | null }) {
  // Always rendered so screen readers announce updates to the live region.
  return (
    <p
      role="status"
      className={`text-sm ${status?.kind === "error" ? "text-error-600 dark:text-error-500" : "text-success-600 dark:text-success-500"}`}
    >
      {status?.message}
    </p>
  );
}
