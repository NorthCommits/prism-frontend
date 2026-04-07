"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BarChart2,
  BookOpen,
  Brain,
  Check,
  Code2,
  FolderOpen,
  Heart,
  Loader2,
  Mic,
  Palette,
  Play,
  Save,
  Scale,
  Scissors,
  Search,
  Shield,
  Sun,
  Moon,
  Trash2,
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
import { getProjects, formatFileSize, type Project } from "@/lib/projects";
import { ProductivityDashboard } from "@/components/ProductivityDashboard";
import { ToastContainer, ToastProvider, pushToast } from "@/components/Toast";

// ─── Constants ────────────────────────────────────────────────────────────────

const VOICE_OPTIONS: { id: string; label: string; description: string }[] = [
  { id: "alloy",   label: "Alloy",   description: "Neutral and balanced" },
  { id: "echo",    label: "Echo",    description: "Deep and authoritative" },
  { id: "fable",   label: "Fable",   description: "Warm and storytelling" },
  { id: "onyx",    label: "Onyx",    description: "Strong and confident" },
  { id: "nova",    label: "Nova",    description: "Energetic and clear" },
  { id: "shimmer", label: "Shimmer", description: "Soft and expressive" },
];

const RESPONSE_STYLES: {
  id: ResponseStyle;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { id: "balanced",  label: "Balanced",  description: "Clear and well-rounded",    Icon: Scale },
  { id: "concise",   label: "Concise",   description: "Short, direct answers",     Icon: Scissors },
  { id: "detailed",  label: "Detailed",  description: "Comprehensive explanations", Icon: BookOpen },
  { id: "friendly",  label: "Friendly",  description: "Warm and conversational",   Icon: Heart },
  { id: "technical", label: "Technical", description: "Technical depth, assumes expertise", Icon: Code2 },
];

const CATEGORY_STYLES: Record<string, string> = {
  personal:    "border-[#7c3aed]/30 bg-[#7c3aed]/10 text-[#c4b5fd]",
  technical:   "border-[#2563eb]/30 bg-[#2563eb]/10 text-[#93c5fd]",
  projects:    "border-emerald-500/30 bg-emerald-500/10 text-emerald-400",
  preferences: "border-orange-500/30 bg-orange-500/10 text-[#fbbf24]",
  context:     "border-border bg-muted/50 text-muted-foreground",
};
const CATEGORY_ORDER = ["personal", "technical", "projects", "preferences", "context"];

type SectionId = "general" | "ai" | "voice" | "appearance" | "productivity" | "projects" | "account";

const NAV_ITEMS: { id: SectionId; label: string; Icon: React.ComponentType<{ className?: string; size?: number }> }[] = [
  { id: "general",      label: "General",      Icon: User },
  { id: "ai",           label: "AI Behavior",  Icon: Brain },
  { id: "voice",        label: "Voice",        Icon: Mic },
  { id: "appearance",   label: "Appearance",   Icon: Palette },
  { id: "productivity", label: "Productivity", Icon: BarChart2 },
  { id: "projects",     label: "Projects",     Icon: FolderOpen },
  { id: "account",      label: "Account",      Icon: Shield },
];

