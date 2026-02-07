"use client";
import Link from "next/link";
import { useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get("redirect") || "/";
  const messageParam = searchParams.get("message");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(messageParam);
  const [fieldErrors, setFieldErrors] = useState<{
    email?: string;
    password?: string;
  }>({});

  const validateForm = () => {
    const errors: { email?: string; password?: string } = {};

    // Email validation
    if (!email) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Please enter a valid email";
    }

    // Password validation
    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 6) {
      errors.password = "Password must be at least 6 characters";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        throw signInError;
      }

      if (data.user) {
        // Success! Redirect to specified page or default
        router.push(redirectTo);
        router.refresh();
      }
    } catch (err: any) {
      console.error("Login error:", err);

      // Handle specific error messages
      if (err.message?.includes("Invalid login credentials")) {
        setError("Invalid email or password. Please try again.");
      } else if (err.message?.includes("Email not confirmed")) {
        setError("Please verify your email before logging in.");
      } else {
        setError(err.message || "An error occurred during login. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const supabase = createClient();
      // Build callback URL with redirect destination
      const callbackUrl = new URL("/auth/callback", window.location.origin);
      if (redirectTo !== "/") {
        callbackUrl.searchParams.set("redirect", redirectTo);
      }

      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: callbackUrl.toString(),
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Failed to sign in with Google");
    }
  };

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-24">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-4xl font-semibold text-gray-900 mb-3"
            style={{ fontFamily: '"Syne", "IBM Plex Sans", system-ui, sans-serif' }}
          >
            Welcome back
          </h1>
          <p
            className="text-base text-gray-600"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            Log in to continue creating VR experiences
          </p>
        </div>

        {/* Info Message (e.g., redirect from checkout) */}
        {infoMessage && !error && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                  clipRule="evenodd"
                />
              </svg>
              <p
                className="text-sm text-blue-800"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                {infoMessage}
              </p>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-start gap-3">
              <svg
                className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5"
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                  clipRule="evenodd"
                />
              </svg>
              <p
                className="text-sm text-red-800"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                {error}
              </p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-900 mb-2"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (fieldErrors.email) {
                  setFieldErrors({ ...fieldErrors, email: undefined });
                }
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition text-gray-900 ${
                fieldErrors.email
                  ? "border-red-300 focus:ring-red-500 focus:border-transparent"
                  : "border-gray-200 focus:ring-emerald-500 focus:border-transparent"
              }`}
              placeholder="you@example.com"
              disabled={loading}
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            />
            {fieldErrors.email && (
              <p
                className="mt-1.5 text-sm text-red-600"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                {fieldErrors.email}
              </p>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-900"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                Password
              </label>
              <Link
                href="/reset-password"
                className="text-sm text-emerald-600 hover:text-emerald-700 font-medium transition"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                Forgot?
              </Link>
            </div>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (fieldErrors.password) {
                  setFieldErrors({ ...fieldErrors, password: undefined });
                }
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition text-gray-900 ${
                fieldErrors.password
                  ? "border-red-300 focus:ring-red-500 focus:border-transparent"
                  : "border-gray-200 focus:ring-emerald-500 focus:border-transparent"
              }`}
              placeholder="••••••••"
              disabled={loading}
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            />
            {fieldErrors.password && (
              <p
                className="mt-1.5 text-sm text-red-600"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                {fieldErrors.password}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full px-6 py-3 rounded-lg font-medium transition-all duration-300 shadow-sm flex items-center justify-center gap-2 ${
              loading
                ? "bg-emerald-400 cursor-not-allowed"
                : "bg-emerald-600 hover:bg-emerald-700 hover:shadow-md"
            } text-white`}
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            {loading ? (
              <>
                <svg
                  className="animate-spin h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Logging in...
              </>
            ) : (
              "Log In"
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative my-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-200"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span
              className="px-4 bg-white text-gray-500"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              Or continue with
            </span>
          </div>
        </div>

        {/* Social Login */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className={`w-full px-6 py-3 bg-white border rounded-lg font-medium transition-all duration-300 flex items-center justify-center gap-3 ${
              loading
                ? "border-gray-200 text-gray-400 cursor-not-allowed"
                : "border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700"
            }`}
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Sign up link */}
        <p
          className="mt-8 text-center text-sm text-gray-600"
          style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
        >
          Don't have an account?{" "}
          <Link
            href="/signup"
            className="text-emerald-600 hover:text-emerald-700 font-medium transition"
          >
            Sign up
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function Login() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full"></div>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
