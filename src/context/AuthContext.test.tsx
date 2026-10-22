import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserResponse } from "../api/auth";
import { authApi } from "../api/auth";
import { usersApi, UsersError } from "../api/users";
import { AuthProvider, useAuth } from "./AuthContext";

vi.mock("../api/auth", () => ({
  authApi: { logout: vi.fn().mockResolvedValue(undefined) },
}));

vi.mock("../api/users", () => ({
  usersApi: { getMe: vi.fn() },
  UsersError: class UsersError extends Error {
    kind: string;
    constructor(kind: string) {
      super(kind);
      this.kind = kind;
    }
  },
}));

const user: UserResponse = {
  id: 1,
  first_name: "Ada",
  last_name: "Lovelace",
  email: "ada@example.com",
  age: null,
  mobile_number: null,
  designation: null,
  location: null,
  linkedin_url: null,
  avatar_url: null,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("AuthContext", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it("starts unauthenticated when localStorage is empty", () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.user).toBeNull();
  });

  it("persists auth to localStorage on setAuth and clears it on clearAuth", () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    act(() => result.current.setAuth(user, "token-123"));
    expect(result.current.isAuthenticated).toBe(true);
    expect(localStorage.getItem("rf_token")).toBe("token-123");
    expect(JSON.parse(localStorage.getItem("rf_user")!)).toEqual(user);

    act(() => result.current.clearAuth());
    expect(result.current.isAuthenticated).toBe(false);
    expect(localStorage.getItem("rf_token")).toBeNull();
    expect(localStorage.getItem("rf_user")).toBeNull();
  });

  it("calls the logout API and clears local auth on logout", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });
    act(() => result.current.setAuth(user, "token-123"));

    await act(() => result.current.logout());

    expect(authApi.logout).toHaveBeenCalledWith("token-123");
    expect(result.current.isAuthenticated).toBe(false);
  });

  it("refreshes the cached user from the API on load", async () => {
    localStorage.setItem("rf_token", "token-123");
    localStorage.setItem("rf_user", JSON.stringify(user));
    vi.mocked(usersApi.getMe).mockResolvedValue({ ...user, location: "London" });

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.user?.location).toBe("London"));
    expect(usersApi.getMe).toHaveBeenCalledWith("token-123");
  });

  it("signs out on load when the stored token is rejected", async () => {
    localStorage.setItem("rf_token", "expired");
    localStorage.setItem("rf_user", JSON.stringify(user));
    vi.mocked(usersApi.getMe).mockRejectedValue(
      new (UsersError as unknown as new (kind: string) => Error)("unauthorized")
    );

    const { result } = renderHook(() => useAuth(), { wrapper: AuthProvider });

    await waitFor(() => expect(result.current.isAuthenticated).toBe(false));
  });
});
