"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Lock, Mail, Sparkles, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";

// Three distinct "screens" within the same card.
type View = "sign_in" | "sign_up" | "forgot_password";
type TabId = "password" | "magic";

// Per-field inline validation errors shown below each input.
type FieldErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
};

// Shared class for every text/password/email input.
const inputBase =
  "h-9 w-full rounded-full border bg-background/80 pl-9 pr-3 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-[#7c3aed]/40";
const inputNormal = "border-border focus:border-[#7c3aed]";
const inputError = "border-red-500/70 focus:border-red-500";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [view, setView] = useState<View>("sign_in");
  const [activeTab, setActiveTab] = useState<TabId>("password");

  // Shared fields (re-used across views where applicable).
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Sign-up extra fields.
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  // ── Helpers ──────────────────────────────────────────────────────────────

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
    setFieldErrors({});
  };

  const switchTo = (nextView: View) => {
    clearMessages();
    setView(nextView);
  };

  // Validates sign-up fields, populates fieldErrors, returns true if clean.
  const validateSignUp = (): boolean => {
    const errs: FieldErrors = {};
    if (!firstName.trim()) errs.firstName = "First name is required";
    if (!lastName.trim()) errs.lastName = "Last name is required";
    if (!email.trim()) {
      errs.email = "Email is required";
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errs.email = "Enter a valid email address";
    }
    if (!password) {
      errs.password = "Password is required";
    } else if (password.length < 8) {
      errs.password = "Password must be at least 8 characters";
    }
    if (!confirmPassword) {
      errs.confirmPassword = "Please confirm your password";
    } else if (password !== confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // ── Submit handlers ───────────────────────────────────────────────────────

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      // ── Forgot password ─────────────────────────────────────────────────
      if (view === "forgot_password") {
        if (!email.trim()) {
          setError("Please enter your email.");
          return;
        }
        const { error: resetError } =
          await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/reset-password`,
          });
        if (resetError) {
          setError(resetError.message);
          return;
        }
        setSuccess("Password reset link sent! Check your email.");
        return;
      }

      if (activeTab === "password") {
        // ── Sign up ─────────────────────────────────────────────────────
        if (view === "sign_up") {
          if (!validateSignUp()) return;

          const displayName = `${firstName.trim()} ${lastName.trim()}`;

          const { data, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
              data: {
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                full_name: displayName,
              },
            },
          });

          if (signUpError) {
            setError(signUpError.message);
            return;
          }

          const token = data.session?.access_token;

          if (token) {
            // Session available immediately — save the full profile now.
            try {
              await fetch(
                `${process.env.NEXT_PUBLIC_API_URL}/api/v1/profile`,
                {
                  method: "POST",
                  headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json",
                  },
                  body: JSON.stringify({
                    display_name: displayName,
                    about_you: "",
                    custom_instructions: "",
                    response_style: "balanced",
                  }),
                }
              );
            } catch {
              // Non-fatal — profile can be completed later.
            }
          } else {
            // Email verification required: store name for after confirmation.
            try {
              window.localStorage.setItem(
                "prism_pending_profile",
                JSON.stringify({ display_name: displayName })
              );
            } catch {
              // localStorage unavailable — ignore.
            }
          }

          setSuccess(
            "Account created! Please check your email to verify your account."
          );

          // After 3 s, reset to sign-in with a clean form.
          window.setTimeout(() => {
            setView("sign_in");
            setSuccess(null);
            setFirstName("");
            setLastName("");
            setPassword("");
            setConfirmPassword("");
          }, 3000);

        } else {
          // ── Sign in (unchanged) ────────────────────────────────────────
          const { error: signInError } =
            await supabase.auth.signInWithPassword({ email, password });
          if (signInError) {
            setError(signInError.message);
            return;
          }
          router.push("/");
        }
      } else {
        // ── Magic link (unchanged) ─────────────────────────────────────
        if (!email) {
          setError("Please enter your email.");
          return;
        }
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin },
        });
        if (otpError) {
          setError(otpError.message);
          return;
        }
        setSuccess("Check your email for a magic link!");
      }
    } finally {
      setIsLoading(false);
    }
  };

  // ── Derived header copy ───────────────────────────────────────────────────

  const subtitle =
    view === "sign_in"
      ? "Sign in to continue"
      : view === "sign_up"
      ? "Create your account"
      : "Reset your password";

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] bg-[radial-gradient(circle_at_center,_#7c3aed,_#2563eb,_#06b6d4_60%)] px-4 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border/40 bg-background/90 p-6 shadow-xl backdrop-blur transition-all duration-300">

        {/* Header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-sky-500 via-violet-500 to-emerald-400 text-sm font-semibold text-white shadow">
            P
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Prism</h1>
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          </div>
        </div>

        {/* ── Forgot password view ─────────────────────────────────────── */}
        {view === "forgot_password" && (
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                <Mail className="size-3.5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className={`${inputBase} ${inputNormal}`}
              />
            </div>
            <p className="text-center text-[11px] text-muted-foreground">
              Enter your email and we&apos;ll send you a reset link.
            </p>

            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
                {error}
              </div>
            )}
            {success && (
              <div className="flex items-center gap-2 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-[11px] text-emerald-300">
                <Sparkles className="size-3 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="flex h-9 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#7c3aed] to-[#2563eb] text-xs font-medium text-white shadow transition-transform hover:scale-[1.01]"
            >
              {isLoading ? "Sending…" : "Send Reset Link"}
            </Button>

            <div className="pt-1 text-center">
              <button
                type="button"
                onClick={() => switchTo("sign_in")}
                className="inline-flex items-center gap-1 text-[11px] text-[#c4b5fd] hover:text-[#e9d5ff]"
              >
                <ArrowLeft className="size-3" />
                Back to Sign In
              </button>
            </div>
          </form>
        )}

        {/* ── Sign in / Sign up views ───────────────────────────────────── */}
        {view !== "forgot_password" && (
          <>
            {/* Password / Magic Link tab switcher — only in sign-in */}
            {view === "sign_in" && (
              <div className="mb-4 flex rounded-full border border-border bg-muted/40 p-1 text-xs">
                <button
                  type="button"
                  onClick={() => setActiveTab("password")}
                  className={`flex-1 rounded-full px-3 py-1.5 text-center transition-colors ${
                    activeTab === "password"
                      ? "bg-background text-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Email &amp; Password
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("magic")}
                  className={`flex-1 rounded-full px-3 py-1.5 text-center transition-colors ${
                    activeTab === "magic"
                      ? "bg-background text-foreground shadow"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Magic Link
                </button>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">

              {/* Name row — sign-up only */}
              {view === "sign_up" && (
                <div className="flex gap-2">
                  <div className="flex-1">
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                        <User className="size-3.5" />
                      </span>
                      <input
                        type="text"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder="First name"
                        className={`${inputBase} ${fieldErrors.firstName ? inputError : inputNormal}`}
                      />
                    </div>
                    {fieldErrors.firstName && (
                      <p className="mt-1 px-2 text-[10px] text-red-400">
                        {fieldErrors.firstName}
                      </p>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                        <User className="size-3.5" />
                      </span>
                      <input
                        type="text"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder="Last name"
                        className={`${inputBase} ${fieldErrors.lastName ? inputError : inputNormal}`}
                      />
                    </div>
                    {fieldErrors.lastName && (
                      <p className="mt-1 px-2 text-[10px] text-red-400">
                        {fieldErrors.lastName}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Email */}
              <div>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                    <Mail className="size-3.5" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className={`${inputBase} ${fieldErrors.email ? inputError : inputNormal}`}
                  />
                </div>
                {fieldErrors.email && (
                  <p className="mt-1 px-2 text-[10px] text-red-400">
                    {fieldErrors.email}
                  </p>
                )}
              </div>

              {/* Password fields — password tab only */}
              {activeTab === "password" && (
                <>
                  <div>
                    <div className="relative">
                      <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                        <Lock className="size-3.5" />
                      </span>
                      <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder={
                          view === "sign_in" ? "Password" : "Create a password"
                        }
                        className={`${inputBase} ${fieldErrors.password ? inputError : inputNormal}`}
                      />
                    </div>
                    {fieldErrors.password && (
                      <p className="mt-1 px-2 text-[10px] text-red-400">
                        {fieldErrors.password}
                      </p>
                    )}

                    {/* Forgot password link — sign-in only */}
                    {view === "sign_in" && (
                      <div className="mt-1.5 px-1 text-right">
                        <button
                          type="button"
                          onClick={() => switchTo("forgot_password")}
                          className="text-[10px] text-muted-foreground/70 hover:text-[#c4b5fd] transition-colors"
                        >
                          Forgot password?
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Confirm password — sign-up only */}
                  {view === "sign_up" && (
                    <div>
                      <div className="relative">
                        <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                          <Lock className="size-3.5" />
                        </span>
                        <input
                          type="password"
                          required
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          placeholder="Confirm password"
                          className={`${inputBase} ${fieldErrors.confirmPassword ? inputError : inputNormal}`}
                        />
                      </div>
                      {fieldErrors.confirmPassword && (
                        <p className="mt-1 px-2 text-[10px] text-red-400">
                          {fieldErrors.confirmPassword}
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Global banners */}
              {error && (
                <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
                  {error}
                </div>
              )}
              {success && (
                <div className="flex items-center gap-2 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-[11px] text-emerald-300">
                  <Sparkles className="size-3 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              <Button
                type="submit"
                disabled={isLoading}
                className="flex h-9 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#7c3aed] to-[#2563eb] text-xs font-medium text-white shadow transition-transform hover:scale-[1.01]"
              >
                {isLoading
                  ? "Working…"
                  : activeTab === "password"
                  ? view === "sign_in"
                    ? "Sign In"
                    : "Create Account"
                  : "Send Magic Link"}
              </Button>
            </form>

            {/* Toggle sign-in / sign-up */}
            {activeTab === "password" && (
              <div className="mt-4 text-center text-[11px] text-muted-foreground">
                {view === "sign_in" ? (
                  <>
                    <span>Don&apos;t have an account? </span>
                    <button
                      type="button"
                      onClick={() => switchTo("sign_up")}
                      className="font-medium text-[#c4b5fd] hover:text-[#e9d5ff]"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    <span>Already have an account? </span>
                    <button
                      type="button"
                      onClick={() => switchTo("sign_in")}
                      className="font-medium text-[#c4b5fd] hover:text-[#e9d5ff]"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
