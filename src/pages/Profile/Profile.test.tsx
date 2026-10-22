import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { UserResponse } from "../../api/auth";
import { usersApi, UsersError } from "../../api/users";
import { AppWrapper } from "../../components/common/PageMeta";
import { useAuth } from "../../context/AuthContext";
import Profile from "./Profile";

vi.mock("../../context/AuthContext", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../api/users", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../api/users")>();
  return {
    ...actual,
    usersApi: {
      getMe: vi.fn(),
      updateMe: vi.fn(),
      uploadAvatar: vi.fn(),
      changePassword: vi.fn(),
      deleteMe: vi.fn(),
    },
  };
});

const user: UserResponse = {
  id: 1,
  first_name: "Mehul",
  last_name: "Shah",
  email: "mehul@example.com",
  age: null,
  mobile_number: "+91 98765 43210",
  designation: "Full-stack developer",
  location: "Ahmedabad, India",
  linkedin_url: "linkedin.com/in/mehul",
  avatar_url: null,
  is_active: true,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const updateUser = vi.fn();
const clearAuth = vi.fn();

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/profile"]}>
      <AppWrapper>
        <Routes>
          <Route path="/profile" element={<Profile />} />
          <Route path="/signin" element={<p>Sign in page</p>} />
        </Routes>
      </AppWrapper>
    </MemoryRouter>
  );
}

