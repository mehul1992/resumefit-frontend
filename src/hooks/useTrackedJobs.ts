import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { jobTrackerApi, TrackerError, type TrackedJob } from "../api/jobTracker";

interface TrackedJobsState {
  jobs: TrackedJob[];
  loading: boolean;
  error: TrackerError | null;
}

// Loads the job tracker board. Callers update `jobs` locally (optimistic
// moves, new cards) via setJobs; a 401 clears auth so ProtectedRoute redirects.
export function useTrackedJobs() {
  const { token, clearAuth } = useAuth();
  const [state, setState] = useState<TrackedJobsState>({ jobs: [], loading: true, error: null });

  const fetchJobs = useCallback(async () => {
    if (!token) {
      clearAuth();
      return;
    }
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const jobs = await jobTrackerApi.listJobs(token);
      setState({ jobs, loading: false, error: null });
    } catch (err) {
      const trackerError =
        err instanceof TrackerError
          ? err
          : new TrackerError("server_error", "list", "Something went wrong. Please try again.");
      if (trackerError.kind === "unauthorized") clearAuth();
      setState((prev) => ({ ...prev, loading: false, error: trackerError }));
    }
  }, [token, clearAuth]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  const setJobs = useCallback(
    (update: (prev: TrackedJob[]) => TrackedJob[]) =>
      setState((prev) => ({ ...prev, jobs: update(prev.jobs) })),
    []
  );

  return { ...state, setJobs, refetch: fetchJobs };
}
