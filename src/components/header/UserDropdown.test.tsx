import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserResponse } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import UserDropdown from "./UserDropdown";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

const user: UserResponse = {
  id: 1,
  first_name: "Mehul",
  last_name: "Shah",
  email: "mehul@example.com",
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

const logout = vi.fn().mockResolvedValue(undefined);

function renderDropdown() {
  return render(
    <MemoryRouter initialEntries={["/tailor"]}>
      <Routes>
        <Route path="/tailor" element={<UserDropdown />} />
        <Route path="/profile" element={<p>Profile page</p>} />
        <Route path="/signin" element={<p>Sign in page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("UserDropdown", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user,
      token: "token-123",
      setAuth: vi.fn(),
      updateUser: vi.fn(),
      clearAuth: vi.fn(),
      logout,
      isAuthenticated: true,
    });
  });

  it("opens a menu with the user's details and focuses the first item", async () => {
    renderDropdown();
    const trigger = screen.getByRole("button", { name: "Account menu" });
    expect(trigger).toHaveAttribute("aria-expanded", "false");

    await userEvent.click(trigger);

    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Mehul Shah")).toBeInTheDocument();
    expect(screen.getByText("mehul@example.com")).toBeInTheDocument();
    expect(screen.getByRole("menuitem", { name: "Edit profile" })).toHaveFocus();
    expect(screen.getByRole("menuitem", { name: "Processed resumes" })).toHaveAttribute("href", "/resumes");
  });

  it("supports arrow keys and closes on Escape, returning focus to the trigger", async () => {
    renderDropdown();
    const trigger = screen.getByRole("button", { name: "Account menu" });
    await userEvent.click(trigger);

    await userEvent.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "Account settings" })).toHaveFocus();
    await userEvent.keyboard("{ArrowUp}{ArrowUp}");
    expect(screen.getByRole("menuitem", { name: "Sign out" })).toHaveFocus();

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes on outside click", async () => {
    renderDropdown();
    await userEvent.click(screen.getByRole("button", { name: "Account menu" }));

    await userEvent.click(document.body);

    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("navigates to the profile page and closes", async () => {
    renderDropdown();
    await userEvent.click(screen.getByRole("button", { name: "Account menu" }));

    await userEvent.click(screen.getByRole("menuitem", { name: "Edit profile" }));

    expect(await screen.findByText("Profile page")).toBeInTheDocument();
  });

  it("signs out and routes to sign in", async () => {
    renderDropdown();
    await userEvent.click(screen.getByRole("button", { name: "Account menu" }));

    await userEvent.click(screen.getByRole("menuitem", { name: "Sign out" }));

    expect(logout).toHaveBeenCalled();
    expect(await screen.findByText("Sign in page")).toBeInTheDocument();
  });
});