describe("Profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user,
      token: "token-123",
      setAuth: vi.fn(),
      updateUser,
      clearAuth,
      logout: vi.fn(),
      isAuthenticated: true,
    });
  });

  it("shows the summary and prefills personal information", () => {
    renderPage();

    expect(screen.getByRole("heading", { name: "Mehul Shah" })).toBeInTheDocument();
    expect(screen.getByText("Full-stack developer · Ahmedabad, India")).toBeInTheDocument();
    expect(screen.getByLabelText("First name")).toHaveValue("Mehul");
    expect(screen.getByLabelText("LinkedIn")).toHaveValue("linkedin.com/in/mehul");
    expect(screen.getByLabelText("Headline")).toHaveValue("Full-stack developer");
    expect(screen.getByRole("button", { name: "Save changes" })).toBeDisabled();
  });

  it("validates required fields before saving", async () => {
    renderPage();
    const firstName = screen.getByLabelText("First name");

    await userEvent.clear(firstName);
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByText("First name is required.")).toBeInTheDocument();
    expect(firstName).toHaveAttribute("aria-invalid", "true");
    expect(usersApi.updateMe).not.toHaveBeenCalled();
  });

  it("rejects a non-LinkedIn URL", async () => {
    renderPage();
    const linkedin = screen.getByLabelText("LinkedIn");

    await userEvent.clear(linkedin);
    await userEvent.type(linkedin, "example.com/me");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(screen.getByText(/Enter a LinkedIn URL/)).toBeInTheDocument();
    expect(usersApi.updateMe).not.toHaveBeenCalled();
  });

  it("saves the profile and updates the signed-in user", async () => {
    const updated = { ...user, location: "Pune, India", mobile_number: null };
    vi.mocked(usersApi.updateMe).mockResolvedValue(updated);
    renderPage();

    const location = screen.getByLabelText("Location");
    await userEvent.clear(location);
    await userEvent.type(location, "Pune, India");
    await userEvent.clear(screen.getByLabelText("Phone"));
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(usersApi.updateMe).toHaveBeenCalledWith(
      {
        first_name: "Mehul",
        last_name: "Shah",
        email: "mehul@example.com",
        mobile_number: null,
        location: "Pune, India",
        linkedin_url: "linkedin.com/in/mehul",
        designation: "Full-stack developer",
      },
      "token-123"
    );
    expect(updateUser).toHaveBeenCalledWith(updated);
    expect(await screen.findByText("Profile saved.")).toBeInTheDocument();
  });

  it("shows a taken email inline", async () => {
    vi.mocked(usersApi.updateMe).mockRejectedValue(
      new UsersError("conflict", "update_me", "Email already registered.")
    );
    renderPage();

    const email = screen.getByLabelText("Email address");
    await userEvent.clear(email);
    await userEvent.type(email, "taken@example.com");
    await userEvent.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText("Email already registered.")).toBeInTheDocument();
    expect(email).toHaveAttribute("aria-invalid", "true");
  });

  it("cancel restores the last saved values", async () => {
    renderPage();
    const firstName = screen.getByLabelText("First name");

    await userEvent.type(firstName, "x");
    await userEvent.click(screen.getByRole("button", { name: "Cancel" }));

    expect(firstName).toHaveValue("Mehul");
  });

  it("checks the new password before calling the API", async () => {
    renderPage();

    await userEvent.type(screen.getByLabelText("Current password"), "OldPass123");
    await userEvent.type(screen.getByLabelText("New password"), "NewPass123");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "Different1");
    await userEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(screen.getByText("Passwords don't match.")).toBeInTheDocument();
    expect(usersApi.changePassword).not.toHaveBeenCalled();
  });

  it("shows a wrong current password under that field", async () => {
    vi.mocked(usersApi.changePassword).mockRejectedValue(
      new UsersError("bad_request", "change_password", "Current password is incorrect.")
    );
    renderPage();

    await userEvent.type(screen.getByLabelText("Current password"), "wrong");
    await userEvent.type(screen.getByLabelText("New password"), "NewPass123");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "NewPass123");
    await userEvent.click(screen.getByRole("button", { name: "Update password" }));

    expect(usersApi.changePassword).toHaveBeenCalledWith(
      { current_password: "wrong", new_password: "NewPass123" },
      "token-123"
    );
    expect(await screen.findByText("Current password is incorrect.")).toBeInTheDocument();
  });

  it("rejects oversized photos without uploading", async () => {
    renderPage();
    const big = new File([new Uint8Array(2 * 1024 * 1024 + 1)], "me.png", { type: "image/png" });

    await userEvent.upload(screen.getByTestId("avatar-input"), big);

    expect(screen.getByText("Photo must be 2 MB or smaller.")).toBeInTheDocument();
    expect(usersApi.uploadAvatar).not.toHaveBeenCalled();
  });

  it("uploads a new photo", async () => {
    const updated = { ...user, avatar_url: "https://s3.example.com/me.png" };
    vi.mocked(usersApi.uploadAvatar).mockResolvedValue(updated);
    renderPage();
    const photo = new File(["png"], "me.png", { type: "image/png" });

    await userEvent.upload(screen.getByTestId("avatar-input"), photo);

    expect(usersApi.uploadAvatar).toHaveBeenCalledWith(photo, "token-123");
    expect(updateUser).toHaveBeenCalledWith(updated);
  });

  it("deletes the account only after typing the confirmation word", async () => {
    vi.mocked(usersApi.deleteMe).mockResolvedValue(undefined);
    renderPage();

    await userEvent.click(screen.getByRole("button", { name: "Delete account" }));
    const dialog = screen.getByRole("alertdialog");
    const confirm = within(dialog).getByRole("button", { name: "Delete account" });
    expect(confirm).toBeDisabled();

    await userEvent.type(screen.getByLabelText(/to confirm/), "DELETE");
    await userEvent.click(confirm);

    expect(usersApi.deleteMe).toHaveBeenCalledWith("token-123");
    expect(clearAuth).toHaveBeenCalled();
    expect(await screen.findByText("Sign in page")).toBeInTheDocument();
  });

  it("lets a Google-only account set its first password", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { ...user, has_password: false },
      token: "token-123",
      setAuth: vi.fn(),
      updateUser,
      clearAuth,
      logout: vi.fn(),
      isAuthenticated: true,
    });
    vi.mocked(usersApi.changePassword).mockResolvedValue(undefined);
    renderPage();

    expect(screen.queryByLabelText("Current password")).not.toBeInTheDocument();
    expect(screen.getByText(/You sign in with Google/)).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("New password"), "NewPass123");
    await userEvent.type(screen.getByLabelText("Confirm new password"), "NewPass123");
    await userEvent.click(screen.getByRole("button", { name: "Set password" }));

    expect(usersApi.changePassword).toHaveBeenCalledWith({ new_password: "NewPass123" }, "token-123");
    expect(updateUser).toHaveBeenCalledWith({ ...user, has_password: true });
    expect(await screen.findByText("Password set.")).toBeInTheDocument();
  });
});
