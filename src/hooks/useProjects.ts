import { useCallback, useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { projectsApi, ProjectsError, type Project, type ProjectsListParams } from "../api/projects";

interface ProjectsState {
  projects: Project[];
  loading: boolean;
  error: ProjectsError | null;
}

// Loads the current user's projects for the given filters, most recent first
// (or A–Z when sort is "az"). Follows the same loading/error/auth pattern as
// useTailoringJobs — a 401 clears auth so ProtectedRoute redirects to /signin.
export function useProjects(params: ProjectsListParams) {
  const { token, clearAuth } = useAuth();
  const [state, setState] = useState<ProjectsState>({
    projects: [],
    loading: true,
    error: null,
  });

  const fetchProjects = useCallback(async () => {
    if (!token) {
      clearAuth();
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const projects = await projectsApi.listProjects(token, params);
      setState({ projects, loading: false, error: null });
    } catch (err) {
      const projectsError =
        err instanceof ProjectsError
          ? err
          : new ProjectsError("server_error", "list", "Something went wrong. Please try again.");

      if (projectsError.kind === "unauthorized") {
        clearAuth();
      }

      setState((prev) => ({ ...prev, loading: false, error: projectsError }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, clearAuth, params.search, params.tech, params.sort]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return { ...state, refetch: fetchProjects };
}
