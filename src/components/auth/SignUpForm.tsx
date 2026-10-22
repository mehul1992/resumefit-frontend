import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { EyeCloseIcon, EyeIcon } from "../../icons";
import Label from "../form/Label";
import Input from "../form/input/InputField";
import Checkbox from "../form/input/Checkbox";
import { authApi } from "../../api/auth";
import { useAuth } from "../../context/AuthContext";
import GoogleSignInButton from "./GoogleSignInButton";
import { GOOGLE_CLIENT_ID } from "../../lib/googleAuth";

export default function SignUpForm() {
  const navigate = useNavigate();
  const { setAuth } = useAuth();

  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
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
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!agreed) {
      setError("Please accept the Terms of Service and Privacy Policy.");
      return;
    }

    setLoading(true);
    try {
      // Create account
      await authApi.signup(form);

      // Auto sign-in after signup
      const loginRes = await authApi.login({
        email: form.email,
        password: form.password,
      });

      setAuth(loginRes.user, loginRes.access_token);
      navigate("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Signup failed. Please try again.");
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
            Create your free account
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Tailor your resume to any job in seconds with AI. No credit card required.
          </p>
        </div>

        <GoogleSignInButton
          text="signup_with"
          onCredential={handleGoogleCredential}
          onError={setError}
        />

        {GOOGLE_CLIENT_ID && (
          <p className="-mt-2 mb-5 text-center text-xs text-gray-500 dark:text-gray-400">
            By continuing with Google, you agree to the Terms of Service and Privacy Policy.
          </p>
        )}

        {/* Divider — only when there's a Google option to divide from */}
        <div className={`relative mb-5 ${GOOGLE_CLIENT_ID ? "" : "hidden"}`}>
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-3 text-gray-400 bg-white dark:bg-gray-900">or sign up with email</span>
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
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>
                  First Name <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="text"
                  id="first_name"
                  name="first_name"
                  placeholder="Jane"
                  value={form.first_name}
                  onChange={handleChange}
                  required
                />
              </div>
              <div>
                <Label>
                  Last Name <span className="text-error-500">*</span>
                </Label>
                <Input
                  type="text"
                  id="last_name"
                  name="last_name"
                  placeholder="Doe"
                  value={form.last_name}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>

            <div>
              <Label>
                Work Email <span className="text-error-500">*</span>
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
                  placeholder="Min. 8 characters"
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

            <div className="flex items-start gap-3">
              <Checkbox
                className="w-5 h-5 mt-0.5 shrink-0"
                checked={agreed}
                onChange={setAgreed}
              />
              <p className="text-sm text-gray-500 dark:text-gray-400">
                I agree to the{" "}
                <Link to="/terms" className="text-brand-500 hover:underline">
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link to="/privacy" className="text-brand-500 hover:underline">
                  Privacy Policy
                </Link>
              </p>
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
                  Creating account…
                </>
              ) : (
                "Create Free Account"
              )}
            </button>
          </div>
        </form>

        <p className="mt-6 text-sm text-center text-gray-500 dark:text-gray-400">
          Already have an account?{" "}
          <Link to="/signin" className="font-medium text-brand-500 hover:text-brand-600 dark:text-brand-400">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
