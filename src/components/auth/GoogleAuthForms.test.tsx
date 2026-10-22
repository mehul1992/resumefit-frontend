import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { authApi, type LoginResponse } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import SignInForm from "./SignInForm";
import SignUpForm from "./SignUpForm";

vi.mock("../../context/AuthContext", () => ({ useAuth: vi.fn() }));
vi.mock("../../api/auth", () => ({ authApi: { google: vi.fn(), login: vi.fn(), signup: vi.fn() } }));
// Stand-in for Google's iframe button: clicking it "returns" an ID token.
vi.mock("../../lib/googleAuth", () => ({ GOOGLE_CLIENT_ID: "client-123" }));
vi.mock("./GoogleSignInButton", () => ({
  default: ({ onCredential }: { onCredential: (credential: string) => void }) => (
    <button type="button" onClick={() => onCredential("google-id-token")}>
      Google
    </button>
  ),
}));

const login: LoginResponse = {
  access_token: "session-token",
  token_type: "bearer",
  user: {
    id: 1,
    first_name: "Gia",
    last_name: "Google",
    email: "gia@example.com",
    age: null,
    mobile_number: null,
    designation: null,
    location: null,
    linkedin_url: null,
    avatar_url: null,
    has_password: false,
    is_active: true,
    created_at: "2026-10-22T00:00:00Z",
    updated_at: "2026-10-22T00:00:00Z",
  },
};

const setAuth = vi.fn();

function renderAt(path: string) {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/signin" element={<SignInForm />} />
        <Route path="/signup" element={<SignUpForm />} />
        <Route path="/" element={<p>Home page</p>} />
      </Routes>
    </MemoryRouter>
  );
}

describe("Sign in / sign up with Google", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useAuth).mockReturnValue({
      user: null,
      token: null,
      setAuth,
      updateUser: vi.fn(),
      clearAuth: vi.fn(),
      logout: vi.fn(),
      isAuthenticated: false,
    });
  });

  it.each(["/signin", "/signup"])("%s exchanges the Google credential and signs in", async (path) => {
    vi.mocked(authApi.google).mockResolvedValue(login);
    renderAt(path);

    await userEvent.click(screen.getByRole("button", { name: "Google" }));

    expect(authApi.google).toHaveBeenCalledWith("google-id-token");
    expect(setAuth).toHaveBeenCalledWith(login.user, "session-token");
    expect(await screen.findByText("Home page")).toBeInTheDocument();
  });

  it("shows the server's error when Google sign-in is refused", async () => {
    vi.mocked(authApi.google).mockRejectedValue(new Error("Your Google account's email address isn't verified."));
    renderAt("/signin");

    await userEvent.click(screen.getByRole("button", { name: "Google" }));

    expect(await screen.findByText("Your Google account's email address isn't verified.")).toBeInTheDocument();
    expect(setAuth).not.toHaveBeenCalled();
  });

  it("tells new users that Google sign-up accepts the terms", () => {
    renderAt("/signup");
    expect(screen.getByText(/By continuing with Google, you agree/)).toBeInTheDocument();
  });
});
