"use client";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Signup() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("teacher");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    name?: string;
    email?: string;
    password?: string;
  }>({});

  const validateForm = () => {
    const errors: { name?: string; email?: string; password?: string } = {};

    // Name validation
    if (!name.trim()) {
      errors.name = "Name is required";
    } else if (name.trim().length < 2) {
      errors.name = "Name must be at least 2 characters";
    }

    // Email validation
    if (!email) {
      errors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      errors.email = "Please enter a valid email";
    }

    // Password validation
    if (!password) {
      errors.password = "Password is required";
    } else if (password.length < 8) {
      errors.password = "Password must be at least 8 characters";
    } else if (!/(?=.*[a-z])(?=.*[A-Z])/.test(password)) {
      errors.password = "Password must contain uppercase and lowercase letters";
    } else if (!/(?=.*\d)/.test(password)) {
      errors.password = "Password must contain at least one number";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    setSuccess(false);

    // Validate form
    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();

      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: name,
            role: role,
          },
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (signUpError) {
        throw signUpError;
      }

      if (data.user) {
        // Check if email confirmation is required
        if (data.user.identities && data.user.identities.length === 0) {
          setError("This email is already registered. Please log in instead.");
        } else {
          setSuccess(true);
        }
      }
    } catch (err: any) {
      console.error("Signup error:", err);

      // Handle specific error messages
      if (err.message?.includes("User already registered")) {
        setError("This email is already registered. Please log in instead.");
      } else if (err.message?.includes("Password should be at least")) {
        setError("Password does not meet requirements.");
      } else {
        setError(err.message || "An error occurred during signup. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignup = async () => {
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
    } catch (err: any) {
      setError(err.message || "Failed to sign up with Google");
    }
  };

  // Show success message
  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6 py-24">
        <div className="w-full max-w-md">
          <div className="text-center">
            {/* Success Icon */}
            <div className="mx-auto w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-6">
              <svg
                className="w-8 h-8 text-emerald-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            {/* Success Message */}
            <h1
              className="text-3xl font-semibold text-gray-900 mb-3"
              style={{ fontFamily: '"Syne", "IBM Plex Sans", system-ui, sans-serif' }}
            >
              Check your email
            </h1>
            <p
              className="text-base text-gray-600 mb-8 leading-relaxed"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              We've sent a verification link to <strong>{email}</strong>.
              <br />
              Click the link in the email to activate your account.
            </p>

            {/* Info Box */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-6 text-left">
              <p
                className="text-sm text-emerald-900"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                <strong>Next steps:</strong>
                <br />
                1. Check your inbox (and spam folder)
                <br />
                2. Click the verification link
                <br />
                3. Log in to start creating VR experiences
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              <Link
                href="/login"
                className="block w-full px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-medium transition-all duration-300 shadow-sm hover:shadow-md text-center"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                Go to Login
              </Link>
              <button
                onClick={() => setSuccess(false)}
                className="block w-full px-6 py-3 bg-white border border-gray-200 hover:border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg font-medium transition-all duration-300 text-center"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                Sign up with different email
              </button>
            </div>

            <p
              className="mt-6 text-xs text-gray-500"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              Didn't receive the email?{" "}
              <button
                onClick={() => {
                  setSuccess(false);
                  setError("Please try signing up again or contact support.");
                }}
                className="text-emerald-600 hover:text-emerald-700 font-medium"
              >
                Contact support
              </button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-24">
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1
            className="text-4xl font-semibold text-gray-900 mb-3"
            style={{ fontFamily: '"Syne", "IBM Plex Sans", system-ui, sans-serif' }}
          >
            Create your account
          </h1>
          <p
            className="text-base text-gray-600"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            Start creating immersive VR experiences today
          </p>
        </div>

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
              htmlFor="name"
              className="block text-sm font-medium text-gray-900 mb-2"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              Full Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (fieldErrors.name) {
                  setFieldErrors({ ...fieldErrors, name: undefined });
                }
              }}
              className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 transition text-gray-900 ${
                fieldErrors.name
                  ? "border-red-300 focus:ring-red-500 focus:border-transparent"
                  : "border-gray-200 focus:ring-emerald-500 focus:border-transparent"
              }`}
              placeholder="Jane Smith"
              disabled={loading}
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            />
            {fieldErrors.name && (
              <p
                className="mt-1.5 text-sm text-red-600"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                {fieldErrors.name}
              </p>
            )}
          </div>

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
            <label
              htmlFor="password"
              className="block text-sm font-medium text-gray-900 mb-2"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              Password
            </label>
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
            {fieldErrors.password ? (
              <p
                className="mt-1.5 text-sm text-red-600"
                style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
              >
                {fieldErrors.password}
              </p>
            ) : (
              <p className="mt-2 text-xs text-gray-500" style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}>
                At least 8 characters with uppercase, lowercase, and numbers
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="role"
              className="block text-sm font-medium text-gray-900 mb-2"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              I am a
            </label>
            <select
              id="role"
              value={role}
              onChange={(e) => setRole(e.target.value)}
              disabled={loading}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition text-gray-900 bg-white"
              style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
            >
              <option value="teacher">Teacher</option>
              <option value="student">Student</option>
              <option value="admin">School Administrator</option>
              <option value="other">Other</option>
            </select>
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
                Creating account...
              </>
            ) : (
              "Sign Up"
            )}
          </button>

          <p
            className="text-xs text-gray-500 text-center"
            style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
          >
            By signing up, you agree to our{" "}
            <Link href="/terms" className="text-emerald-600 hover:text-emerald-700">
              Terms
            </Link>{" "}
            and{" "}
            <Link href="/privacy" className="text-emerald-600 hover:text-emerald-700">
              Privacy Policy
            </Link>
          </p>
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

        {/* Social Signup */}
        <div className="space-y-3">
          <button
            type="button"
            onClick={handleGoogleSignup}
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

        {/* Log in link */}
        <p
          className="mt-8 text-center text-sm text-gray-600"
          style={{ fontFamily: '"DM Sans", system-ui, sans-serif' }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            className="text-emerald-600 hover:text-emerald-700 font-medium transition"
          >
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
