import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserResponse } from "../api/auth";
import { authApi } from "../api/auth";
import { AuthProvider, useAuth } from "./AuthContext";

vi.mock("../api/auth", () => ({
  authApi: { logout: vi.fn().mockResolvedValue(undefined) },
}));

const user: UserResponse = {
  id: 1,
  first_name: "Ada",
  last_name: "Lovelace",
  email: "ada@example.com",
  age: null,
  mobile_number: null,
  designation: null,
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
});
