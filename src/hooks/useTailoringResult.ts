import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { resumeTailoringApi, TailoringError, type TailoringResult } from "../api/resumeTailoring";

const POLL_INTERVAL_MS = 3000;

interface TailoringResultState {
  result: TailoringResult | null;
  loading: boolean;
  error: TailoringError | null;
}

// Loads one tailoring run for the Tailor Result page. Keeps polling while the
// run is still tailoring, or while a revert/re-apply is re-rendering the PDF,
// so the page settles on its own. A 401 clears auth (ProtectedRoute redirects).
export function useTailoringResult(jobId: number) {
  const { token, clearAuth } = useAuth();
  const [state, setState] = useState<TailoringResultState>({
    result: null,
    loading: true,
    error: null,
  });

  const fetchResult = useCallback(
    async (options: { silent?: boolean } = {}) => {
      if (!token) {
        clearAuth();
        return;
      }
      if (!options.silent) setState((prev) => ({ ...prev, loading: true, error: null }));
      try {
        const result = await resumeTailoringApi.getResult(jobId, token);
        setState({ result, loading: false, error: null });
      } catch (err) {
        const tailoringError =
          err instanceof TailoringError
            ? err
            : new TailoringError("server_error", "get_result", "Something went wrong. Please try again.");
        if (tailoringError.kind === "unauthorized") clearAuth();
        setState((prev) => ({ ...prev, loading: false, error: tailoringError }));
      }
    },
    [jobId, token, clearAuth]
  );

  useEffect(() => {
    fetchResult();
  }, [fetchResult]);

  const result = state.result;
  const settling =
    !!result &&
    (result.status === "pending" || result.status === "processing" || !result.pdf_up_to_date);
  useEffect(() => {
    if (!settling || state.error) return;
    const timer = setTimeout(() => fetchResult({ silent: true }), POLL_INTERVAL_MS);
    return () => clearTimeout(timer);
  }, [settling, result, state.error, fetchResult]);

  const setResult = useCallback(
    (update: (prev: TailoringResult) => TailoringResult) =>
      setState((prev) => (prev.result ? { ...prev, result: update(prev.result) } : prev)),
    []
  );

  return {
    ...state,
    setResult,
    refetch: useCallback(() => fetchResult(), [fetchResult]),
    refresh: useCallback(() => fetchResult({ silent: true }), [fetchResult]),
  };
}
