import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { resumeTailoringApi, TailoringError, type TailoringJobListItem } from "../api/resumeTailoring";

interface TailoringJobsState {
  jobs: TailoringJobListItem[];
  loading: boolean;
  error: TailoringError | null;
}

const POLL_INTERVAL_MS = 5000;

// Loads the current user's tailoring jobs, most recent first (as returned by
// the API), re-polling quietly while any run is still pending/processing. Follows the same loading/error/auth pattern as useTailoringSubmit —
// a 401 clears auth so ProtectedRoute redirects to /signin instead of this
// hook navigating directly.
export function useTailoringJobs() {
  const { token, clearAuth } = useAuth();
  const [state, setState] = useState<TailoringJobsState>({
    jobs: [],
    loading: true,
    error: null,
  });

  const fetchJobs = useCallback(async (options: { silent?: boolean } = {}) => {
    if (!token) {
      clearAuth();
      return;
    }

    if (!options.silent) setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const jobs = await resumeTailoringApi.listJobs(token);
      setState({ jobs, loading: false, error: null });
    } catch (err) {
      const tailoringError =
        err instanceof TailoringError
          ? err
          : new TailoringError(
              "server_error",
              "list_jobs",
              "Something went wrong. Please try again."
            );

      if (tailoringError.kind === "unauthorized") {
        clearAuth();
      }

      setState((prev) => ({ ...prev, loading: false, error: tailoringError }));
    }
  }, [token, clearAuth]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const inFlight = state.jobs.some((j) => j.status === "pending" || j.status === "processing");
  useEffect(() => {
    if (!inFlight || state.error) return;
    const timer = setTimeout(() => fetchJobs({ silent: true }), POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [inFlight, state.jobs, state.error, fetchJobs]);

  const refetch = useCallback(() => fetchJobs(), [fetchJobs]);
  // Reloads without the spinner — for updates after a row action.
  const refresh = useCallback(() => fetchJobs({ silent: true }), [fetchJobs]);

  return { ...state, refetch, refresh };
}