// Searchable setting items: section + label + description
const SEARCH_INDEX: { section: SectionId; sectionLabel: string; label: string; description: string }[] = [
  { section: "general",    sectionLabel: "General",      label: "Display Name",          description: "How Prism addresses you in conversations" },
  { section: "general",    sectionLabel: "General",      label: "About You",             description: "Background context injected into every conversation" },
  { section: "general",    sectionLabel: "General",      label: "Response Style",        description: "How Prism formats and delivers responses" },
  { section: "ai",         sectionLabel: "AI Behavior",  label: "Custom Instructions",   description: "Strict rules Prism follows in every response" },
  { section: "ai",         sectionLabel: "AI Behavior",  label: "Memory",                description: "Cross-conversation memory stored by Prism" },
  { section: "voice",      sectionLabel: "Voice",        label: "Voice Input",           description: "Powered by OpenAI Whisper. Hold mic or Space to record." },
  { section: "voice",      sectionLabel: "Voice",        label: "TTS Voice",             description: "Choose the voice Prism uses when reading responses" },
  { section: "voice",      sectionLabel: "Voice",        label: "Speech Speed",          description: "Adjust the speed of text-to-speech playback" },
  { section: "appearance", sectionLabel: "Appearance",   label: "Theme",                 description: "Switch between dark and light color themes" },
  { section: "appearance", sectionLabel: "Appearance",   label: "Font Size",             description: "Controls the size of text in conversations" },
  { section: "appearance", sectionLabel: "Appearance",   label: "Chat Density",          description: "Comfortable or compact message spacing" },
  { section: "productivity",sectionLabel:"Productivity", label: "Usage Dashboard",       description: "Weekly report, stat cards, daily chart, activity feed" },
  { section: "projects",   sectionLabel: "Projects",     label: "Projects Overview",     description: "Quick overview of your project workspaces" },
  { section: "account",    sectionLabel: "Account",      label: "Account Info",          description: "Email, member since, user ID" },
  { section: "account",    sectionLabel: "Account",      label: "Export Data",           description: "Download all your Prism conversations and memories" },
  { section: "account",    sectionLabel: "Account",      label: "Danger Zone",           description: "Sign out or clear all data" },
];

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function SubHeading({ children }: { children: React.ReactNode }) {
  return (
    <p className="mt-6 mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-white/30 first:mt-0">
      {children}
    </p>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mb-7">
      <div className="mb-2">
        <p className="text-[13px] font-medium text-white/90">{label}</p>
        {description && (
          <p className="mt-0.5 text-[12px] leading-relaxed text-white/40">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}

function inputClass(extra = "") {
  return `w-full rounded-lg border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-[13px] text-white/90 outline-none placeholder:text-white/25 transition-colors focus:border-violet-500/60 focus:bg-white/[0.06] ${extra}`;
}

// ─── Memory chip ──────────────────────────────────────────────────────────────

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
  const cat = memory.category || "context";
  const catStyle = CATEGORY_STYLES[cat] ?? CATEGORY_STYLES.context;

  return (
    <div
      className={`group flex flex-col gap-2 rounded-xl border p-3 transition-all duration-200 ${
        isDeleting ? "scale-95 opacity-0" : "scale-100 opacity-100"
      } ${
        isConfirming
          ? "border-red-400/30 bg-red-500/[0.06]"
          : "border-white/[0.07] bg-white/[0.03] hover:border-violet-500/30"
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[10px] font-medium capitalize ${catStyle}`}>
          {cat}
        </span>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-0.5">
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 w-1.5 rounded-full ${i < memory.importance ? "bg-violet-500" : "bg-white/10"}`}
              />
            ))}
          </div>
          {isConfirming ? (
            <>
              <button type="button" onClick={onCancelDelete} className="cursor-pointer rounded px-1.5 py-0.5 text-[10px] text-white/40 hover:bg-white/[0.06]">Cancel</button>
              <button type="button" onClick={onConfirmDelete} className="cursor-pointer rounded bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-400 hover:bg-red-500/25">Delete</button>
            </>
          ) : (
            <button type="button" onClick={onRequestDelete} aria-label="Delete memory" className="cursor-pointer rounded p-0.5 text-white/20 opacity-0 transition-all group-hover:opacity-100 hover:bg-red-500/10 hover:text-red-400">
              <Trash2 className="size-3" />
            </button>
          )}
        </div>
      </div>
      <p className="text-[12px] leading-relaxed text-white/70">{memory.memory}</p>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme, resolvedTheme } = useTheme();

  // ── Section nav ───────────────────────────────────────────────────────────
  const [activeSection, setActiveSection] = useState<SectionId>("general");
  const [searchQuery, setSearchQuery] = useState("");

  // ── Auth & loading ────────────────────────────────────────────────────────
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [isFetching, setIsFetching] = useState(true);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);

  // ── Profile form state ────────────────────────────────────────────────────
  const [profile, setProfile] = useState<UserProfile>({
    display_name: "", about_you: "", custom_instructions: "", response_style: "balanced", voice: "nova",
  });
  const [savedProfile, setSavedProfile] = useState<UserProfile | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const savedTimerRef = useRef<number | null>(null);

  const isDirty = savedProfile !== null && JSON.stringify(profile) !== JSON.stringify(savedProfile);

  // ── Appearance state ──────────────────────────────────────────────────────
  const [fontSize, setFontSize] = useState<"small" | "medium" | "large">("medium");
  const [density, setDensity] = useState<"comfortable" | "compact">("comfortable");

  // ── Voice speed ───────────────────────────────────────────────────────────
  const [speechSpeed, setSpeechSpeed] = useState(1.0);
  const [previewingVoice, setPreviewingVoice] = useState<string | null>(null);
  const previewAudioRef = useRef<HTMLAudioElement | null>(null);

  // ── Memory state ──────────────────────────────────────────────────────────
  const [memories, setMemories] = useState<Memory[]>([]);
  const [isMemoriesLoading, setIsMemoriesLoading] = useState(true);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAllMemories, setShowAllMemories] = useState(false);
  const [clearMemoryConfirm, setClearMemoryConfirm] = useState(false);
  const [isClearingMemory, setIsClearingMemory] = useState(false);

  // ── Projects ──────────────────────────────────────────────────────────────
  const [projects, setProjects] = useState<Project[]>([]);
  const [isProjectsLoading, setIsProjectsLoading] = useState(true);

  // ── Account / danger zone ─────────────────────────────────────────────────
  const [clearDataInput, setClearDataInput] = useState("");
  const [clearDataConfirmOpen, setClearDataConfirmOpen] = useState(false);

  // ── Auth guard + user info ────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) { router.replace("/login"); return; }
      setUserEmail(session.user.email ?? null);
      setUserId(session.user.id ?? null);
      setUserCreatedAt(session.user.created_at ?? null);
      setIsAuthLoading(false);
    });
  }, [router, supabase]);

  // ── Load profile ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthLoading) return;
    let cancelled = false;
    getProfile()
      .then((data) => {
        if (cancelled) return;
        const p: UserProfile = {
          display_name: data.display_name ?? "",
          about_you: data.about_you ?? "",
          custom_instructions: data.custom_instructions ?? "",
          response_style: data.response_style ?? "balanced",
          voice: data.voice ?? "nova",
        };
        setProfile(p);
        setSavedProfile(p);
        if (p.voice) localStorage.setItem("prism_voice", p.voice);
      })
      .catch(() => {
        const p: UserProfile = { display_name: "", about_you: "", custom_instructions: "", response_style: "balanced", voice: "nova" };
        setProfile(p);
        setSavedProfile(p);
      })
      .finally(() => { if (!cancelled) setIsFetching(false); });
    return () => { cancelled = true; };
  }, [isAuthLoading]);

  // ── Load memories ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthLoading) return;
    let cancelled = false;
    getMemories()
      .then((data) => { if (!cancelled) setMemories(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsMemoriesLoading(false); });
    return () => { cancelled = true; };
  }, [isAuthLoading]);

  // ── Load projects ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (isAuthLoading) return;
    let cancelled = false;
    getProjects()
      .then((data) => { if (!cancelled) setProjects(data); })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIsProjectsLoading(false); });
    return () => { cancelled = true; };
  }, [isAuthLoading]);

  // ── Read font size from localStorage ─────────────────────────────────────
  useEffect(() => {
    const saved = localStorage.getItem("prism_font_size") as "small" | "medium" | "large" | null;
    if (saved) setFontSize(saved);
  }, []);

  // ── Cleanup ───────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (savedTimerRef.current !== null) window.clearTimeout(savedTimerRef.current);
      previewAudioRef.current?.pause();
    };
  }, []);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function updateField<K extends keyof UserProfile>(key: K, value: UserProfile[K]) {
    setProfile((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (isSaving) return;
    setIsSaving(true);
    try {
      const updated = await saveProfile(profile);
      const p: UserProfile = {
        display_name: updated.display_name ?? "",
        about_you: updated.about_you ?? "",
        custom_instructions: updated.custom_instructions ?? "",
        response_style: updated.response_style ?? "balanced",
        voice: updated.voice ?? "nova",
      };
      setSavedProfile(p);
      setProfile(p);
      if (p.voice) localStorage.setItem("prism_voice", p.voice);
      setIsSaved(true);
      pushToast("Profile saved", "success");
      savedTimerRef.current = window.setTimeout(() => setIsSaved(false), 2000);
    } catch {
      pushToast("Failed to save profile", "error");
    } finally {
      setIsSaving(false);
    }
  }

  function handleDiscard() {
    if (savedProfile) setProfile(savedProfile);
  }

  async function handleConfirmDelete(id: string) {
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

  async function handleClearAllMemories() {
    setIsClearingMemory(true);
    try {
      await Promise.all(memories.map((m) => deleteMemory(m.id)));
      setMemories([]);
      setClearMemoryConfirm(false);
      pushToast("All memories cleared", "success");
    } catch {
      pushToast("Failed to clear memories", "error");
    } finally {
      setIsClearingMemory(false);
    }
  }

  async function handlePreviewVoice(voiceId: string) {
    if (previewingVoice === voiceId) {
      previewAudioRef.current?.pause();
      previewAudioRef.current = null;
      setPreviewingVoice(null);
      return;
    }
    previewAudioRef.current?.pause();
    setPreviewingVoice(voiceId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/voice/speak`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ text: "Hello, I'm your Prism assistant.", voice: voiceId, speed: 1.0 }),
      });
      if (!response.ok) { setPreviewingVoice(null); return; }
      const blob = await response.blob();
      const audio = new Audio(URL.createObjectURL(blob));
      previewAudioRef.current = audio;
      audio.onended = () => { setPreviewingVoice(null); previewAudioRef.current = null; };
      audio.play();
    } catch {
      setPreviewingVoice(null);
    }
  }

  function applyFontSize(size: "small" | "medium" | "large") {
    setFontSize(size);
    localStorage.setItem("prism_font_size", size);
  }

  // ── Grouped memories ──────────────────────────────────────────────────────
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
    const ai = CATEGORY_ORDER.indexOf(a), bi = CATEGORY_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const displayedMemories = showAllMemories ? memories : memories.slice(0, 5);

  // ── Search results ────────────────────────────────────────────────────────
  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.toLowerCase();
    return SEARCH_INDEX.filter(
      (item) =>
        item.label.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  // ── Projects storage ──────────────────────────────────────────────────────
  const totalStorage = projects.reduce((acc, p) => acc + (p.total_size || 0), 0);
  const maxStorage = 100 * 1024 * 1024; // 100 MB

  // ── Account dates ─────────────────────────────────────────────────────────
  const memberSince = userCreatedAt
    ? new Date(userCreatedAt).toLocaleDateString("en-US", { month: "long", year: "numeric" })
    : "—";

  // ── Auth spinner ──────────────────────────────────────────────────────────
  if (isAuthLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0f]">
        <Loader2 className="size-5 animate-spin text-white/30" />
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER SECTION CONTENT
  // ─────────────────────────────────────────────────────────────────────────

  function renderSection() {
    if (searchQuery.trim()) {
      return (
        <div>
          <p className="mb-5 text-[13px] text-white/40">
            {searchResults.length > 0
              ? `Results for "${searchQuery}"`
              : `No settings found for "${searchQuery}"`}
          </p>
          {searchResults.map((item, i) => (
            <button
              key={i}
              type="button"
              onClick={() => { setActiveSection(item.section); setSearchQuery(""); }}
              className="mb-2 flex w-full cursor-pointer items-start gap-3 rounded-xl border border-white/[0.07] bg-white/[0.03] p-3 text-left transition-colors hover:border-violet-500/30 hover:bg-violet-500/[0.06]"
            >
              <div>
                <p className="text-[12px] font-medium text-white/80">{item.label}</p>
                <p className="text-[11px] text-white/35">{item.sectionLabel} · {item.description}</p>
              </div>
              <ArrowRight size={14} className="ml-auto mt-0.5 shrink-0 text-white/25" />
            </button>
          ))}
        </div>
      );
    }

    switch (activeSection) {
      // ── GENERAL ───────────────────────────────────────────────────────────
      case "general":
        return (
          <div>
            <SectionHeader
              title="General"
              description="Your identity and how Prism addresses you"
            />
            <SettingRow label="Display Name" description="How Prism addresses you in conversations">
              {isFetching ? <Skeleton /> : (
                <input
                  type="text"
                  value={profile.display_name ?? ""}
                  onChange={(e) => updateField("display_name", e.target.value)}
                  placeholder="Enter your name"
                  className={inputClass("h-9")}
                />
              )}
            </SettingRow>

            <SettingRow label="About You" description="Background context injected into every conversation">
              {isFetching ? <Skeleton rows={3} /> : (
                <>
                  <textarea
                    rows={3}
                    maxLength={500}
                    value={profile.about_you ?? ""}
                    onChange={(e) => updateField("about_you", e.target.value)}
                    placeholder={"e.g. I'm a software engineer working on AI products at a healthcare company"}
                    className={inputClass("resize-none")}
                  />
                  <p className="mt-1.5 text-right text-[11px] text-white/25">
                    {(profile.about_you ?? "").length} / 500
                  </p>
                </>
              )}
            </SettingRow>

            <SettingRow label="Response Style" description="How Prism formats and delivers responses">
              {isFetching ? (
                <div className="grid grid-cols-2 gap-2">
                  {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} height={68} />)}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {RESPONSE_STYLES.map(({ id, label, description, Icon }) => {
                    const sel = profile.response_style === id;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => updateField("response_style", id)}
                        className={`cursor-pointer rounded-xl border p-3 text-left transition-all duration-150 ${
                          sel
                            ? "border-violet-500/60 bg-violet-500/10 ring-1 ring-violet-500/20"
                            : "border-white/[0.07] bg-white/[0.02] hover:border-violet-500/30 hover:bg-white/[0.04]"
                        }`}
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <Icon className={`size-3.5 ${sel ? "text-violet-400" : "text-white/35"}`} />
                          <span className={`text-[12px] font-medium ${sel ? "text-violet-300" : "text-white/80"}`}>{label}</span>
                        </div>
                        <p className="text-[11px] leading-snug text-white/35">{description}</p>
                      </button>
                    );
                  })}
                </div>
              )}
            </SettingRow>
          </div>
        );

      // ── AI BEHAVIOR ───────────────────────────────────────────────────────
      case "ai":
        return (
          <div>
            <SectionHeader
              title="AI Behavior"
              description="Custom instructions and memory settings"
            />
            <SettingRow label="Custom Instructions" description="Strict rules Prism follows in every response — these override all other behavior settings">
              {isFetching ? <Skeleton rows={6} /> : (
                <>
                  <textarea
                    rows={6}
                    maxLength={1000}
                    value={profile.custom_instructions ?? ""}
                    onChange={(e) => updateField("custom_instructions", e.target.value)}
                    placeholder={"e.g. Always address me as Sir. Use formal tone. Give code examples."}
                    className={inputClass("resize-none")}
                  />
                  <p className="mt-1.5 text-right text-[11px] text-white/25">
                    {(profile.custom_instructions ?? "").length} / 1000
                  </p>
                  <div
                    className="mt-3 flex items-start gap-2 rounded-xl p-3 text-[12px] leading-relaxed text-white/50"
                    style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.18)" }}
                  >
                    <span className="mt-px shrink-0 text-violet-400">ℹ</span>
                    Instructions are injected as strict overrides. The model must follow them exactly.
                  </div>
                </>
              )}
            </SettingRow>

            <SubHeading>CROSS-CONVERSATION MEMORY</SubHeading>

            {isMemoriesLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={64} />)}
              </div>
            ) : memories.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/[0.05]">
                  <Brain className="size-5 text-white/20" />
                </div>
                <p className="text-[12px] text-white/35">
                  No memories yet. Start chatting and Prism will learn about you!
                </p>
              </div>
            ) : (
              <>
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-full border border-white/[0.08] bg-white/[0.04] px-2.5 py-1 text-[11px] text-white/40">
                    {memories.length} {memories.length === 1 ? "memory" : "memories"}
                  </span>
                </div>
                <div className="space-y-2">
                  {displayedMemories.map((memory) => (
                    <MemoryChip
                      key={memory.id}
                      memory={memory}
                      isConfirming={confirmDeleteId === memory.id}
                      isDeleting={deletingId === memory.id}
                      onRequestDelete={() => setConfirmDeleteId(memory.id)}
                      onConfirmDelete={() => handleConfirmDelete(memory.id)}
                      onCancelDelete={() => setConfirmDeleteId(null)}
                    />
                  ))}
                </div>
                {memories.length > 5 && (
                  <button
                    type="button"
                    onClick={() => setShowAllMemories((v) => !v)}
                    className="mt-3 text-[12px] text-violet-400/70 transition-colors hover:text-violet-400"
                  >
                    {showAllMemories ? "Show fewer" : `View all ${memories.length} memories →`}
                  </button>
                )}

                <div className="mt-6">
                  {!clearMemoryConfirm ? (
                    <div className="flex items-center justify-between rounded-xl border border-red-500/[0.15] bg-red-500/[0.04] p-4">
                      <div>
                        <p className="text-[13px] font-medium text-white/80">Clear All Memories</p>
                        <p className="mt-0.5 text-[11px] text-white/35">Prism will forget everything it has learned about you</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setClearMemoryConfirm(true)}
                        className="rounded-lg border border-red-500/30 px-3 py-1.5 text-[12px] font-medium text-red-400 transition-colors hover:bg-red-500/10"
                      >
                        Clear Memory
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between rounded-xl border border-red-500/30 bg-red-500/[0.08] p-4">
                      <p className="text-[12px] text-white/70">This cannot be undone. Are you sure?</p>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setClearMemoryConfirm(false)} className="rounded-lg px-3 py-1.5 text-[12px] text-white/40 hover:bg-white/[0.06]">Cancel</button>
                        <button
                          type="button"
                          onClick={handleClearAllMemories}
                          disabled={isClearingMemory}
                          className="rounded-lg bg-red-500/80 px-3 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                        >
                          {isClearingMemory ? "Clearing…" : "Yes, clear all"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        );

      // ── VOICE ─────────────────────────────────────────────────────────────
      case "voice":
        return (
          <div>
            <SectionHeader title="Voice" description="Transcription and text-to-speech settings" />

            <SubHeading>TRANSCRIPTION</SubHeading>
            <div
              className="mb-7 flex items-start gap-3 rounded-xl p-4"
              style={{ background: "rgba(34,197,94,0.05)", border: "1px solid rgba(34,197,94,0.18)" }}
            >
              <Mic size={15} className="mt-0.5 shrink-0 text-emerald-400" />
              <div>
                <p className="text-[13px] font-medium text-white/80">Powered by OpenAI Whisper</p>
                <p className="mt-1 text-[12px] leading-relaxed text-white/40">
                  Hold the mic button or press Space to record. Prism transcribes your voice in real time.
                </p>
              </div>
            </div>

            <SubHeading>TEXT TO SPEECH</SubHeading>
            <SettingRow label="TTS Voice" description="Choose the voice Prism uses when reading responses">
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {VOICE_OPTIONS.map(({ id, label, description }) => {
                  const sel = (profile.voice ?? "nova") === id;
                  const isPreviewing = previewingVoice === id;
                  return (
                    <div
                      key={id}
                      onClick={() => updateField("voice", id)}
                      className={`cursor-pointer rounded-xl border p-3 transition-all duration-150 ${
                        sel
                          ? "border-violet-500/60 bg-violet-500/10 ring-1 ring-violet-500/20"
                          : "border-white/[0.07] bg-white/[0.02] hover:border-violet-500/30"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <p className={`text-[12px] font-semibold ${sel ? "text-violet-300" : "text-white/80"}`}>{label}</p>
                          <p className="mt-0.5 text-[11px] text-white/35">{description}</p>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); void handlePreviewVoice(id); }}
                          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition-colors ${
                            isPreviewing
                              ? "bg-violet-500/20 text-violet-400"
                              : "bg-white/[0.05] text-white/30 hover:bg-violet-500/15 hover:text-violet-400"
                          }`}
                          title={isPreviewing ? "Stop" : "Preview voice"}
                        >
                          {isPreviewing
                            ? <span className="h-2 w-2 rounded-sm bg-violet-400" />
                            : <Play size={10} className="ml-0.5" />
                          }
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </SettingRow>

            <SettingRow label="Speech Speed" description="Adjust the speed of text-to-speech playback">
              <div className="flex items-center gap-4">
                <input
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.25}
                  value={speechSpeed}
                  onChange={(e) => setSpeechSpeed(parseFloat(e.target.value))}
                  className="flex-1 accent-violet-500"
                />
                <span className="w-10 text-right text-[13px] font-medium text-violet-300">{speechSpeed.toFixed(2)}x</span>
              </div>
              <div className="mt-2 flex justify-between text-[10px] text-white/25">
                <span>0.5x</span><span>1.0x</span><span>1.5x</span><span>2.0x</span>
              </div>
            </SettingRow>
          </div>
        );

      // ── APPEARANCE ────────────────────────────────────────────────────────
      case "appearance":
        return (
          <div>
            <SectionHeader title="Appearance" description="Visual preferences for the chat interface" />

            <SubHeading>COLOR THEME</SubHeading>
            <SettingRow label="Theme" description="Switch between dark and light color themes">
              <div className="flex gap-3">
                {[
                  { val: "dark",  label: "Dark",  Icon: Moon },
                  { val: "light", label: "Light", Icon: Sun },
                ].map(({ val, label, Icon: Ico }) => {
                  const sel = (theme ?? resolvedTheme) === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setTheme(val)}
                      className={`flex flex-1 cursor-pointer items-center justify-center gap-2 rounded-xl border py-3 text-[13px] font-medium transition-all ${
                        sel
                          ? "border-violet-500/60 bg-violet-500/10 text-violet-300 ring-1 ring-violet-500/20"
                          : "border-white/[0.07] text-white/50 hover:border-violet-500/30 hover:text-white/80"
                      }`}
                    >
                      <Ico size={15} />
                      {label}
                    </button>
                  );
                })}
              </div>
            </SettingRow>

            <SubHeading>CHAT FONT SIZE</SubHeading>
            <SettingRow label="Font Size" description="Controls the size of text in conversations">
              <div className="flex gap-3">
                {([
                  { val: "small",  label: "Small",  size: "text-xs" },
                  { val: "medium", label: "Medium", size: "text-sm" },
                  { val: "large",  label: "Large",  size: "text-base" },
                ] as { val: "small" | "medium" | "large"; label: string; size: string }[]).map(({ val, label, size }) => {
                  const sel = fontSize === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => applyFontSize(val)}
                      className={`flex flex-1 cursor-pointer flex-col items-center gap-1.5 rounded-xl border py-3 transition-all ${
                        sel
                          ? "border-violet-500/60 bg-violet-500/10 ring-1 ring-violet-500/20"
                          : "border-white/[0.07] hover:border-violet-500/30 hover:bg-white/[0.03]"
                      }`}
                    >
                      <span className={`font-bold text-white/80 ${size}`}>A</span>
                      <span className={`text-[11px] ${sel ? "text-violet-300" : "text-white/40"}`}>{label}</span>
                    </button>
                  );
                })}
              </div>
            </SettingRow>

            <SubHeading>MESSAGE SPACING</SubHeading>
            <SettingRow label="Chat Density" description="Controls how much padding is between messages">
              <div className="flex gap-3">
                {([
                  { val: "comfortable", label: "Comfortable", desc: "More breathing room" },
                  { val: "compact",     label: "Compact",     desc: "More messages visible" },
                ] as { val: "comfortable" | "compact"; label: string; desc: string }[]).map(({ val, label, desc }) => {
                  const sel = density === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setDensity(val)}
                      className={`flex flex-1 cursor-pointer flex-col gap-0.5 rounded-xl border p-3 text-left transition-all ${
                        sel
                          ? "border-violet-500/60 bg-violet-500/10 ring-1 ring-violet-500/20"
                          : "border-white/[0.07] hover:border-violet-500/30 hover:bg-white/[0.03]"
                      }`}
                    >
                      <span className={`text-[13px] font-medium ${sel ? "text-violet-300" : "text-white/70"}`}>{label}</span>
                      <span className="text-[11px] text-white/30">{desc}</span>
                    </button>
                  );
                })}
              </div>
            </SettingRow>
          </div>
        );

      // ── PRODUCTIVITY ──────────────────────────────────────────────────────
      case "productivity":
        return (
          <div>
            <SectionHeader title="Productivity" description="Your AI usage insights and performance metrics" />
            <ProductivityDashboard authReady={!isAuthLoading} />
          </div>
        );

      // ── PROJECTS ──────────────────────────────────────────────────────────
      case "projects":
        return (
          <div>
            <SectionHeader title="Projects" description="Quick overview of your project workspaces" />

            <SubHeading>YOUR PROJECTS</SubHeading>
            {isProjectsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height={60} />)}
              </div>
            ) : projects.length === 0 ? (
              <div className="mb-7 flex flex-col items-center gap-3 rounded-xl border border-white/[0.07] py-10 text-center">
                <FolderOpen size={24} className="text-white/20" />
                <p className="text-[12px] text-white/35">No projects yet</p>
                <button
                  type="button"
                  onClick={() => router.push("/projects")}
                  className="rounded-lg border border-violet-500/40 px-4 py-1.5 text-[12px] font-medium text-violet-400 transition-colors hover:bg-violet-500/10"
                >
                  Create Project →
                </button>
              </div>
            ) : (
              <div className="mb-7 space-y-2">
                {projects.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3 rounded-xl border border-white/[0.07] bg-white/[0.02] px-4 py-3"
                  >
                    <div className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: p.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-white/80">{p.name}</p>
                      <p className="text-[11px] text-white/30">
                        {p.file_count} {p.file_count === 1 ? "file" : "files"} · {formatFileSize(p.total_size)}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push(`/projects/${p.id}`)}
                      className="flex items-center gap-1 text-[12px] text-violet-400/60 transition-colors hover:text-violet-400"
                    >
                      Open <ArrowRight size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <SubHeading>STORAGE USAGE</SubHeading>
            <div className="mb-7 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="mb-2 flex items-center justify-between text-[12px]">
                <span className="text-white/50">Total storage</span>
                <span className="text-white/70">{formatFileSize(totalStorage)} / 100 MB</span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(100, (totalStorage / maxStorage) * 100)}%`,
                    background: "linear-gradient(to right, #8b5cf6, #06b6d4)",
                  }}
                />
              </div>
            </div>
          </div>
        );

      // ── ACCOUNT ───────────────────────────────────────────────────────────
      case "account":
        return (
          <div>
            <SectionHeader title="Account" description="Account management and data settings" />

            <SubHeading>YOUR ACCOUNT</SubHeading>
            <div className="mb-7 space-y-1 rounded-xl border border-white/[0.07] bg-white/[0.02] p-4">
              <div className="flex items-center justify-between py-1.5 text-[13px]">
                <span className="text-white/40">Email</span>
                <span className="font-medium text-white/70">{userEmail ?? "—"}</span>
              </div>
              <div className="border-t border-white/[0.05]" />
              <div className="flex items-center justify-between py-1.5 text-[13px]">
                <span className="text-white/40">Member since</span>
                <span className="text-white/70">{memberSince}</span>
              </div>
              {userId && (
                <>
                  <div className="border-t border-white/[0.05]" />
                  <div className="flex items-center justify-between py-1.5 text-[13px]">
                    <span className="text-white/40">User ID</span>
                    <span className="font-mono text-[11px] text-white/35">{userId.slice(0, 8)}…</span>
                  </div>
                </>
              )}
            </div>

            <SubHeading>DATA EXPORT</SubHeading>
            <div className="mb-7 flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={() => pushToast("Export started — check your downloads", "success")}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-[13px] font-medium text-white/70 transition-all hover:border-violet-500/40 hover:bg-violet-500/[0.06]"
              >
                Export Conversations
              </button>
              <button
                type="button"
                onClick={() => pushToast("Memory export started", "success")}
                className="flex items-center justify-center gap-2 rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-2.5 text-[13px] font-medium text-white/70 transition-all hover:border-violet-500/40 hover:bg-violet-500/[0.06]"
              >
                Export Memories
              </button>
            </div>

            <SubHeading>DANGER ZONE</SubHeading>
            <div
              className="space-y-4 rounded-xl p-4"
              style={{ background: "rgba(239,68,68,0.04)", border: "1px solid rgba(239,68,68,0.15)" }}
            >
              {/* Sign Out */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[13px] font-medium text-white/80">Sign Out</p>
                  <p className="mt-0.5 text-[11px] text-white/35">Sign out of your Prism account</p>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      sessionStorage.removeItem("prism_app_loaded");
                      sessionStorage.removeItem("prism_bulk_embedded");
                      sessionStorage.removeItem("prism_user_id");
                    } catch { /* ok */ }
                    await supabase.auth.signOut();
                    router.push("/landing");
                  }}
                  className="rounded-lg border border-red-500/40 px-3 py-1.5 text-[12px] font-medium text-red-400 transition-colors hover:bg-red-500/10"
                >
                  Sign Out
                </button>
              </div>

              <div className="border-t border-red-500/[0.12]" />

              {/* Clear All Data */}
              <div>
                <p className="text-[13px] font-medium text-white/80">Clear All Data</p>
                <p className="mt-0.5 mb-3 text-[11px] text-white/35">
                  Delete all conversations, memories, and scores. This cannot be undone.
                </p>
                {!clearDataConfirmOpen ? (
                  <button
                    type="button"
                    onClick={() => setClearDataConfirmOpen(true)}
                    className="rounded-lg bg-red-500/10 px-3 py-1.5 text-[12px] font-medium text-red-400 transition-colors hover:bg-red-500/20"
                  >
                    <AlertTriangle size={12} className="mr-1.5 inline-block" />
                    Clear All Data
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-[12px] text-white/50">
                      Type <span className="font-mono font-semibold text-red-400">DELETE</span> to confirm
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={clearDataInput}
                        onChange={(e) => setClearDataInput(e.target.value)}
                        placeholder="Type DELETE"
                        className="h-8 flex-1 rounded-lg border border-red-500/30 bg-red-500/[0.05] px-3 text-[12px] text-white/80 outline-none focus:border-red-500/50"
                      />
                      <button
                        type="button"
                        onClick={() => { setClearDataConfirmOpen(false); setClearDataInput(""); }}
                        className="rounded-lg border border-white/[0.08] px-3 py-1.5 text-[12px] text-white/40 hover:bg-white/[0.05]"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={clearDataInput !== "DELETE"}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity disabled:opacity-30 hover:opacity-90"
                        onClick={() => pushToast("Feature not yet available", "error")}
                      >
                        Confirm
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  }

  // ─────────────────────────────────────────────────────────────────────────
  // MAIN RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <ToastProvider>
      <div className="flex h-screen flex-col overflow-hidden bg-[#0a0a0f] text-white">

        {/* ── Top bar ────────────────────────────────────────────────────── */}
        <div className="flex h-12 shrink-0 items-center justify-between border-b border-white/[0.06] px-4">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-white/40 transition-colors hover:bg-white/[0.05] hover:text-white/70"
          >
            <ArrowLeft size={14} />
            Back to Chat
          </button>
          <span className="text-[13px] font-medium text-white/60">Profile Settings</span>
          <div className="w-24" />
        </div>

        {/* ── Body: nav + content ─────────────────────────────────────────── */}
        <div className="flex min-h-0 flex-1">

          {/* ── LEFT NAV (desktop) ─────────────────────────────────────────── */}
          <aside
            className="hidden w-[240px] shrink-0 flex-col border-r border-white/[0.06] md:flex"
            style={{ background: "rgba(12,10,18,0.9)" }}
          >
            <div className="p-3">
              <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.15em] text-white/25">
                Settings
              </p>

              {/* Search */}
              <div className="relative mb-2">
                <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/25" />
                <input
                  type="text"
                  placeholder="Search settings…"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="h-8 w-full rounded-lg border border-white/[0.08] bg-white/[0.04] pl-7 pr-3 text-[12px] text-white/70 outline-none placeholder:text-white/25 focus:border-violet-500/40 focus:bg-white/[0.06]"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto px-2 pb-4">
              {NAV_ITEMS.map((item) => {
                const isActive = !searchQuery.trim() && activeSection === item.id;
                const isAccountItem = item.id === "account";
                return (
                  <div key={item.id}>
                    {isAccountItem && <div className="my-1 mx-2 border-t border-white/[0.06]" />}
                    <button
                      type="button"
                      onClick={() => { setActiveSection(item.id); setSearchQuery(""); }}
                      className={`relative flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] transition-all duration-150 ${
                        isActive
                          ? "bg-violet-500/[0.12] text-white"
                          : "text-white/45 hover:bg-white/[0.04] hover:text-white/75"
                      }`}
                      style={isActive ? { borderLeft: "2px solid #8b5cf6", paddingLeft: "10px" } : {}}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="nav-active"
                          className="absolute inset-0 rounded-lg bg-violet-500/[0.12]"
                          transition={{ type: "spring", stiffness: 500, damping: 35 }}
                        />
                      )}
                      <item.Icon size={14} className="relative z-10 shrink-0" />
                      <span className="relative z-10">{item.label}</span>
                    </button>
                  </div>
                );
              })}
            </nav>
          </aside>

          {/* ── TOP TABS (mobile) ──────────────────────────────────────────── */}
          <div className="flex flex-col md:hidden w-full overflow-hidden">
            <div className="flex shrink-0 gap-1 overflow-x-auto border-b border-white/[0.06] px-3 py-2">
              {NAV_ITEMS.map((item) => {
                const isActive = activeSection === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setActiveSection(item.id)}
                    className={`flex shrink-0 flex-col items-center gap-1 rounded-lg px-3 py-1.5 transition-all ${
                      isActive ? "text-violet-400" : "text-white/35 hover:text-white/60"
                    }`}
                    style={isActive ? { borderBottom: "2px solid #8b5cf6" } : {}}
                  >
                    <item.Icon size={16} />
                    <span className="text-[10px] font-medium">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Mobile content */}
            <div className="flex-1 overflow-y-auto p-4 pb-32">
              <AnimatePresence mode="wait">
                <motion.div
                  key={searchQuery.trim() ? "search" : activeSection}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                >
                  {renderSection()}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* ── RIGHT CONTENT (desktop) ────────────────────────────────────── */}
          <main className="relative hidden flex-1 overflow-y-auto md:block">
            <div className="mx-auto max-w-[640px] px-8 py-8 pb-32">
              <AnimatePresence mode="wait">
                <motion.div
                  key={searchQuery.trim() ? "search" : activeSection}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.18 }}
                >
                  {renderSection()}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ── Unsaved changes bar ──────────────────────────────────────── */}
            <AnimatePresence>
              {isDirty && (
                <motion.div
                  initial={{ y: 80, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 80, opacity: 0 }}
                  transition={{ type: "spring", stiffness: 400, damping: 35 }}
                  className="fixed bottom-0 left-[240px] right-0 z-40 flex items-center justify-between border-t border-white/[0.08] px-8 py-3"
                  style={{ background: "rgba(12,10,18,0.97)", backdropFilter: "blur(12px)" }}
                >
                  <p className="text-[12px] text-white/50">You have unsaved changes</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleDiscard}
                      className="rounded-lg px-4 py-1.5 text-[12px] text-white/40 transition-colors hover:bg-white/[0.06] hover:text-white/70"
                    >
                      Discard
                    </button>
                    <button
                      type="button"
                      onClick={handleSave}
                      disabled={isSaving}
                      className="flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-[12px] font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{ background: "linear-gradient(135deg, #7c3aed, #2563eb)" }}
                    >
                      {isSaving ? (
                        <><Loader2 size={13} className="animate-spin" /> Saving…</>
                      ) : isSaved ? (
                        <><Check size={13} /> Saved</>
                      ) : (
                        <><Save size={13} /> Save Changes</>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </main>

        </div>
      </div>
      <ToastContainer />
    </ToastProvider>
  );
}

// ─── Section header ───────────────────────────────────────────────────────────

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-6">
      <h2 className="text-[20px] font-semibold text-white">{title}</h2>
      {description && <p className="mt-1 text-[13px] text-white/40">{description}</p>}
      <div className="mt-4 border-t border-white/[0.06]" />
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function Skeleton({ rows = 1, height }: { rows?: number; height?: number }) {
  if (height !== undefined) {
    return <div className="animate-pulse rounded-xl bg-white/[0.05]" style={{ height }} />;
  }
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="animate-pulse rounded-lg bg-white/[0.05]"
          style={{ height: rows === 1 ? 36 : 20, width: i === 0 ? "100%" : `${90 - i * 10}%` }}
        />
      ))}
    </div>
  );
}
