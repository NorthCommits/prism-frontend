"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase";

const inputBase =
  "h-9 w-full rounded-full border bg-background/80 pl-9 pr-3 text-xs text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:ring-2 focus:ring-[#7c3aed]/40";
const inputNormal = "border-border focus:border-[#7c3aed]";
const inputError = "border-red-500/70 focus:border-red-500";

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = createClient();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // Supabase embeds the recovery token in the URL hash on redirect.
  // Calling getSession() is enough for the client to pick it up automatically.
  useEffect(() => {
    supabase.auth.getSession();
  }, [supabase]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    setSuccess(null);
    setPasswordError(null);
    setConfirmError(null);

    // Inline validation
    let hasError = false;
    if (newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters");
      hasError = true;
    }
    if (newPassword !== confirmPassword) {
      setConfirmError("Passwords do not match");
      hasError = true;
    }
    if (hasError) return;

    setIsLoading(true);
    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) {
        setError(updateError.message);
        return;
      }

      setSuccess("Password updated! Redirecting to login…");
      window.setTimeout(() => router.push("/login"), 2000);
    } finally {
      setIsLoading(false);
    }
  };

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
            <p className="text-xs text-muted-foreground">Set a new password</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">

          {/* New password */}
          <div>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-muted-foreground">
                <Lock className="size-3.5" />
              </span>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="New password (min 8 chars)"
                className={`${inputBase} ${passwordError ? inputError : inputNormal}`}
              />
            </div>
            {passwordError && (
              <p className="mt-1 px-2 text-[10px] text-red-400">
                {passwordError}
              </p>
            )}
          </div>

          {/* Confirm new password */}
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
                placeholder="Confirm new password"
                className={`${inputBase} ${confirmError ? inputError : inputNormal}`}
              />
            </div>
            {confirmError && (
              <p className="mt-1 px-2 text-[10px] text-red-400">
                {confirmError}
              </p>
            )}
          </div>

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
            disabled={isLoading || !!success}
            className="flex h-9 w-full items-center justify-center rounded-full bg-gradient-to-r from-[#7c3aed] to-[#2563eb] text-xs font-medium text-white shadow transition-transform hover:scale-[1.01]"
          >
            {isLoading ? "Updating…" : "Update Password"}
          </Button>
        </form>
      </div>
    </div>
  );
}
