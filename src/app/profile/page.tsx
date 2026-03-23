"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Brain,
  Check,
  Code2,
  BookOpen,
  Heart,
  Loader2,
  Save,
  Scale,
  Scissors,
  User,
  X,
} from "lucide-react";

import { createClient } from "@/lib/supabase";
import {
  deleteMemory,
  getMemories,
  getProfile,
  saveProfile,
  Memory,
  UserProfile,
  ResponseStyle,
} from "@/lib/profile";
import { ProductivityDashboard } from "@/components/ProductivityDashboard";
import { ToastContainer, ToastProvider, pushToast } from "@/components/Toast";

// ─── Response-style option definitions ───────────────────────────────────────

const RESPONSE_STYLES: {
  id: ResponseStyle;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  {
    id: "balanced",
    label: "Balanced",
    description: "Clear and well-rounded responses",
    Icon: Scale,
  },
  {
    id: "concise",
    label: "Concise",
    description: "Short, direct answers without fluff",
    Icon: Scissors,
  },
  {
    id: "detailed",
    label: "Detailed",
    description: "Comprehensive responses with full explanations",
    Icon: BookOpen,
  },
  {
    id: "friendly",
    label: "Friendly",
    description: "Warm, casual and conversational tone",
    Icon: Heart,
  },
  {
    id: "technical",
    label: "Technical",
    description: "Technical depth, assumes expertise",
    Icon: Code2,
  },
];

// ─── Category badge colours ───────────────────────────────────────────────────

const CATEGORY_STYLES: Record<string, string> = {
  personal:
    "border-[#7c3aed]/30 bg-[#7c3aed]/10 text-[#c4b5fd]",
  technical:
    "border-[#2563eb]/30 bg-[#2563eb]/10 text-[#93c5fd]",
  projects:
    "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  preferences:
    "border-orange-500/30 bg-orange-500/10 text-[#fbbf24]",
  context:
    "border-border bg-muted/50 text-muted-foreground dark:text-white/60",
};

// Render order for category groups.
const CATEGORY_ORDER = [
  "personal",
  "technical",
  "projects",
  "preferences",
  "context",
];

// ─── Skeleton placeholder ─────────────────────────────────────────────────────

function SkeletonField({ rows = 1 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg bg-muted/60"
          style={{
            height: rows === 1 ? "36px" : "20px",
            width: i === 0 ? "100%" : `${90 - i * 10}%`,
          }}
        />
      ))}
    </div>
  );
}

// ─── Section card wrapper ─────────────────────────────────────────────────────

function SectionCard({
  title,
  icon,
  subtitle,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 rounded-xl border border-border bg-background/80 p-5 shadow-sm backdrop-blur-sm dark:border-white/10 dark:bg-[rgba(15,15,20,0.8)]">
      <div>
        <div className="flex items-center gap-2">
          {icon}
          <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        </div>
        {subtitle && (
          <p className="mt-1 text-[11px] text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {children}
    </div>
  );
}

// ─── Single memory chip ───────────────────────────────────────────────────────

function MemoryChip({
  memory,
  isConfirming,
  isDeleting,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: {
  memory: Memory;
  isConfirming: boolean;
  isDeleting: boolean;
  onRequestDelete: () => void;
  onConfirmDelete: () => void;
  onCancelDelete: () => void;
}) {
  const categoryStyle =
    CATEGORY_STYLES[memory.category] ?? CATEGORY_STYLES.context;

  return (
    <div
      className={`group flex flex-col gap-2 rounded-xl border p-3 transition-all duration-200 ${
        isDeleting ? "scale-95 opacity-0" : "scale-100 opacity-100"
      } ${
        isConfirming
          ? "border-red-400/40 bg-red-500/5"
          : "border-border bg-background/60 hover:border-[#7c3aed]/50 hover:bg-background/80"
      }`}
    >
      {/* Top row: category badge + importance + action buttons */}
      <div className="flex items-center justify-between gap-2">
        <span
          className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${categoryStyle}`}
        >
          {memory.category}
        </span>

        <div className="flex items-center gap-1.5">
          {/* Importance dots — 1–5 filled dots in purple */}
          <div className="flex items-center gap-0.5" aria-label={`Importance ${memory.importance} of 5`}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full transition-colors ${
                  i < memory.importance ? "bg-[#7c3aed]" : "bg-muted"
                }`}
              />
            ))}
          </div>

          {isConfirming ? (
            /* Inline confirmation buttons */
            <>
              <button
                type="button"
                onClick={onCancelDelete}
                className="cursor-pointer rounded px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onConfirmDelete}
                className="cursor-pointer rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-500 transition-colors hover:bg-red-500/25"
              >
                Delete
              </button>
            </>
          ) : (
            /* X button — visible on hover */
            <button
              type="button"
              onClick={onRequestDelete}
              aria-label="Delete memory"
              className="cursor-pointer rounded p-0.5 text-muted-foreground/30 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-500"
            >
              <X className="size-3" />
            </button>
          )}
        </div>
      </div>

      {/* Memory text */}
      <p className="text-xs leading-relaxed text-foreground/80 dark:text-white/75">
        {memory.memory}
      </p>
    </div>
  );
}

