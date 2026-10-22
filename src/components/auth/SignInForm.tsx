import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import { authApi } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import GoogleSignInButton from "./GoogleSignInButton";
import { GOOGLE_CLIENT_ID } from "../../lib/googleAuth";

export default function SignInForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuth } = useAuth();
  const from = (location.state as { from?: { pathname: string } })?.from?.pathname ?? "/";

  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleGoogleCredential = async (credential: string) => {
    setError(null);
    setLoading(true);
    try {
      const res = await authApi.google(credential);
      setAuth(res.user, res.access_token);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await authApi.login(form);
      setAuth(res.user, res.access_token);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full overflow-y-auto lg:w-1/2 no-scrollbar">
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto px-6 py-10 sm:px-0">
        {/* Logo */}
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-brand-500">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M4 3h8l4 4v10H4V3z" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M12 3v4h4" stroke="white" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M7 10h6M7 13h4" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-gray-900 dark:text-white">ResumeFit</span>
          </div>

          <h1 className="mb-2 font-semibold text-gray-900 text-title-sm dark:text-white sm:text-title-md">
            Welcome back
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Sign in to your account to continue tailoring your resume.
          </p>
        </div>

        <GoogleSignInButton
          text="signin_with"
          onCredential={handleGoogleCredential}
          onError={setError}
        />

        {/* Divider — only when there's a Google option to divide from */}
        <div className={`relative mb-5 ${GOOGLE_CLIENT_ID ? "" : "hidden"}`}>
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 text-gray-400 bg-white dark:bg-gray-900">or sign in with email</span>
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="flex items-start gap-2 p-3 mb-4 text-sm text-error-700 bg-error-50 border border-error-200 rounded-lg dark:bg-error-500/15 dark:border-error-500/30 dark:text-error-400">
            <svg className="mt-0.5 shrink-0" width="16" height="16" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" clipRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm-.75-4.75a.75.75 0 001.5 0v-4.5a.75.75 0 00-1.5 0v4.5zm.75-7a.75.75 0 100 1.5.75.75 0 000-1.5z"/>
            </svg>
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-5">
            <div>
              <Label>
                Email <span className="text-error-500">*</span>
              </Label>
              <Input
                type="email"
                id="email"
                name="email"
                placeholder="jane@company.com"
                value={form.email}
                onChange={handleChange}
                required
              />
            </div>

            <div>
              <Label>
                Password <span className="text-error-500">*</span>
              </Label>
              <div className="relative">
                <Input
                  type={showPassword ? "text" : "password"}
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  value={form.password}
                  onChange={handleChange}
                  required
                />
                <span
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                >
                  {showPassword ? (
                    <EyeIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                  ) : (
                    <EyeCloseIcon className="fill-gray-500 dark:fill-gray-400 size-5" />
                  )}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Checkbox checked={rememberMe} onChange={setRememberMe} />
                <span className="text-sm text-gray-600 dark:text-gray-400">Keep me logged in</span>
              </div>
              <Link
                to="/reset-password"
                className="text-sm text-brand-500 hover:text-brand-600 dark:text-brand-400"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex items-center justify-center w-full px-4 py-3 text-sm font-semibold text-white transition rounded-lg bg-brand-500 shadow-theme-xs hover:bg-brand-600 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <svg className="w-4 h-4 mr-2 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Signing in…
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </div>
        </form>

        <p className="mt-6 text-sm text-center text-gray-500 dark:text-gray-400">
          Don't have an account?{" "}
          <Link to="/signup" className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">
            Sign up free
          </Link>
        </p>
      </div>
    </div>
  );
}
