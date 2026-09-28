import { useCallback, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { createTailoringJob, TailoringError, type TailoringJob } from "../api/resumeTailoring";

interface TailoringSubmitState {
  loading: boolean;
  error: TailoringError | null;
}

// Runs the upload-url -> S3 PUT -> create-job flow and exposes loading/error
// state the same way the sign-in/sign-up forms do. A 401 clears auth instead of
// navigating directly — ProtectedRoute already redirects to /signin once
// isAuthenticated flips false, so callers don't need to handle that case.
export function useTailoringSubmit() {
  const { token, clearAuth } = useAuth();
  const [state, setState] = useState<TailoringSubmitState>({ loading: false, error: null });

  const submit = useCallback(
    async (file: File, jobDescription: string): Promise<TailoringJob | null> => {
      if (!token) {
        clearAuth();
        return null;
      }

      setState({ loading: true, error: null });
      try {
        const job = await createTailoringJob(file, jobDescription, token);
        setState({ loading: false, error: null });
        return job;
      } catch (err) {
        const tailoringError =
          err instanceof TailoringError
            ? err
            : new TailoringError(
                "server_error",
                "create_job",
                "Something went wrong. Please try again."
              );

        if (tailoringError.kind === "unauthorized") {
          clearAuth();
        }

        setState({ loading: false, error: tailoringError });
        return null;
      }
    },
    [token, clearAuth]
  );

  const reset = useCallback(() => setState({ loading: false, error: null }), []);

  return { ...state, submit, reset };
}