// ─── Main profile page ────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();

  // ── Auth & loading states ─────────────────────────────────────────────────
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const savedTimerRef = useRef<number | null>(null);

  // ── Profile form state ────────────────────────────────────────────────────
  const [profile, setProfile] = useState<UserProfile>({
    display_name: "",
    about_you: "",
    custom_instructions: "",
    response_style: "balanced",
  });

  // Snapshot of the last persisted state to detect unsaved changes.
  const [savedProfile, setSavedProfile] = useState<UserProfile | null>(null);

  const isDirty =
    savedProfile !== null &&
    JSON.stringify(profile) !== JSON.stringify(savedProfile);

  // ── Memory state ──────────────────────────────────────────────────────────
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isMemoriesLoading, setIsMemoriesLoading] = useState(true);
  // Which memory chip is showing the inline "Are you sure?" prompt.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  // Which memory chip is fading out before being removed from the list.
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.replace("/login");
        return;
      }
      setIsAuthLoading(false);
    });
  }, [router, supabase]);

  // ── Fetch profile ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthLoading) return;
    let cancelled = false;

    getProfile()
      .then((data) => {
        if (cancelled) return;
        const populated: UserProfile = {
          display_name: data.display_name ?? "",
          about_you: data.about_you ?? "",
          custom_instructions: data.custom_instructions ?? "",
          response_style: data.response_style ?? "balanced",
        };
        setProfile(populated);
        setSavedProfile(populated);
      })
      .catch(() => {
        const defaults: UserProfile = {
          display_name: "",
          about_you: "",
          custom_instructions: "",
          response_style: "balanced",
        };
        setProfile(defaults);
        setSavedProfile(defaults);
      })
      .finally(() => {
        if (!cancelled) setIsFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthLoading]);

  // ── Fetch memories ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthLoading) return;
    let cancelled = false;

    getMemories()
      .then((data) => {
        if (!cancelled) setMemories(data);
      })
      .catch(() => {
        // Silently fall through — empty list is fine.
      })
      .finally(() => {
        if (!cancelled) setIsMemoriesLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isAuthLoading]);

  // ── Cleanup timers on unmount ─────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (savedTimerRef.current !== null) {
        window.clearTimeout(savedTimerRef.current);
      }
    };
  }, []);

  // ── Profile handlers ──────────────────────────────────────────────────────

  function updateField<K extends keyof UserProfile>(
    key: K,
    value: UserProfile[K]
  ) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (isSaving) return;
    setIsSaving(true);

    try {
      const updated = await saveProfile(profile);
      const normalised: UserProfile = {
        display_name: updated.display_name ?? "",
        about_you: updated.about_you ?? "",
        custom_instructions: updated.custom_instructions ?? "",
        response_style: updated.response_style ?? "balanced",
      };
      setSavedProfile(normalised);
      setProfile(normalised);
      setIsSaved(true);
      pushToast("Profile saved successfully", "success");

      savedTimerRef.current = window.setTimeout(() => {
        setIsSaved(false);
      }, 2000);
    } catch {
      pushToast("Failed to save profile", "error");
    } finally {
      setIsSaving(false);
    }
  }

  // ── Memory handlers ───────────────────────────────────────────────────────

  function handleRequestDelete(id: string) {
    setConfirmDeleteId(id);
  }

  function handleCancelDelete() {
    setConfirmDeleteId(null);
  }

  async function handleConfirmDelete(id: string) {
    // Start the fade-out CSS transition, then remove from list after it plays.
    setConfirmDeleteId(null);
    setDeletingId(id);

    window.setTimeout(async () => {
      try {
        await deleteMemory(id);
        setMemories((prev) => prev.filter((m) => m.id !== id));
        pushToast("Memory deleted", "success");
      } catch {
        pushToast("Failed to delete memory", "error");
      } finally {
        setDeletingId(null);
      }
    }, 200);
  }

  // ── Group memories by category (sorted by importance desc within each) ────
  const memoriesByCategory = useMemo(() => {
    const groups: Record<string, Memory[]> = {};
    for (const m of memories) {
      const cat = m.category || "context";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(m);
    }
    for (const cat of Object.keys(groups)) {
      groups[cat].sort((a, b) => b.importance - a.importance);
    }
    return groups;
  }, [memories]);

  const sortedCategories = Object.keys(memoriesByCategory).sort((a, b) => {
    const ai = CATEGORY_ORDER.indexOf(a);
    const bi = CATEGORY_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  // ── Auth spinner ──────────────────────────────────────────────────────────
  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isLoading = isFetching;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <ToastProvider>
      <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
        {/* ── Sticky top bar ────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 border-b border-border/60 bg-background/90 backdrop-blur-sm">
          <div className="mx-auto flex max-w-[640px] items-center justify-between px-4 py-3">
            <button
              type="button"
              onClick={() => router.push("/")}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Back to Chat
            </button>

            {isDirty && !isSaving && (
              <span className="rounded-full bg-amber-400/15 px-2.5 py-1 text-[10px] font-medium text-amber-500 ring-1 ring-amber-400/30">
                Unsaved changes
              </span>
            )}
          </div>
        </div>

        {/* ── Page header ───────────────────────────────────────────────── */}
        <div className="mx-auto max-w-[640px] px-4 pb-24 pt-8">
          <div className="mb-8 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] shadow-md">
              <User className="size-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold tracking-tight">
                Profile Settings
              </h1>
              <p className="text-xs text-muted-foreground">
                Customize how Prism responds to you
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <ProductivityDashboard authReady={!isAuthLoading} />

            {/* ── A. Personal Info ──────────────────────────────────────── */}
            <SectionCard title="Personal Info">
              <div className="space-y-1.5">
                <label
                  htmlFor="display_name"
                  className="block text-xs font-medium text-muted-foreground"
                >
                  Your Name
                </label>
                {isLoading ? (
                  <SkeletonField />
                ) : (
                  <input
                    id="display_name"
                    type="text"
                    value={profile.display_name ?? ""}
                    onChange={(e) =>
                      updateField("display_name", e.target.value)
                    }
                    placeholder="How should Prism address you?"
                    className="h-9 w-full rounded-lg border border-border bg-background/80 px-3 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/30"
                  />
                )}
              </div>
            </SectionCard>

            {/* ── B. About You ──────────────────────────────────────────── */}
            <SectionCard title="About You">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="about_you"
                    className="block text-xs font-medium text-muted-foreground"
                  >
                    About You
                  </label>
                  {!isLoading && (
                    <span className="text-[10px] text-muted-foreground/60">
                      {(profile.about_you ?? "").length} / 500
                    </span>
                  )}
                </div>
                {isLoading ? (
                  <SkeletonField rows={4} />
                ) : (
                  <textarea
                    id="about_you"
                    rows={4}
                    maxLength={500}
                    value={profile.about_you ?? ""}
                    onChange={(e) => updateField("about_you", e.target.value)}
                    placeholder={
                      "Tell Prism about yourself — your role, expertise, background, or anything that helps it understand you better.\n" +
                      "e.g. I am a senior Python developer working on ML pipelines at a pharma company"
                    }
                    className="w-full resize-none rounded-lg border border-border bg-background/80 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/30"
                  />
                )}
              </div>
            </SectionCard>

            {/* ── C. Custom Instructions ────────────────────────────────── */}
            <SectionCard title="Custom Instructions">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="custom_instructions"
                    className="block text-xs font-medium text-muted-foreground"
                  >
                    Custom Instructions
                  </label>
                  {!isLoading && (
                    <span className="text-[10px] text-muted-foreground/60">
                      {(profile.custom_instructions ?? "").length} / 1000
                    </span>
                  )}
                </div>
                {isLoading ? (
                  <SkeletonField rows={6} />
                ) : (
                  <textarea
                    id="custom_instructions"
                    rows={6}
                    maxLength={1000}
                    value={profile.custom_instructions ?? ""}
                    onChange={(e) =>
                      updateField("custom_instructions", e.target.value)
                    }
                    placeholder={
                      "How would you like Prism to respond?\n" +
                      "e.g. Always give code examples. Prefer concise answers. Use bullet points. Assume I know Python basics."
                    }
                    className="w-full resize-none rounded-lg border border-border bg-background/80 px-3 py-2.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-[#7c3aed] focus:ring-2 focus:ring-[#7c3aed]/30"
                  />
                )}
                <p className="text-[11px] text-muted-foreground/70">
                  These instructions will be applied to every conversation
                </p>
              </div>
            </SectionCard>

            {/* ── D. Response Style ─────────────────────────────────────── */}
            <SectionCard title="Response Style">
              {isLoading ? (
                <div className="grid grid-cols-2 gap-2.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-[72px] animate-pulse rounded-lg bg-muted/60"
                    />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2.5">
                  {RESPONSE_STYLES.map(({ id, label, description, Icon }) => {
                    const isSelected = profile.response_style === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => updateField("response_style", id)}
                        className={`cursor-pointer rounded-lg border p-3 text-left transition-all duration-150 hover:scale-[1.02] active:scale-[0.98] ${
                          isSelected
                            ? "border-[#7c3aed] bg-[#7c3aed]/10 ring-1 ring-[#7c3aed]/40"
                            : "border-border hover:border-[#7c3aed]/40 hover:bg-muted/40"
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <Icon
                            className={`size-3.5 ${
                              isSelected
                                ? "text-[#7c3aed]"
                                : "text-muted-foreground"
                            }`}
                          />
                          <span
                            className={`text-xs font-medium ${
                              isSelected
                                ? "text-[#7c3aed]"
                                : "text-foreground"
                            }`}
                          >
                            {label}
                          </span>
                        </div>
                        <p className="text-[11px] leading-snug text-muted-foreground">
                          {description}
                        </p>
                      </button>
                    );
                  })}
                </div>
              )}
            </SectionCard>

            {/* ── E. What Prism Remembers ───────────────────────────────── */}
            <SectionCard
              title="What Prism Remembers"
              icon={<Brain className="size-4 text-[#7c3aed]" />}
              subtitle="Prism automatically learns about you from your conversations"
            >
              {isMemoriesLoading ? (
                /* Skeleton chips */
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="h-[72px] animate-pulse rounded-xl bg-muted/60"
                    />
                  ))}
                </div>
              ) : memories.length === 0 ? (
                /* Empty state */
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/60">
                    <Brain className="size-5 text-muted-foreground/50" />
                  </div>
                  <p className="max-w-[260px] text-xs text-muted-foreground">
                    No memories yet. Start chatting and Prism will learn about
                    you!
                  </p>
                </div>
              ) : (
                /* Memory groups */
                <div className="space-y-5">
                  {sortedCategories.map((category) => (
                    <div key={category}>
                      {/* Group header */}
                      <div className="mb-2 flex items-center gap-2">
                        <span
                          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold capitalize ${
                            CATEGORY_STYLES[category] ?? CATEGORY_STYLES.context
                          }`}
                        >
                          {category}
                        </span>
                        <div className="h-px flex-1 bg-border/60" />
                        <span className="text-[10px] text-muted-foreground/50">
                          {memoriesByCategory[category].length}
                        </span>
                      </div>

                      {/* Chips grid — max 3 cols on wide screens, 2 on medium, 1 on mobile */}
                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
                        {memoriesByCategory[category].map((memory) => (
                          <MemoryChip
                            key={memory.id}
                            memory={memory}
                            isConfirming={confirmDeleteId === memory.id}
                            isDeleting={deletingId === memory.id}
                            onRequestDelete={() =>
                              handleRequestDelete(memory.id)
                            }
                            onConfirmDelete={() =>
                              handleConfirmDelete(memory.id)
                            }
                            onCancelDelete={handleCancelDelete}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* ── F. Save button ────────────────────────────────────────── */}
            <button
              type="button"
              disabled={isSaving || isLoading}
              onClick={handleSave}
              className={`relative inline-flex w-full cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-xl px-4 py-3 text-sm font-medium text-white shadow-md transition-all duration-150 hover:brightness-110 hover:shadow-[0_0_30px_rgba(124,58,237,0.35)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 ${
                isSaved
                  ? "bg-gradient-to-r from-emerald-500 to-cyan-500"
                  : "bg-gradient-to-r from-[#7c3aed] to-[#2563eb]"
              }`}
            >
              {/* Hover shimmer sweep */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full"
              />
              {isSaving ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Saving...
                </>
              ) : isSaved ? (
                <>
                  <Check className="size-4" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="size-4" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      <ToastContainer />
    </ToastProvider>
  );
}
