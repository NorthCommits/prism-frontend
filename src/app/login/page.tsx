"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";

type AuthMode = "sign_in" | "sign_up";
type TabId = "password" | "magic";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [activeTab, setActiveTab] = useState<TabId>("password");
  const [authMode, setAuthMode] = useState<AuthMode>("sign_in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      if (activeTab === "password") {
        if (authMode === "sign_up") {
          if (!email || !password || !confirmPassword) {
            setError("Please fill in all fields.");
            return;
          }
          if (password !== confirmPassword) {
            setError("Passwords do not match.");
            return;
          }
          const { error: signUpError } = await supabase.auth.signUp({
            email,
            password,
          });
          if (signUpError) {
            setError(signUpError.message);
            return;
          }
          setSuccess("Account created. Redirecting...");
          router.push("/");
        } else {
          const { error: signInError } =
            await supabase.auth.signInWithPassword({
              email,
              password,
            });
          if (signInError) {
            setError(signInError.message);
            return;
          }
          router.push("/");
        }
      } else {
        if (!email) {
          setError("Please enter your email.");
          return;
        }
        const { error: otpError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: window.location.origin,
          },
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f] bg-[radial-gradient(circle_at_center,_#7c3aed,_#2563eb,_#06b6d4_60%)] px-4 text-foreground">
      <div className="w-full max-w-md rounded-2xl border border-border/40 bg-background/90 p-6 shadow-xl backdrop-blur">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-md bg-gradient-to-br from-sky-500 via-violet-500 to-emerald-400 text-sm font-semibold text-white shadow">
            P
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-semibold tracking-tight">Prism</h1>
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                beta
              </span>
            </div>
            <p className="text-xs text-muted-foreground">Sign in to continue</p>
          </div>
        </div>

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

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-3">
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                <Mail className="size-3.5" />
              </span>
              <input
                type="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="you@example.com"
                className="h-9 w-full rounded-full border border-border bg-background/80 pl-9 pr-3 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/40"
              />
            </div>

            {activeTab === "password" && (
              <>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                    <Lock className="size-3.5" />
                  </span>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={
                      authMode === "sign_in" ? "Password" : "Create a password"
                    }
                    className="h-9 w-full rounded-full border border-border bg-background/80 pl-9 pr-3 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/40"
                  />
                </div>
                {authMode === "sign_up" && (
                  <div className="relative">
                    <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                      <Lock className="size-3.5" />
                    </span>
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Confirm password"
                      className="h-9 w-full rounded-full border border-border bg-background/80 pl-9 pr-3 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/40"
                    />
                  </div>
                )}
              </>
            )}
          </div>

          {error && (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-[11px] text-destructive">
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-2 rounded-md border border-emerald-400/40 bg-emerald-400/10 px-3 py-2 text-[11px] text-emerald-300">
              <Sparkles className="size-3" />
              <span>{success}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={isLoading}
            className="flex h-9 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#7c3aed] to-[#2563eb] text-xs font-medium text-white shadow transition-transform hover:scale-[1.01]"
          >
            {isLoading
              ? "Working..."
              : activeTab === "password"
              ? authMode === "sign_in"
                ? "Sign In"
                : "Sign Up"
              : "Send Magic Link"}
          </Button>
        </form>

        {activeTab === "password" && (
          <div className="mt-4 text-center text-[11px] text-muted-foreground">
            {authMode === "sign_in" ? (
              <>
                <span>Don&apos;t have an account? </span>
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode("sign_up");
                    setError(null);
                    setSuccess(null);
                  }}
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
                  onClick={() => {
                    setAuthMode("sign_in");
                    setError(null);
                    setSuccess(null);
                  }}
                  className="font-medium text-[#c4b5fd] hover:text-[#e9d5ff]"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

