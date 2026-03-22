"use client";

import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  BarChart2,
  BookOpen,
  Brain,
  Code2,
  Cpu,
  FileText,
  FolderOpen,
  Globe,
  Image,
  Keyboard,
  Lightbulb,
  LogOut,
  MessageCircle,
  Moon,
  PanelLeftClose,
  PenLine,
  Plus,
  Loader2,
  Search,
  Sparkles,
  Sun,
  Terminal,
  Trash2,
  UserCircle,
  Wand2,
  X,
} from "lucide-react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { useTheme } from "next-themes";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";

import {
  AvailableModel,
  ChatMessage,
  HistoryMessage,
  ModelId,
  fetchModels,
  sendMessageStream,
} from "../lib/api";
import { getProfile, saveProfile } from "@/lib/profile";
import {
  getProject,
  getProjects,
  linkConversationToProject,
} from "@/lib/projects";
import type { Project } from "@/lib/projects";
import { ConversationContextMenu } from "@/components/ConversationContextMenu";
import { MobileConversationRow } from "@/components/MobileConversationRow";
import {
  ConversationRowDragGhost,
  PinnedDesktopConversationRow,
  SortableDesktopConversationRow,
} from "@/components/SortableDesktopConversationRow";
import { Onboarding } from "@/components/Onboarding";
import { AgentProgress } from "@/components/AgentProgress";
import { ChatInput } from "@/components/ChatInput";
import { LoadingScreen } from "@/components/LoadingScreen";
import { ChatWindow } from "@/components/ChatWindow";
import { ModelToggle } from "@/components/ModelToggle";
import { SplashScreen } from "@/components/SplashScreen";
import { ToastContainer, ToastProvider, pushToast } from "@/components/Toast";
import {
  Conversation,
  SearchResult,
  deleteConversation,
  embedAllConversations,
  getConversations,
  getConversationMessages,
  createConversation,
  saveMessage,
  searchConversations,
  updateConversationTitle,
} from "@/lib/history";
import { useMobileKeyboardOpen } from "@/hooks/useMobileKeyboardOpen";
import { createClient } from "@/lib/supabase";

// Maps conversation title keywords to a Lucide icon component and its color tokens.
type IconConfig = {
  icon: React.ElementType;
  bg: string;
  color: string;
  activeBg: string;
  activeColor: string;
};

const ICON_CONFIGS: Record<string, IconConfig> = {
  Code2:        { icon: Code2,        bg: "bg-blue-500/10",   color: "text-blue-400",   activeBg: "bg-blue-500/25",   activeColor: "text-white" },
  Globe:        { icon: Globe,        bg: "bg-green-500/10",  color: "text-green-400",  activeBg: "bg-green-500/25",  activeColor: "text-white" },
  Image:        { icon: Image,        bg: "bg-pink-500/10",   color: "text-pink-400",   activeBg: "bg-pink-500/25",   activeColor: "text-white" },
  PenLine:      { icon: PenLine,      bg: "bg-yellow-500/10", color: "text-yellow-400", activeBg: "bg-yellow-500/25", activeColor: "text-white" },
  Lightbulb:    { icon: Lightbulb,    bg: "bg-amber-500/10",  color: "text-amber-400",  activeBg: "bg-amber-500/25",  activeColor: "text-white" },
  BarChart2:    { icon: BarChart2,    bg: "bg-cyan-500/10",   color: "text-cyan-400",   activeBg: "bg-cyan-500/25",   activeColor: "text-white" },
  Terminal:     { icon: Terminal,     bg: "bg-emerald-500/10",color: "text-emerald-400",activeBg: "bg-emerald-500/25",activeColor: "text-white" },
  FileText:     { icon: FileText,     bg: "bg-orange-500/10", color: "text-orange-400", activeBg: "bg-orange-500/25", activeColor: "text-white" },
  Cpu:          { icon: Cpu,          bg: "bg-purple-500/10", color: "text-purple-400", activeBg: "bg-purple-500/25", activeColor: "text-white" },
  Brain:        { icon: Brain,        bg: "bg-violet-500/10", color: "text-violet-400", activeBg: "bg-violet-500/25", activeColor: "text-white" },
  MessageCircle:{ icon: MessageCircle,bg: "bg-gray-500/10",   color: "text-gray-400",   activeBg: "bg-gray-500/25",   activeColor: "text-white" },
};

// Pick an icon config from the conversation title using keyword matching.
function getConversationIconConfig(title: string): IconConfig {
  const t = title.toLowerCase();
  if (t.includes("code") || t.includes("function") || t.includes("debug") ||
      t.includes("error") || t.includes("python") || t.includes("javascript") ||
      t.includes("api") || t.includes("bug"))
    return ICON_CONFIGS.Code2;

  if (t.includes("search") || t.includes("latest") || t.includes("news") ||
      t.includes("current") || t.includes("today") || t.includes("recent"))
    return ICON_CONFIGS.Globe;

  if (t.includes("image") || t.includes("generate") || t.includes("draw") ||
      t.includes("picture") || t.includes("photo") || t.includes("visual"))
    return ICON_CONFIGS.Image;

  if (t.includes("write") || t.includes("email") || t.includes("draft") ||
      t.includes("essay") || t.includes("linkedin") || t.includes("post"))
    return ICON_CONFIGS.PenLine;

  if (t.includes("explain") || t.includes("what is") ||
      t.includes("how does") || t.includes("understand"))
    return ICON_CONFIGS.Lightbulb;

  if (t.includes("chart") || t.includes("data") || t.includes("analysis") ||
      t.includes("plot") || t.includes("graph") || t.includes("csv"))
    return ICON_CONFIGS.BarChart2;

  if (t.includes("test") || t.includes("run") ||
      t.includes("execute") || t.includes("output"))
    return ICON_CONFIGS.Terminal;

  if (t.includes("summarize") || t.includes("summary") ||
      t.includes("document") || t.includes("pdf"))
    return ICON_CONFIGS.FileText;

  if (t.includes("build") || t.includes("create") ||
      t.includes("implement") || t.includes("develop"))
    return ICON_CONFIGS.Cpu;

  if (t.includes("brainstorm") || t.includes("idea") ||
      t.includes("suggest") || t.includes("help me"))
    return ICON_CONFIGS.Brain;

  return ICON_CONFIGS.MessageCircle;
}

// Wraps occurrences of `query` inside `text` with a highlighted <mark> span.
function highlightSnippet(text: string, query: string): React.ReactNode {
  if (!query.trim() || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const parts = text.split(new RegExp(`(${escaped})`, "gi"));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase() ? (
      <mark
        key={i}
        className="rounded bg-violet-500/30 px-0.5 text-violet-200 not-italic"
      >
        {part}
      </mark>
    ) : (
      part
    )
  );
}

function formatRelativeTime(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diffMs = Math.max(0, now - then);
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  if (diffMinutes < 1) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function HomeContent() {
  type UserLike = { id?: string; email?: string | null };
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  const [modelsById, setModelsById] = useState<
    Record<ModelId, AvailableModel>
  >({} as Record<ModelId, AvailableModel>);
  const [selectedModel, setSelectedModel] = useState<ModelId | null>("auto");
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState("");
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    null
  );
  const [isConversationsLoading, setIsConversationsLoading] = useState(true);
  const [chatScrollSignal, setChatScrollSignal] = useState(0);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarContentVisible, setIsSidebarContentVisible] = useState(true);
  const [user, setUser] = useState<UserLike | null>(null);
  const [showLoading, setShowLoading] = useState(true);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [bootIsNewUser, setBootIsNewUser] = useState(false);
  const [bootFirstName, setBootFirstName] = useState("");
  const bootstrapRunIdRef = useRef(0);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const [lastSentMessage, setLastSentMessage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [newConversationId, setNewConversationId] = useState<string | null>(
    null
  );
  const [deletingConversationId, setDeletingConversationId] = useState<
    string | null
  >(null);
  const [deletingConversationStage, setDeletingConversationStage] = useState<
    "out" | "collapse"
  >("out");
  const [isSplashWarping, setIsSplashWarping] = useState(false);
  const [isChatWarpingIn, setIsChatWarpingIn] = useState(false);
  const [isChatShaking, setIsChatShaking] = useState(false);
  // Agent-mode progress state — reset on every new message send.
  const [isAgentMode, setIsAgentMode] = useState(false);
  const [agentSteps, setAgentSteps] = useState<string[]>([]);
  const [agentCurrentStep, setAgentCurrentStep] = useState(0);
  const [agentCompletedSteps, setAgentCompletedSteps] = useState<number[]>([]);
  const [agentComplete, setAgentComplete] = useState(false);
  // Profile dropdown open/close + keyboard-shortcuts modal.
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement | null>(null);

  // Onboarding overlay — shown once after a user's first login.
  const [showOnboarding, setShowOnboarding]   = useState(false);
  const [onboardingName, setOnboardingName]   = useState("");

  // Active project linked to the current conversation.
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  // Sidebar conversation search.
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const searchDebounceRef = useRef<number | null>(null);

  // Track whether the splash overlay should exist in the DOM at all.
  // Always starts as true so the server and first client render match (no
  // hydration mismatch). A one-time effect immediately hides it on the client
  // if the user has already dismissed it.
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    if (window.sessionStorage.getItem("prism_splash_shown") === "1") {
      setShowSplash(false);
    }
  }, []);
  const splashWarpTimeoutsRef = useRef<number[]>([]);
  const sidebarAnimTimeoutsRef = useRef<number[]>([]);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const currentTheme = theme === "system" ? resolvedTheme : theme;
  const isDarkTheme = currentTheme === "dark";
  const [isThemeRotating, setIsThemeRotating] = useState(false);
  // Stays false on the server and on the first client render so that the
  // Sun/Moon opacity classes match the server-rendered HTML. Set to true
  // on the first effect run (after hydration) so the real theme icons appear.
  const [isThemeMounted, setIsThemeMounted] = useState(false);
  const didMountThemeRef = useRef(false);
  useEffect(() => {
    if (!didMountThemeRef.current) {
      didMountThemeRef.current = true;
      setIsThemeMounted(true);
      return;
    }
    setIsThemeRotating(true);
    const t = window.setTimeout(() => setIsThemeRotating(false), 400);
    return () => window.clearTimeout(t);
  }, [isDarkTheme]);
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationParam = searchParams.get("conversation");
  const searchOpenParam = searchParams.get("search");
  const newChatParam = searchParams.get("new");
  const conversationFromUrlAppliedRef = useRef<string | null>(null);
  const searchUrlHandledRef = useRef(false);
  const newChatUrlHandledRef = useRef(false);
  const supabase = createClient();
  const touchStartXRef = useRef(0);
  const touchStartYRef = useRef(0);
  const sidebarSearchRef = useRef<HTMLInputElement | null>(null);
  const [swipeOpenConversationId, setSwipeOpenConversationId] = useState<
    string | null
  >(null);
  const [pinnedConversationIds, setPinnedConversationIds] = useState<string[]>(
    []
  );
  const [contextMenu, setContextMenu] = useState<{
    conversation: Conversation;
    anchor: DOMRect;
  } | null>(null);
  const [contextMenuProjects, setContextMenuProjects] = useState<Project[]>([]);
  /** Unpinned conversation ids — manual order from localStorage + drag. */
  const [manualConvOrder, setManualConvOrder] = useState<string[]>([]);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [showSidebarResizeHint, setShowSidebarResizeHint] = useState(true);
  const sidebarResizeDoneRef = useRef(false);
  const [bulkSelectMode, setBulkSelectMode] = useState(false);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<Set<string>>(
    () => new Set()
  );
  const [bulkDeleteConfirmOpen, setBulkDeleteConfirmOpen] = useState(false);
  const [bulkMoveOpen, setBulkMoveOpen] = useState(false);
  const [bulkProjects, setBulkProjects] = useState<Project[]>([]);
  const [activeConvDragId, setActiveConvDragId] = useState<string | null>(
    null
  );
  const pendingBulkDeleteTimerRef = useRef<number | null>(null);
  const conversationsBeforeBulkDeleteRef = useRef<Conversation[] | null>(
    null
  );
  const sidebarWidthLiveRef = useRef(256);
  const [installPrompt, setInstallPrompt] = useState<
    | (Event & {
        prompt: () => Promise<void>;
        userChoice: Promise<{ outcome: string }>;
      })
    | null
  >(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);
  const keyboardOpen = useMobileKeyboardOpen();

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const isCmdOrCtrl = event.metaKey || event.ctrlKey;

      if (isCmdOrCtrl && key === "k") {
        event.preventDefault();
        inputRef.current?.focus();
      }

      if (isCmdOrCtrl && key === "n") {
        event.preventDefault();
        handleCreateConversation();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  useEffect(() => {
    return () => {
      splashWarpTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
      splashWarpTimeoutsRef.current = [];
    };
  }, []);

  useEffect(() => {
    return () => {
      sidebarAnimTimeoutsRef.current.forEach((t) =>
        window.clearTimeout(t)
      );
      sidebarAnimTimeoutsRef.current = [];
    };
  }, []);

  // Load available models as soon as the page mounts.
  useEffect(() => {
    let isCancelled = false;

    const loadModels = async () => {
      try {
        const models = await fetchModels();
        if (isCancelled) return;
        setModelsById(models);
      } catch {
        // On failure we keep an empty model list; UI will still be usable but without labels.
      }
    };

    loadModels();

    return () => {
      isCancelled = true;
    };
  }, []);

  // Auth check and listener.
  useEffect(() => {
    let isCancelled = false;
    const initAuth = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (isCancelled) return;
      if (!session) {
        router.push("/landing");
        return;
      }
      setUser(session.user as UserLike);
      /* Onboarding is opened from the app bootstrap sequence after profile loads. */
    };
    initAuth();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        try {
          sessionStorage.removeItem("prism_app_loaded");
          sessionStorage.removeItem("prism_bulk_embedded");
          sessionStorage.removeItem("prism_user_id");
        } catch {
          /* sessionStorage unavailable */
        }
        setUser(null);
        router.push("/landing");
      } else {
        setUser(session.user as UserLike);

        if (event === "SIGNED_IN") {
          try {
            const previousUserId = sessionStorage.getItem("prism_user_id");
            const currentUserId = session.user.id ?? "";
            if (previousUserId && previousUserId !== currentUserId) {
              sessionStorage.removeItem("prism_app_loaded");
              sessionStorage.removeItem("prism_bulk_embedded");
            }
            sessionStorage.setItem("prism_user_id", currentUserId);
          } catch {
            /* sessionStorage unavailable */
          }

          // After email verification the user lands here for the first time.
          // If signup stored a pending profile name, save it now and clear it.
          try {
            const raw = window.localStorage.getItem("prism_pending_profile");
            if (raw) {
              const pending = JSON.parse(raw) as { display_name: string };
              window.localStorage.removeItem("prism_pending_profile");
              saveProfile({ display_name: pending.display_name }).catch(
                () => {/* Non-fatal — user can update profile manually. */}
              );
            }
          } catch {
            // localStorage unavailable or JSON malformed — skip silently.
          }
        }
      }
    });

    return () => {
      isCancelled = true;
      authListener.subscription.unsubscribe();
    };
  }, [router, supabase]);

  // Bootstrap: profile, conversations, projects, embeddings; optional full loading UI.
  useEffect(() => {
    if (!user) {
      setShowLoading(false);
      return;
    }

    const runId = ++bootstrapRunIdRef.current;
    let cancelled = false;
    const isStale = () => cancelled || runId !== bootstrapRunIdRef.current;

    let skipVisual = false;
    try {
      skipVisual = sessionStorage.getItem("prism_app_loaded") === "true";
    } catch {
      /* sessionStorage unavailable */
    }

    if (skipVisual) {
      setShowLoading(false);
      setLoadingProgress(100);
    } else {
      setShowLoading(true);
      setLoadingProgress(0);
    }

    const bootStartedAt = Date.now();
    let safetyId: number | null = null;
    if (!skipVisual) {
      safetyId = window.setTimeout(() => {
        if (cancelled || runId !== bootstrapRunIdRef.current) return;
        setLoadingProgress(100);
        window.setTimeout(() => {
          if (cancelled || runId !== bootstrapRunIdRef.current) return;
          try {
            sessionStorage.setItem("prism_app_loaded", "true");
          } catch {
            /* ignore */
          }
          setShowLoading(false);
        }, 1200);
      }, 8000);
    }

    const clearSafety = () => {
      if (safetyId != null) {
        window.clearTimeout(safetyId);
        safetyId = null;
      }
    };

    void (async () => {
      let isNew = false;

      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          clearSafety();
          return;
        }
        if (isStale()) return;

        if (!skipVisual) setLoadingProgress(20);

        let profile: Awaited<ReturnType<typeof getProfile>> = {};
        try {
          profile = await getProfile();
        } catch {
          /* continue without profile */
        }
        if (isStale()) return;

        isNew = profile.onboarding_completed !== true;
        setBootIsNewUser(isNew);

        const firstName =
          profile.display_name?.split(" ")[0] ||
          (session.user.user_metadata?.first_name as string | undefined) ||
          (
            (session.user.user_metadata?.full_name as string | undefined) || ""
          )
            .split(" ")[0] ||
          "";
        setBootFirstName(firstName);

        if (isNew) {
          const meta = session.user.user_metadata ?? {};
          const fn =
            (meta.first_name as string | undefined) ||
            ((meta.full_name as string | undefined) ?? "").split(" ")[0] ||
            "";
          setOnboardingName(fn);
          setShowOnboarding(true);
        }

        if (!skipVisual) setLoadingProgress(40);

        try {
          setIsConversationsLoading(true);
          const items = await getConversations();
          if (!isStale()) setConversations(items);
        } catch {
          if (!isStale()) setConversations([]);
        } finally {
          if (!isStale()) setIsConversationsLoading(false);
        }
        if (isStale()) return;

        if (!skipVisual) setLoadingProgress(60);

        try {
          const ps = await getProjects();
          if (!isStale()) setBulkProjects(ps);
        } catch {
          if (!isStale()) setBulkProjects([]);
        }
        if (isStale()) return;

        if (!skipVisual) setLoadingProgress(80);

        try {
          const hasEmbedded = sessionStorage.getItem("prism_bulk_embedded");
          if (!hasEmbedded) {
            sessionStorage.setItem("prism_bulk_embedded", "true");
            void embedAllConversations().then((result) => {
              if (result) {
                console.log(
                  `Embedded ${result.embedded}/${result.total} conversations`
                );
              }
            });
          }
        } catch {
          /* sessionStorage unavailable */
        }
        if (isStale()) return;

        if (skipVisual) {
          return;
        }

        setLoadingProgress(95);

        await new Promise((r) => setTimeout(r, 300));
        if (isStale()) return;

        const minMs = isNew ? 2500 : 1500;
        const elapsed = Date.now() - bootStartedAt;
        if (elapsed < minMs) {
          await new Promise((r) => setTimeout(r, minMs - elapsed));
        }
        if (isStale()) return;

        setLoadingProgress(100);
        clearSafety();
      } catch {
        clearSafety();
        if (!isStale()) {
          setLoadingProgress(100);
          window.setTimeout(() => {
            if (!isStale()) {
              try {
                sessionStorage.setItem("prism_app_loaded", "true");
              } catch {
                /* ignore */
              }
              setShowLoading(false);
            }
          }, 1200);
        }
      }
    })();

    return () => {
      cancelled = true;
      clearSafety();
    };
  }, [user, supabase]);

  // Load sidebar collapsed state (and default to collapsed on small screens).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      const stored = window.localStorage.getItem("prism_sidebar_collapsed");
      const initialCollapsed =
        mobile ? true : stored !== null ? stored === "1" : false;
      setIsSidebarCollapsed(initialCollapsed);
      setIsSidebarContentVisible(!initialCollapsed);
    } catch {
      // Ignore storage errors.
    }
  }, []);

  const toggleSidebar = () => {
    // Mobile uses translate-based open/close; keep it instant.
    if (isMobile) {
      setIsSidebarCollapsed((prev) => {
        const next = !prev;
        setIsSidebarContentVisible(!next);
        try {
          window.localStorage.setItem(
            "prism_sidebar_collapsed",
            next ? "1" : "0"
          );
        } catch {
          // Ignore storage errors.
        }
        return next;
      });
      return;
    }

    // Desktop cinematic collapse/expand:
    // - Collapse: fade out content (150ms) -> collapse width (250ms).
    // - Expand: expand width (250ms) -> fade in content (150ms).
    sidebarAnimTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
    sidebarAnimTimeoutsRef.current = [];

    if (!isSidebarCollapsed) {
      // Start fading out immediately, delay the width collapse.
      setIsSidebarContentVisible(false);
      const t = window.setTimeout(() => {
        setIsSidebarCollapsed(true);
        try {
          window.localStorage.setItem("prism_sidebar_collapsed", "1");
        } catch {
          // Ignore storage errors.
        }
      }, 150);
      sidebarAnimTimeoutsRef.current.push(t);
      return;
    }

    // Start expanding the width immediately, delay content fade-in.
    setIsSidebarContentVisible(false);
    setIsSidebarCollapsed(false);
    try {
      window.localStorage.setItem("prism_sidebar_collapsed", "0");
    } catch {
      // Ignore storage errors.
    }
    const t = window.setTimeout(() => {
      setIsSidebarContentVisible(true);
    }, 250);
    sidebarAnimTimeoutsRef.current.push(t);
  };

  useEffect(() => {
    if (!isMobile) return;
    setIsSidebarContentVisible(!isSidebarCollapsed);
  }, [isMobile, isSidebarCollapsed]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("prism_pinned_conversations");
      setPinnedConversationIds(
        raw ? (JSON.parse(raw) as string[]) : []
      );
    } catch {
      setPinnedConversationIds([]);
    }
  }, []);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!isResizingSidebar) {
      sidebarWidthLiveRef.current = sidebarWidth;
    }
  }, [sidebarWidth, isResizingSidebar]);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem("prism_conv_order");
      if (raw) {
        const parsed = JSON.parse(raw) as unknown;
        if (Array.isArray(parsed) && parsed.every((x) => typeof x === "string")) {
          setManualConvOrder(parsed);
        }
      }
    } catch {
      /* ignore */
    }
    try {
      const w = parseInt(
        window.localStorage.getItem("prism_sidebar_width") || "",
        10
      );
      if (Number.isFinite(w) && w >= 200 && w <= 480) {
        setSidebarWidth(w);
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (searchOpenParam !== "true" || searchUrlHandledRef.current) {
      return;
    }
    searchUrlHandledRef.current = true;
    setIsSidebarCollapsed(false);
    setIsSidebarContentVisible(true);
    try {
      window.localStorage.setItem("prism_sidebar_collapsed", "0");
    } catch {
      /* ignore */
    }
    router.replace("/", { scroll: false });
    const id = window.requestAnimationFrame(() =>
      sidebarSearchRef.current?.focus()
    );
    return () => window.cancelAnimationFrame(id);
  }, [searchOpenParam, router]);

  useEffect(() => {
    if (newChatParam !== "true" || newChatUrlHandledRef.current) {
      return;
    }
    newChatUrlHandledRef.current = true;
    setActiveConversationId(null);
    setMessages([]);
    setInputValue("");
    router.replace("/", { scroll: false });
  }, [newChatParam, router]);

  useEffect(() => {
    let dismissed = 0;
    try {
      dismissed = Number(
        window.localStorage.getItem("prism_install_dismissed_until") ?? "0"
      );
    } catch {
      /* ignore */
    }
    if (Number.isFinite(dismissed) && Date.now() < dismissed) {
      return;
    }

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallPrompt(
        e as Event & {
          prompt: () => Promise<void>;
          userChoice: Promise<{ outcome: string }>;
        }
      );
      window.setTimeout(() => setShowInstallBanner(true), 30000);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    return () =>
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
  }, []);

  const orderedConversations = useMemo(() => {
    const pinSet = new Set(pinnedConversationIds);
    const pinned: Conversation[] = [];
    for (const id of pinnedConversationIds) {
      const c = conversations.find((x) => x.id === id);
      if (c) pinned.push(c);
    }
    let rest = conversations.filter((c) => !pinSet.has(c.id));
    if (manualConvOrder.length > 0) {
      rest = [...rest].sort((a, b) => {
        const ai = manualConvOrder.indexOf(a.id);
        const bi = manualConvOrder.indexOf(b.id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
    }
    return [...pinned, ...rest];
  }, [conversations, pinnedConversationIds, manualConvOrder]);

  const pinnedConversations = useMemo(() => {
    const pinSet = new Set(pinnedConversationIds);
    const pinned: Conversation[] = [];
    for (const id of pinnedConversationIds) {
      const c = conversations.find((x) => x.id === id);
      if (c) pinned.push(c);
    }
    return pinned;
  }, [conversations, pinnedConversationIds]);

  const unpinnedOrderedConversations = useMemo(() => {
    const pinSet = new Set(pinnedConversationIds);
    let rest = conversations.filter((c) => !pinSet.has(c.id));
    if (manualConvOrder.length > 0) {
      rest = [...rest].sort((a, b) => {
        const ai = manualConvOrder.indexOf(a.id);
        const bi = manualConvOrder.indexOf(b.id);
        if (ai === -1 && bi === -1) return 0;
        if (ai === -1) return 1;
        if (bi === -1) return -1;
        return ai - bi;
      });
    }
    return rest;
  }, [conversations, pinnedConversationIds, manualConvOrder]);

  const conversationSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const refreshConversations = async () => {
    try {
      const items = await getConversations();
      setConversations(items);
    } catch {
      // Ignore refresh failures; existing state remains.
    }
  };

  const handleBootLoadingComplete = useCallback(() => {
    try {
      sessionStorage.setItem("prism_app_loaded", "true");
    } catch {
      /* sessionStorage unavailable */
    }
    setShowLoading(false);
  }, []);

  const openConversationById = useCallback(
    async (id: string, knownConv?: Conversation) => {
      setActiveConversationId(id);
      try {
        const items = await getConversationMessages(id);
        const mapped: ChatMessage[] = items.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          model_id: message.model_id as ModelId | undefined,
          routed_to: message.routed_to as ModelId | undefined,
          routing_reason: message.routing_reason ?? undefined,
          search_used: message.search_used,
          search_query: message.search_query,
          created_at: message.created_at,
          file_used: message.file_used,
          file_name: message.file_name ?? undefined,
        }));
        setMessages(mapped);

        let conv: Conversation | null | undefined = knownConv;
        if (knownConv === undefined) {
          conv = conversations.find((c) => c.id === id);
        }
        if (conv == null) {
          const fresh = await getConversations();
          setConversations(fresh);
          conv = fresh.find((c) => c.id === id) ?? null;
        }

        if (conv?.project_id) {
          try {
            const proj = await getProject(conv.project_id);
            setActiveProject(proj);
          } catch {
            setActiveProject(null);
          }
        } else {
          setActiveProject(null);
        }

        setChatScrollSignal((s) => s + 1);
      } catch {
        setMessages([]);
        setActiveProject(null);
      }
    },
    [conversations]
  );

  useEffect(() => {
    if (!conversationParam) {
      conversationFromUrlAppliedRef.current = null;
      return;
    }
    if (isConversationsLoading) return;
    if (conversationFromUrlAppliedRef.current === conversationParam) return;
    conversationFromUrlAppliedRef.current = conversationParam;

    const param = conversationParam;
    void (async () => {
      try {
        const conv = conversations.find((c) => c.id === param);
        if (conv) {
          await openConversationById(param, conv);
        } else {
          await openConversationById(param);
        }
      } finally {
        window.history.replaceState({}, "", "/");
      }
    })();
  }, [
    conversationParam,
    conversations,
    isConversationsLoading,
    openConversationById,
  ]);

  const handleCreateConversation = () => {
    setActiveConversationId(null);
    setMessages([]);
    setInputValue("");
  };

  const handleSplashEnter = () => {
    setActiveConversationId(null);
    setMessages([]);
    setInputValue("");

    // Cinematic splash -> chat warp transition.
    splashWarpTimeoutsRef.current.forEach((t) => window.clearTimeout(t));
    splashWarpTimeoutsRef.current = [];

    setIsSplashWarping(true);
    setIsChatWarpingIn(false);
    setIsChatShaking(false);

    // 400ms: start chat zoom-in.
    splashWarpTimeoutsRef.current.push(
      window.setTimeout(() => {
        setIsChatWarpingIn(true);
      }, 400)
    );

    // 600ms: splash overlay can stop its own zoom animation.
    splashWarpTimeoutsRef.current.push(
      window.setTimeout(() => {
        setIsSplashWarping(false);
      }, 600)
    );

    // 700ms: brief shake for landing impact.
    splashWarpTimeoutsRef.current.push(
      window.setTimeout(() => {
        setIsChatShaking(true);
        splashWarpTimeoutsRef.current.push(
          window.setTimeout(() => {
            setIsChatShaking(false);
          }, 300)
        );
      }, 700)
    );

    // 900ms: chat spring-in animation is done (~300ms from t=400). Reset classes
    // so the element isn't frozen in an animated state.
    splashWarpTimeoutsRef.current.push(
      window.setTimeout(() => {
        setIsChatWarpingIn(false);
      }, 900)
    );

    // 1100ms: safety cleanup — fully remove splash overlay and reset all warp
    // states regardless of what happened above.
    splashWarpTimeoutsRef.current.push(
      window.setTimeout(() => {
        setShowSplash(false);
        setIsSplashWarping(false);
        setIsChatWarpingIn(false);
        setIsChatShaking(false);
      }, 1100)
    );
  };

  const handleOpenConversation = async (id: string) => {
    const conv = conversations.find((c) => c.id === id);
    await openConversationById(id, conv);
  };

  const handleDeleteConversation = async (id: string) => {
    setDeletingConversationId(id);
    setDeletingConversationStage("out");

    const wasActive = activeConversationId === id;
    if (wasActive) {
      setActiveConversationId(null);
      setMessages([]);
    }

    try {
      await deleteConversation(id);

      window.setTimeout(() => {
        setDeletingConversationStage("collapse");
      }, 250);

      window.setTimeout(async () => {
        setDeletingConversationId(null);
        setDeletingConversationStage("out");
        await refreshConversations();
      }, 450);
    } catch {
      setDeletingConversationId(null);
      setDeletingConversationStage("out");
      pushToast("Something went wrong", "error");
    }
  };

  const requestDeleteConversation = (id: string) => {
    if (!window.confirm("Delete this conversation?")) {
      return;
    }
    void handleDeleteConversation(id);
    setSwipeOpenConversationId(null);
  };

  const openConversationContextMenu = useCallback(
    async (conversation: Conversation, anchor: DOMRect) => {
      setSwipeOpenConversationId(null);
      setContextMenu({ conversation, anchor });
      try {
        const ps = await getProjects();
        setContextMenuProjects(ps);
      } catch {
        setContextMenuProjects([]);
      }
    },
    []
  );

  const handleInstallClick = async () => {
    if (!installPrompt || typeof installPrompt.prompt !== "function") {
      return;
    }
    await installPrompt.prompt();
    await installPrompt.userChoice;
    setShowInstallBanner(false);
    setInstallPrompt(null);
  };

  const dismissInstallBanner = () => {
    const until = Date.now() + 7 * 24 * 60 * 60 * 1000;
    try {
      window.localStorage.setItem(
        "prism_install_dismissed_until",
        String(until)
      );
    } catch {
      /* ignore */
    }
    setShowInstallBanner(false);
  };

  // Close profile dropdown when user clicks outside of it.
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        profileDropdownRef.current &&
        !profileDropdownRef.current.contains(e.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };
    if (isProfileOpen) {
      document.addEventListener("mousedown", handler);
    }
    return () => document.removeEventListener("mousedown", handler);
  }, [isProfileOpen]);

  // Debounced sidebar search — fires 300 ms after the query stops changing.
  useEffect(() => {
    if (searchDebounceRef.current !== null) {
      window.clearTimeout(searchDebounceRef.current);
    }
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }
    setIsSearching(true);
    searchDebounceRef.current = window.setTimeout(async () => {
      try {
        const results = await searchConversations(searchQuery);
        setSearchResults(results.slice(0, 10));
      } catch {
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => {
      if (searchDebounceRef.current !== null) {
        window.clearTimeout(searchDebounceRef.current);
      }
    };
  }, [searchQuery]);

  const handleSend = async (
    message: string,
    file?: { file_name: string; file_type: string; file_content: string },
    image?: { base64: string; mediaType: string },
    template?: { id: string; label: string },
    options?: { editedThread?: ChatMessage[] }
  ) => {
    const activeProjectId = activeProject?.id ?? null;
    console.log("Active project ID:", activeProjectId);

    if (!selectedModel) {
      return;
    }

    const editedThread = options?.editedThread;

    // Reset agent progress from any previous turn.
    setIsAgentMode(false);
    setAgentSteps([]);
    setAgentCurrentStep(0);
    setAgentCompletedSteps([]);
    setAgentComplete(false);

    setLastSentMessage(message);

    let userMessage: ChatMessage;
    let conversationId = activeConversationId;

    if (editedThread) {
      const lastUser = editedThread[editedThread.length - 1];
      if (!lastUser || lastUser.role !== "user") {
        return;
      }
      if (!conversationId) {
        return;
      }
      userMessage = {
        ...lastUser,
        content: message,
        file_used: !!file,
        file_name: file?.file_name,
        file_type: file?.file_type,
        file_content: file?.file_content,
        image_base64: image?.base64,
        image_media_type: image?.mediaType,
        image_used: !!image,
        model_id: selectedModel,
      };
    } else {
      userMessage = {
        id: crypto.randomUUID(),
        role: "user",
        content: message,
        model_id: selectedModel,
        created_at: new Date().toISOString(),
        file_used: !!file,
        file_name: file?.file_name,
        file_type: file?.file_type,
        file_content: file?.file_content,
        image_base64: image?.base64,
        image_media_type: image?.mediaType,
        image_used: !!image,
      };

      if (!conversationId) {
        try {
          const title = message.trim() || "New conversation";
          const conversation = await createConversation(
            title.length > 35 ? title.slice(0, 35).trimEnd() : title,
            selectedModel
          );
          if (activeProjectId) {
            await linkConversationToProject(conversation.id, activeProjectId);
            console.log("Linked to project:", activeProjectId);
          }
          conversationId = conversation.id;
          setActiveConversationId(conversation.id);
          setNewConversationId(conversation.id);
          window.setTimeout(() => {
            setNewConversationId((current) =>
              current === conversation.id ? null : current
            );
          }, 300);
          await refreshConversations();
        } catch {
          return;
        }
      }
    }

    setIsLoading(true);

    let persistedUser: ChatMessage = userMessage;
    try {
      const savedUser = await saveMessage({
        conversation_id: conversationId!,
        role: "user",
        content: message,
        model_id: selectedModel,
        file_used: !!file,
        file_name: file?.file_name,
      });
      persistedUser = {
        ...userMessage,
        id: savedUser.id,
        created_at: savedUser.created_at ?? userMessage.created_at,
      };
    } catch {
      // Ignore message save failure for user message.
    }

    const historySource = editedThread ?? messages;
    const historyEnd = editedThread ? editedThread.length - 1 : historySource.length;
    const history: HistoryMessage[] = historySource
      .slice(0, historyEnd)
      .map((item) => ({
        role: item.role,
        content: String(item.content),
        model_id: item.model_id || item.routed_to || undefined,
      }));

    const assistantPlaceholder: ChatMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      model_id: selectedModel,
      isStreaming: true,
      active_template_label: template?.label,
    };

    const priorForInitial = editedThread
      ? editedThread.slice(0, -1)
      : messages;
    const initialMessages = [
      ...priorForInitial,
      persistedUser,
      assistantPlaceholder,
    ];
    setMessages(initialMessages);

    let assistantContent = "";
    let latestMetadata:
      | (Partial<{
          reply: string;
          routed_to?: string;
          routing_reason?: string;
          search_used?: boolean;
          search_query?: string;
          image_used?: boolean;
          is_agent?: boolean;
          agent_step_count?: number;
          response_type?: "text" | "plot" | "image";
          plot_json?: object;
          image_url?: string;
        }> &
          Record<string, unknown>)
      | null = null;

    try {
      await sendMessageStream(
        message,
        selectedModel,
        history,
        (token) => {
          assistantContent += token;
          const chunkLen = token.length;
          setMessages((prev) =>
            prev.map((m, i) =>
              i === prev.length - 1
                ? {
                    ...m,
                    content: m.content + token,
                    lastTokenLength: chunkLen,
                  }
                : m
            )
          );
        },
        (metadata) => {
          latestMetadata = metadata;
          setMessages((prev) =>
            prev.map((m, i) => {
              if (i !== prev.length - 1) return m;

              const next: ChatMessage = {
                ...m,
                routed_to: (metadata.routed_to as ModelId | undefined) ?? m.routed_to,
                routing_reason: metadata.routing_reason,
                search_used: metadata.search_used,
                search_query: metadata.search_query,
                image_used: metadata.image_used,
                is_agent: metadata.is_agent,
                agent_step_count: metadata.agent_step_count,
                // Keep the pre-set label; backend echo is optional.
                active_template_label: m.active_template_label ?? (metadata as Record<string, unknown>).active_template_label as string | undefined,
                response_type: metadata.response_type,
                plot_json: metadata.plot_json,
                image_url: metadata.image_url,
              };

              // Plot/image responses come back as JSON; use full reply there.
              if (
                metadata.response_type &&
                metadata.response_type !== "text" &&
                typeof metadata.reply === "string"
              ) {
                assistantContent = metadata.reply;
                next.content = metadata.reply;
                next.lastTokenLength = undefined;
              }

              return next;
            })
          );
        },
        () => {
          setIsLoading(false);

          setMessages((prev) =>
            prev.map((m, i) =>
              i === prev.length - 1
                ? { ...m, isStreaming: false, lastTokenLength: undefined }
                : m
            )
          );

          void (async () => {
            if (!conversationId) return;
            try {
              const savedAssistant = await saveMessage({
                conversation_id: conversationId!,
                role: "assistant",
                content: assistantContent,
                model_id: selectedModel,
                routed_to: latestMetadata?.routed_to,
                routing_reason: latestMetadata?.routing_reason,
                search_used: latestMetadata?.search_used,
                search_query: latestMetadata?.search_query,
              });
              setMessages((prev) => {
                const next = [...prev];
                const li = next.length - 1;
                if (li >= 0 && next[li].role === "assistant") {
                  next[li] = {
                    ...next[li],
                    id: savedAssistant.id,
                    created_at: savedAssistant.created_at,
                  };
                }
                return next;
              });
              await refreshConversations();
            } catch {
              // Ignore assistant save failure.
            }
          })();
        },
        (error) => {
          pushToast("Something went wrong", "error");
          setIsLoading(false);
          setMessages((prev) =>
            prev.map((m, i) =>
              i === prev.length - 1
                ? {
                    ...m,
                    content: error,
                    isStreaming: false,
                    lastTokenLength: undefined,
                  }
                : m
            )
          );
        },
        file?.file_name,
        file?.file_type,
        file?.file_content,
        // Let the backend inject this user's custom profile instructions.
        user?.id,
        // Vision: base64 image for this turn only (not stored in history).
        image?.base64,
        image?.mediaType,
        // Prompt template id for this turn.
        template?.id,
        // Project whose files/instructions should be injected.
        activeProject?.id,
        // Agent-mode progress callbacks.
        (steps, total) => {
          setIsAgentMode(true);
          setAgentSteps(steps);
          setAgentCurrentStep(0);
          setAgentCompletedSteps([]);
          setAgentComplete(false);
          // Store total in metadata so the badge can show step count.
          if (total) {
            void total; // used via steps.length
          }
        },
        (step) => {
          setAgentCurrentStep(step);
        },
        (step, total) => {
          setAgentCompletedSteps((prev) => [...prev, step]);
          if (step === total) setAgentComplete(true);
        }
      );
    } catch {
      pushToast("Something went wrong", "error");
      setIsLoading(false);
      setMessages((prev) =>
        prev.map((m, i) =>
          i === prev.length - 1
            ? {
                ...m,
                content: "Something went wrong, please try again.",
                isStreaming: false,
                lastTokenLength: undefined,
              }
            : m
        )
      );
    }
  };

  const handleRegenerate = (messageIndex: number) => {
    setMessages((prev) => {
      const userMessage = prev[messageIndex - 1];
      if (!userMessage || userMessage.role !== "user") return prev;
      const content = String(userMessage.content ?? "");
      const file =
        userMessage.file_used &&
        userMessage.file_name &&
        userMessage.file_type &&
        userMessage.file_content
          ? {
              file_name: userMessage.file_name,
              file_type: userMessage.file_type,
              file_content: userMessage.file_content,
            }
          : undefined;
      const image = userMessage.image_base64
        ? {
            base64: userMessage.image_base64,
            mediaType: userMessage.image_media_type ?? "image/jpeg",
          }
        : undefined;
      queueMicrotask(() => {
        void handleSend(content, file, image);
      });
      return prev.slice(0, messageIndex);
    });
  };

  const handleEditMessage = (messageIndex: number, newContent: string) => {
    const trimmed = newContent.trim();
    if (!trimmed) return;
    if (isLoading) return;
    const prev = messagesRef.current;
    const orig = prev[messageIndex];
    if (!orig || orig.role !== "user") return;
    if (!activeConversationId) return;

    const file =
      orig.file_used &&
      orig.file_name &&
      orig.file_type &&
      orig.file_content
        ? {
            file_name: orig.file_name,
            file_type: orig.file_type,
            file_content: orig.file_content,
          }
        : undefined;
    const image = orig.image_base64
      ? {
          base64: orig.image_base64,
          mediaType: orig.image_media_type ?? "image/jpeg",
        }
      : undefined;

    const updated: ChatMessage = {
      ...orig,
      content: trimmed,
      isEdited: true,
      originalContent: orig.originalContent ?? String(orig.content ?? ""),
    };
    const nextThread = [...prev.slice(0, messageIndex), updated];
    setMessages(nextThread);
    void handleSend(trimmed, file, image, undefined, {
      editedThread: nextThread,
    });
  };

  const exitBulkSelect = useCallback(() => {
    setBulkSelectMode(false);
    setBulkSelectedIds(new Set());
    setBulkDeleteConfirmOpen(false);
    setBulkMoveOpen(false);
  }, []);

  useEffect(() => {
    if (!bulkSelectMode) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") exitBulkSelect();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [bulkSelectMode, exitBulkSelect]);

  useEffect(() => {
    if (!isResizingSidebar || isMobile) return;
    const onMove = (e: MouseEvent) => {
      const next = Math.min(480, Math.max(200, e.clientX));
      sidebarWidthLiveRef.current = next;
      setSidebarWidth(next);
    };
    const onUp = () => {
      setIsResizingSidebar(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
      try {
        window.localStorage.setItem(
          "prism_sidebar_width",
          String(sidebarWidthLiveRef.current)
        );
      } catch {
        /* ignore */
      }
      if (!sidebarResizeDoneRef.current) {
        sidebarResizeDoneRef.current = true;
        setShowSidebarResizeHint(false);
      }
    };
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
  }, [isResizingSidebar, isMobile]);

  const handleConversationDragStart = (event: DragStartEvent) => {
    setActiveConvDragId(String(event.active.id));
  };

  const handleConversationDragEnd = (event: DragEndEvent) => {
    setActiveConvDragId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const ids = unpinnedOrderedConversations.map((c) => c.id);
    const oldIndex = ids.indexOf(String(active.id));
    const newIndex = ids.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const nextOrder = arrayMove(ids, oldIndex, newIndex);
    setManualConvOrder(nextOrder);
    try {
      window.localStorage.setItem(
        "prism_conv_order",
        JSON.stringify(nextOrder)
      );
    } catch {
      /* ignore */
    }
  };

  const toggleConversationBulkSelect = (id: string) => {
    setBulkSelectMode(true);
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const enterBulkViaLongPress = (id: string) => {
    setBulkSelectMode(true);
    setBulkSelectedIds((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  const selectAllVisibleConversations = () => {
    setBulkSelectMode(true);
    setBulkSelectedIds(new Set(orderedConversations.map((c) => c.id)));
  };

  const openBulkMoveMenu = () => {
    setBulkMoveOpen((v) => !v);
    void getProjects()
      .then(setBulkProjects)
      .catch(() => setBulkProjects([]));
  };

  const runBulkLinkToProject = async (projectId: string | null) => {
    const ids = [...bulkSelectedIds];
    if (ids.length === 0) return;
    const proj =
      projectId === null
        ? null
        : bulkProjects.find((p) => p.id === projectId);
    try {
      for (const id of ids) {
        await linkConversationToProject(id, projectId);
      }
      pushToast(
        projectId && proj
          ? `Moved ${ids.length} to ${proj.name}`
          : `Unlinked ${ids.length} conversations`,
        "success"
      );
      await refreshConversations();
      exitBulkSelect();
    } catch {
      pushToast("Could not update conversations", "error");
    }
    setBulkMoveOpen(false);
  };

  const executeBulkDeleteAfterConfirm = () => {
    setBulkDeleteConfirmOpen(false);
    const ids = [...bulkSelectedIds];
    if (ids.length === 0) {
      exitBulkSelect();
      return;
    }
    conversationsBeforeBulkDeleteRef.current = [...conversations];
    const hadActive =
      activeConversationId !== null && ids.includes(activeConversationId);
    setConversations((prev) => prev.filter((c) => !ids.includes(c.id)));
    if (hadActive) {
      setActiveConversationId(null);
      setMessages([]);
    }
    exitBulkSelect();
    pushToast(`Deleting ${ids.length} conversations…`, "info", {
      durationMs: 2000,
    });
    if (pendingBulkDeleteTimerRef.current !== null) {
      window.clearTimeout(pendingBulkDeleteTimerRef.current);
    }
    pendingBulkDeleteTimerRef.current = window.setTimeout(async () => {
      pendingBulkDeleteTimerRef.current = null;
      for (const id of ids) {
        try {
          await deleteConversation(id);
        } catch {
          /* ignore per-item errors */
        }
      }
      conversationsBeforeBulkDeleteRef.current = null;
      await refreshConversations();
    }, 5000);
    pushToast(
      `${ids.length} conversation${ids.length === 1 ? "" : "s"} will be removed`,
      "success",
      {
        durationMs: 5000,
        actionLabel: "Undo",
        onAction: () => {
          if (pendingBulkDeleteTimerRef.current !== null) {
            window.clearTimeout(pendingBulkDeleteTimerRef.current);
            pendingBulkDeleteTimerRef.current = null;
          }
          const snap = conversationsBeforeBulkDeleteRef.current;
          conversationsBeforeBulkDeleteRef.current = null;
          if (snap) {
            setConversations(snap);
          }
          pushToast("Delete cancelled", "info");
        },
      }
    );
  };

  const handleQuoteReply = (quotedText: string) => {
    setInputValue(quotedText);
    // Focus input after React applies the new value.
    window.setTimeout(() => {
      if (inputRef.current) {
        inputRef.current.focus();
        const length = inputRef.current.value.length;
        inputRef.current.setSelectionRange(length, length);
      }
    }, 0);
  };

  const getConversationRowChrome = (conversation: Conversation) => {
    const isActive = conversation.id === activeConversationId;
    const animClass = `${
      conversation.id === newConversationId ? "prism-conv-enter" : ""
    } ${
      deletingConversationId === conversation.id
        ? deletingConversationStage === "out"
          ? "prism-conv-delete-out"
          : "prism-conv-delete-collapse"
        : ""
    } ${isActive ? "prism-conv-active" : ""}`;
    const rowSurfaceActive =
      "bg-[#e9ddff] dark:bg-[#2a1f44] pl-[11px] before:absolute before:left-0 before:top-0 before:bottom-0 before:z-10 before:w-[3px] before:bg-gradient-to-b before:from-[#7c3aed] before:to-[#06b6d4]";
    const rowSurfaceInactiveDesktop =
      "bg-transparent after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:bg-[#ede9fe] dark:after:bg-[#1f1633] after:-translate-x-full group-hover:after:translate-x-0 after:transition-transform after:duration-200";
    const rowSurfaceInactiveMobile =
      "bg-[#f5f3ff] dark:bg-[#0d0b1a] after:pointer-events-none after:absolute after:inset-0 after:-z-10 after:bg-[#ede9fe] dark:after:bg-[#1f1633] after:-translate-x-full group-hover:after:translate-x-0 after:transition-transform after:duration-200";
    const rowSurface = isActive
      ? rowSurfaceActive
      : isMobile
        ? rowSurfaceInactiveMobile
        : rowSurfaceInactiveDesktop;
    const cfg = getConversationIconConfig(conversation.title);
    const IconEl = cfg.icon;
    const iconSpan = (
      <span
        className={`flex shrink-0 items-center justify-center rounded-md transition-colors duration-200 ${
          isActive
            ? `${cfg.activeBg} ${cfg.activeColor}`
            : `${cfg.bg} ${cfg.color}`
        }`}
        style={{ width: 24, height: 24 }}
      >
        <IconEl className="size-3.5" />
      </span>
    );
    const textBlock = (
      <div className="min-w-0 text-left">
        <p className="line-clamp-1 text-foreground/90">{conversation.title}</p>
        <p className="text-[10px] text-muted-foreground">
          {formatRelativeTime(conversation.updated_at)}
        </p>
      </div>
    );
    return { isActive, animClass, rowSurface, iconSpan, textBlock };
  };

  // Warp class for the chat content area (not the sidebar or input).
  // Only applies while the splash is transitioning; once showSplash is false
  // no animation classes are set so the element stays naturally visible.
  const chatWarpClass = !showSplash
    ? ""
    : isChatWarpingIn
    ? "prism-warp-chat-in"
    : "prism-warp-chat-pre";

  const chatBootHidden = showLoading && !showSplash;

  return (
    <ToastProvider>
      <>
      {/*
        Splash overlay — conditionally mounted so it is fully removed from the
        DOM (no pointer-event blocking, no z-index residue) once the transition
        is complete. pointer-events are also disabled during the warp itself.
      */}
      {showSplash && (
        <div
          className="fixed inset-0 z-[9999]"
          style={{ pointerEvents: isSplashWarping ? "none" : "auto" }}
        >
          <SplashScreen onEnter={handleSplashEnter} />
          {isSplashWarping && (
            <div className="prism-meteor-layer" aria-hidden>
              {Array.from({ length: 10 }).map((_, i) => (
                <div
                  key={i}
                  className="prism-meteor-streak"
                  style={{
                    left: `${10 + i * 8}%`,
                    animationDelay: `${i * 45}ms`,
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Onboarding overlay — shown once after first login, sits above the chat UI */}
      {showOnboarding && (
        <Onboarding
          initialName={onboardingName}
          onComplete={(firstMessage) => {
            setShowOnboarding(false);
            if (firstMessage) setInputValue(firstMessage);
          }}
        />
      )}

      <div className="relative min-h-screen w-full">
        {user && showLoading && !showSplash && (
          <div className="absolute inset-0 z-[9999]">
            <LoadingScreen
              isNewUser={bootIsNewUser}
              userName={bootFirstName}
              progress={loadingProgress}
              onComplete={handleBootLoadingComplete}
            />
          </div>
        )}

        {/*
        Stable layout root — never has a transform applied, so all
        position:fixed children (sidebar, input bar) anchor correctly to
        the viewport regardless of what animation is running on the content.
      */}
        <motion.div
          suppressHydrationWarning
          className="min-h-screen bg-background text-foreground transition-colors duration-200"
          initial={{ opacity: 0 }}
          animate={{ opacity: chatBootHidden ? 0 : 1 }}
          transition={{
            duration: 0.4,
            delay: chatBootHidden ? 0 : 0.1,
            ease: "easeOut",
          }}
        >
        {/* Fixed sidebar — lives in the stable root so position:fixed anchors
            to the viewport and is never affected by the warp animation. */}
        <aside
          className={`fixed left-0 top-0 z-40 h-screen border-r border-border bg-[#f5f3ff] py-4 dark:bg-[#0d0b1a] overflow-hidden ${
            isMobile
              ? `w-64 px-4 transform transition-transform duration-[300ms] ease-out ${
                  isSidebarCollapsed ? "-translate-x-full" : "translate-x-0"
                }`
              : `${
                  isSidebarCollapsed
                    ? "max-w-0 border-transparent px-0 transition-[max-width] duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
                    : `px-4 ${
                        isResizingSidebar
                          ? ""
                          : "transition-[width] duration-100 ease-out"
                      }`
                }`
          }`}
          style={
            !isMobile
              ? isSidebarCollapsed
                ? { width: 0, minWidth: 0, maxWidth: 0 }
                : {
                    width: sidebarWidth,
                    minWidth: sidebarWidth,
                    maxWidth: sidebarWidth,
                  }
              : undefined
          }
        >
          <div className="relative flex h-full flex-col">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div
                className={`flex items-center gap-2 overflow-hidden transition-opacity ${
                  isMobile ? "duration-0" : "duration-[150ms]"
                } ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isSidebarContentVisible ? "opacity-100" : "opacity-0"
                } ${isSidebarContentVisible ? "" : "pointer-events-none"}`}
              >
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-sky-500 via-violet-500 to-emerald-400 text-xs font-semibold text-white shadow-sm">
                    P
                  </div>
                  <span className="truncate text-sm font-semibold tracking-tight">
                    Prism
                  </span>
              </div>
              <button
                type="button"
                onClick={toggleSidebar}
                className="hidden md:inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-xs text-foreground shadow-sm transition-colors hover:bg-muted"
                aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                <PanelLeftClose
                  className={`size-4 transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${
                    isSidebarCollapsed ? "rotate-180" : "rotate-0"
                  }`}
                  style={{ willChange: "transform" }}
                />
              </button>
            </div>

            <div
              className={`flex flex-col flex-1 min-h-0 transition-opacity ${
                isMobile ? "duration-0" : "duration-[150ms]"
              } ease-[cubic-bezier(0.16,1,0.3,1)] ${
                isSidebarContentVisible ? "opacity-100" : "opacity-0"
              } ${isSidebarContentVisible ? "pointer-events-auto" : "pointer-events-none"}`}
            >
                <button
                  type="button"
                  onClick={handleCreateConversation}
                  className="mb-2 relative overflow-hidden inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#2563eb] px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:brightness-110 hover:shadow-[0_0_25px_rgba(124,58,237,0.25)] before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full"
                >
                  <Plus className="size-4" />
                  <span>New Chat</span>
                </button>

                {/* Projects link */}
                <a
                  href="/projects"
                  className="mb-3 inline-flex w-full items-center gap-2 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <FolderOpen className="size-3.5 shrink-0" />
                  <span>Projects</span>
                </a>

                {/* Search bar */}
                <div className="relative mb-3">
                  <span className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-muted-foreground/60">
                    {isSearching ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Search className="size-3.5" />
                    )}
                  </span>
                  <input
                    ref={sidebarSearchRef}
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Escape") setSearchQuery("");
                    }}
                    placeholder="Search conversations…"
                    className="h-9 w-full rounded-xl border border-border/50 bg-muted/30 pl-8 pr-8 text-xs text-foreground placeholder:text-muted-foreground/50 outline-none transition-colors focus:border-[#7c3aed]/60 focus:ring-1 focus:ring-[#7c3aed]/30"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute inset-y-0 right-2.5 flex items-center text-muted-foreground/60 hover:text-foreground transition-colors cursor-pointer"
                      aria-label="Clear search"
                    >
                      <X className="size-3.5" />
                    </button>
                  )}
                </div>

                {/* Recent + bulk entry (mobile uses Select; desktop also has row long-press). */}
                {!searchQuery && (
                  <div className="mb-2 flex items-center justify-between gap-2 px-3">
                    <span className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50">
                      Recent
                    </span>
                    <button
                      type="button"
                      className="text-[10px] font-medium text-violet-500/90 hover:text-violet-400 transition-colors"
                      onClick={() => setBulkSelectMode(true)}
                    >
                      Select
                    </button>
                  </div>
                )}

                <div className="sidebar-scroll flex-1 overflow-y-auto pb-2 text-xs">
                  {/* ── Search results ── */}
                  {searchQuery.trim() ? (
                    isSearching ? (
                      // Skeleton placeholders while the API is in flight.
                      <div className="space-y-1 px-1">
                        {[1, 2, 3].map((n) => (
                          <div
                            key={n}
                            className="flex items-center gap-2 rounded-lg px-2 py-1.5"
                          >
                            <div className="h-6 w-6 shrink-0 animate-pulse rounded-md bg-muted/60" />
                            <div className="flex-1 space-y-1.5">
                              <div className="h-3 w-4/5 animate-pulse rounded bg-muted/60" />
                              <div className="h-2.5 w-3/5 animate-pulse rounded bg-muted/50" />
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : searchResults.length === 0 ? (
                      // Empty state.
                      <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
                        <Search className="size-7 text-muted-foreground/30" />
                        <p className="text-xs font-medium text-muted-foreground/70">
                          No results for &ldquo;{searchQuery}&rdquo;
                        </p>
                        <p className="text-[10px] text-muted-foreground/40">
                          Try different keywords
                        </p>
                      </div>
                    ) : (
                      // Result rows.
                      searchResults.map((result) => {
                        const isActive = result.id === activeConversationId;
                        const cfg = getConversationIconConfig(result.title);
                        const IconEl = cfg.icon;
                        return (
                          <div
                            key={result.id}
                            onClick={() => {
                              handleOpenConversation(result.id);
                              setSearchQuery("");
                            }}
                            className={`group relative flex cursor-pointer items-start gap-2 rounded-lg px-2 py-1.5 transition-colors duration-200 overflow-hidden ${
                              isActive
                                ? "bg-[#e9ddff] dark:bg-[#2a1f44] pl-[11px] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-gradient-to-b before:from-[#7c3aed] before:to-[#06b6d4]"
                                : "bg-transparent after:content-[''] after:absolute after:inset-0 after:-z-10 after:bg-[#ede9fe] dark:after:bg-[#1f1633] after:-translate-x-full group-hover:after:translate-x-0 after:transition-transform after:duration-200"
                            }`}
                          >
                            {/* Coloured topic icon */}
                            <span
                              className={`mt-0.5 flex shrink-0 items-center justify-center rounded-md transition-colors duration-200 ${
                                isActive
                                  ? `${cfg.activeBg} ${cfg.activeColor}`
                                  : `${cfg.bg} ${cfg.color}`
                              }`}
                              style={{ width: 24, height: 24 }}
                            >
                              <IconEl className="size-3.5" />
                            </span>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <p className="line-clamp-1 flex-1 text-foreground/90">
                                  {result.title}
                                </p>
                                {/* Match-type badge */}
                                <span
                                  className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                                    result.match_type === "title"
                                      ? "bg-blue-500/15 text-blue-400"
                                      : "bg-violet-500/15 text-violet-400"
                                  }`}
                                >
                                  {result.match_type === "title"
                                    ? "title"
                                    : "message"}
                                </span>
                              </div>
                              {/* Snippet with highlighted query */}
                              {result.snippet && (
                                <p className="mt-0.5 line-clamp-2 text-[10px] leading-relaxed text-muted-foreground">
                                  {highlightSnippet(result.snippet, searchQuery)}
                                </p>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )
                  ) : (
                    /* ── Normal conversation list ── */
                    isConversationsLoading ? (
                      <div className="space-y-2 px-2 text-[11px] text-muted-foreground">
                        <div className="h-4 w-full animate-pulse rounded bg-muted/60" />
                        <div className="h-4 w-10/12 animate-pulse rounded bg-muted/60" />
                        <div className="h-4 w-8/12 animate-pulse rounded bg-muted/60" />
                      </div>
                    ) : orderedConversations.length === 0 ? (
                      <p className="px-2 text-xs text-muted-foreground">
                        No conversations yet
                      </p>
                    ) : (
                      <>
                        {!isMobile ? (
                          <>
                            {pinnedConversations.map((conversation) => {
                              const { animClass, rowSurface, iconSpan, textBlock } =
                                getConversationRowChrome(conversation);
                              return (
                                <PinnedDesktopConversationRow
                                  key={conversation.id}
                                  animClass={`group ${animClass}`}
                                  rowSurface={rowSurface}
                                  topicIcon={iconSpan}
                                  textBlock={textBlock}
                                  bulkSelectMode={bulkSelectMode}
                                  isSelected={bulkSelectedIds.has(
                                    conversation.id
                                  )}
                                  onToggleSelected={() =>
                                    toggleConversationBulkSelect(
                                      conversation.id
                                    )
                                  }
                                  onBulkLongPress={() =>
                                    enterBulkViaLongPress(conversation.id)
                                  }
                                  onOpen={() =>
                                    void handleOpenConversation(
                                      conversation.id
                                    )
                                  }
                                  onDelete={() =>
                                    handleDeleteConversation(conversation.id)
                                  }
                                />
                              );
                            })}
                            <DndContext
                              sensors={conversationSensors}
                              collisionDetection={closestCenter}
                              onDragStart={handleConversationDragStart}
                              onDragEnd={handleConversationDragEnd}
                            >
                              <SortableContext
                                items={unpinnedOrderedConversations.map(
                                  (c) => c.id
                                )}
                                strategy={verticalListSortingStrategy}
                              >
                                {unpinnedOrderedConversations.map(
                                  (conversation) => {
                                    const {
                                      animClass,
                                      rowSurface,
                                      iconSpan,
                                      textBlock,
                                    } = getConversationRowChrome(conversation);
                                    return (
                                      <SortableDesktopConversationRow
                                        key={conversation.id}
                                        id={conversation.id}
                                        animClass={`group ${animClass}`}
                                        rowSurface={rowSurface}
                                        topicIcon={iconSpan}
                                        textBlock={textBlock}
                                        bulkSelectMode={bulkSelectMode}
                                        isSelected={bulkSelectedIds.has(
                                          conversation.id
                                        )}
                                        onToggleSelected={() =>
                                          toggleConversationBulkSelect(
                                            conversation.id
                                          )
                                        }
                                        onBulkLongPress={() =>
                                          enterBulkViaLongPress(
                                            conversation.id
                                          )
                                        }
                                        onOpen={() =>
                                          void handleOpenConversation(
                                            conversation.id
                                          )
                                        }
                                        onDelete={() =>
                                          handleDeleteConversation(
                                            conversation.id
                                          )
                                        }
                                      />
                                    );
                                  }
                                )}
                              </SortableContext>
                              <DragOverlay>
                                {activeConvDragId ? (() => {
                                  const dragged = conversations.find(
                                    (c) => c.id === activeConvDragId
                                  );
                                  if (!dragged) return null;
                                  const cfg = getConversationIconConfig(
                                    dragged.title
                                  );
                                  const IconG = cfg.icon;
                                  return (
                                    <ConversationRowDragGhost
                                      title={dragged.title}
                                      topicIcon={
                                        <span
                                          className={`flex shrink-0 items-center justify-center rounded-md ${cfg.activeBg} ${cfg.activeColor}`}
                                          style={{ width: 24, height: 24 }}
                                        >
                                          <IconG className="size-3.5" />
                                        </span>
                                      }
                                    />
                                  );
                                })() : null}
                              </DragOverlay>
                            </DndContext>
                          </>
                        ) : (
                          orderedConversations.map((conversation) => {
                            const { animClass, rowSurface, iconSpan, textBlock } =
                              getConversationRowChrome(conversation);
                            return (
                              <MobileConversationRow
                                key={conversation.id}
                                className={`group ${animClass}`}
                                conversationId={conversation.id}
                                swipeOpenId={swipeOpenConversationId}
                                onSwipeOpenChange={setSwipeOpenConversationId}
                                onOpen={() => {
                                  setSwipeOpenConversationId(null);
                                  void handleOpenConversation(conversation.id);
                                }}
                                onDeletePress={() =>
                                  requestDeleteConversation(conversation.id)
                                }
                                onLongPress={(rect) =>
                                  void openConversationContextMenu(
                                    conversation,
                                    rect
                                  )
                                }
                              >
                                <div
                                  className={`relative flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-lg px-2 py-1.5 text-left transition-colors duration-200 ${rowSurface}`}
                                >
                                  {bulkSelectMode ? (
                                    <label className="flex shrink-0 cursor-pointer items-center">
                                      <input
                                        type="checkbox"
                                        checked={bulkSelectedIds.has(
                                          conversation.id
                                        )}
                                        onChange={() =>
                                          toggleConversationBulkSelect(
                                            conversation.id
                                          )
                                        }
                                        className="sr-only"
                                      />
                                      <span
                                        className={`flex size-4 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-transform duration-150 ease-out ${
                                          bulkSelectedIds.has(conversation.id)
                                            ? "scale-110 border-transparent bg-gradient-to-br from-[#7c3aed] to-[#06b6d4]"
                                            : "scale-100 border-[rgba(255,255,255,0.3)] bg-transparent"
                                        }`}
                                      >
                                        {bulkSelectedIds.has(
                                          conversation.id
                                        ) ? (
                                          <svg
                                            className="size-2.5 text-white"
                                            viewBox="0 0 12 12"
                                            fill="none"
                                            aria-hidden
                                          >
                                            <path
                                              d="M2.5 6L5 8.5L9.5 3.5"
                                              stroke="currentColor"
                                              strokeWidth="1.75"
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                            />
                                          </svg>
                                        ) : null}
                                      </span>
                                    </label>
                                  ) : (
                                    iconSpan
                                  )}
                                  {textBlock}
                                </div>
                              </MobileConversationRow>
                            );
                          })
                        )}
                      </>
                    )
                  )}
                </div>

                <AnimatePresence>
                  {bulkSelectedIds.size > 0 && (
                    <motion.div
                      key="bulk-bar"
                      initial={{ y: 24, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      exit={{ y: 24, opacity: 0 }}
                      transition={{
                        type: "spring",
                        stiffness: 420,
                        damping: 32,
                      }}
                      className="relative z-[55] mt-2 shrink-0 rounded-b-xl border border-t border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.15)] px-4 py-3 text-xs text-foreground backdrop-blur-[12px] [-webkit-backdrop-filter:blur(12px)] pointer-events-auto sticky bottom-0"
                    >
                      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                        <span>
                          {bulkSelectedIds.size} selected
                        </span>
                        <button
                          type="button"
                          className="text-[10px] font-medium text-violet-300/90 hover:text-violet-200 transition-colors"
                          onClick={selectAllVisibleConversations}
                        >
                          Select all
                        </button>
                      </div>
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          className="inline-flex items-center gap-1 rounded-full border border-red-500/40 px-3 py-1.5 text-[11px] text-red-300 transition-colors hover:bg-red-500/10"
                          onClick={() => setBulkDeleteConfirmOpen(true)}
                        >
                          <Trash2 className="size-3.5" aria-hidden />
                          Delete
                        </button>
                        <div className="relative">
                          <button
                            type="button"
                            className="inline-flex items-center gap-1 rounded-full border border-white/15 px-3 py-1.5 text-[11px] text-foreground/90 transition-colors hover:bg-white/10"
                            onClick={() => void openBulkMoveMenu()}
                          >
                            <FolderOpen className="size-3.5" aria-hidden />
                            Move
                          </button>
                          {bulkMoveOpen && (
                            <div className="absolute bottom-full left-0 z-50 mb-1 max-h-40 min-w-[180px] overflow-y-auto rounded-lg border border-border bg-background py-1 shadow-xl">
                              <button
                                type="button"
                                className="w-full px-3 py-2 text-left text-[11px] text-muted-foreground hover:bg-muted"
                                onClick={() => void runBulkLinkToProject(null)}
                              >
                                None (unlink)
                              </button>
                              {bulkProjects.map((p) => (
                                <button
                                  key={p.id}
                                  type="button"
                                  className="w-full px-3 py-2 text-left text-[11px] hover:bg-muted"
                                  onClick={() =>
                                    void runBulkLinkToProject(p.id)
                                  }
                                >
                                  {p.name}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          className="ml-auto inline-flex size-8 items-center justify-center rounded-full border border-white/15 text-muted-foreground transition-colors hover:bg-white/10 hover:text-foreground"
                          aria-label="Cancel selection"
                          onClick={exitBulkSelect}
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {bulkDeleteConfirmOpen && (
                  <div
                    className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
                    role="dialog"
                    aria-modal
                    aria-labelledby="bulk-delete-title"
                  >
                    <div className="w-full max-w-sm rounded-xl border border-border bg-background p-5 shadow-xl">
                      <h2
                        id="bulk-delete-title"
                        className="text-sm font-semibold text-foreground"
                      >
                        Delete {bulkSelectedIds.size} conversations?
                      </h2>
                      <p className="mt-2 text-xs text-muted-foreground">
                        This cannot be undone after a few seconds.
                      </p>
                      <div className="mt-4 flex justify-end gap-2">
                        <button
                          type="button"
                          className="rounded-full px-4 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted"
                          onClick={() => setBulkDeleteConfirmOpen(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="rounded-full bg-red-600 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-red-500"
                          onClick={executeBulkDeleteAfterConfirm}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="mt-2 border-t border-border/60 pt-3 text-[10px] text-muted-foreground">
                  Prism v0.1.0 beta
                </div>
            </div>
          </div>
          {!isMobile && !isSidebarCollapsed && (
            <div
              className="group/sz pointer-events-auto absolute right-0 top-0 z-30 h-full w-1 cursor-col-resize"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizingSidebar(true);
              }}
            >
              {showSidebarResizeHint && !sidebarResizeDoneRef.current && (
                <div className="pointer-events-none absolute right-1 top-1/2 z-[46] w-max -translate-y-1/2 translate-x-1 rounded-md border border-[rgba(139,92,246,0.35)] bg-zinc-950/95 px-2 py-1 text-[10px] text-white/80 opacity-0 shadow-lg transition-opacity duration-150 group-hover/sz:opacity-100">
                  Drag to resize
                </div>
              )}
              <div
                className={`absolute right-0 top-0 h-full w-px transition-[opacity,background-color] duration-150 ${
                  isResizingSidebar
                    ? "bg-[rgba(139,92,246,0.85)]"
                    : "bg-[rgba(139,92,246,0)] group-hover/sz:bg-[rgba(139,92,246,0.4)]"
                }`}
              />
            </div>
          )}
        </aside>

        {isMobile && !isSidebarCollapsed && (
          <div
            className="fixed inset-0 z-[39] bg-black/50 backdrop-blur-sm md:hidden cursor-pointer"
            onClick={() => {
              setIsSidebarCollapsed(true);
              setIsSidebarContentVisible(false);
              try {
                window.localStorage.setItem("prism_sidebar_collapsed", "1");
              } catch {
                /* ignore */
              }
            }}
            onTouchStart={(e) => {
              const t = e.touches[0];
              touchStartXRef.current = t.clientX;
              touchStartYRef.current = t.clientY;
            }}
            onTouchEnd={(e) => {
              if (!isMobile) return;
              const t = e.changedTouches[0];
              const deltaX = t.clientX - touchStartXRef.current;
              const deltaY = t.clientY - touchStartYRef.current;
              if (Math.abs(deltaY) > 75) return;
              if (deltaX < -50) {
                setIsSidebarCollapsed(true);
                try {
                  window.localStorage.setItem("prism_sidebar_collapsed", "1");
                } catch {
                  /* ignore */
                }
                setIsSidebarContentVisible(false);
              }
            }}
            aria-hidden
          />
        )}

        {/*
          Main content area — the ONLY element that receives warp animation.
          Using margin-left (not translate-x) for sidebar offset so that no
          stacking context is created that would misplace the fixed sidebar/input.
        */}
        <div
          onTouchStart={(e) => {
            if (!isMobile) return;
            const t = e.touches[0];
            touchStartXRef.current = t.clientX;
            touchStartYRef.current = t.clientY;
          }}
          onTouchEnd={(e) => {
            if (!isMobile) return;
            const t = e.changedTouches[0];
            const deltaX = t.clientX - touchStartXRef.current;
            const deltaY = t.clientY - touchStartYRef.current;
            if (Math.abs(deltaY) > 75) return;
            if (deltaX > 50 && touchStartXRef.current < 30) {
              setIsSidebarCollapsed(false);
              setIsSidebarContentVisible(true);
              try {
                window.localStorage.setItem("prism_sidebar_collapsed", "0");
              } catch {
                /* ignore */
              }
            }
            if (deltaX < -50 && !isSidebarCollapsed) {
              setIsSidebarCollapsed(true);
              try {
                window.localStorage.setItem("prism_sidebar_collapsed", "1");
              } catch {
                /* ignore */
              }
              setIsSidebarContentVisible(false);
            }
          }}
          style={
            !isMobile
              ? {
                  marginLeft: isSidebarCollapsed ? 48 : sidebarWidth,
                  transition: isResizingSidebar
                    ? "none"
                    : "margin-left 0.25s cubic-bezier(0.16,1,0.3,1)",
                }
              : undefined
          }
          className={`flex min-h-screen flex-col ${
            isMobile ? "ml-0" : ""
          } ${chatWarpClass} ${isChatShaking ? "prism-warp-chat-shake" : ""}`}
        >
          <header className="flex items-center justify-between border-b border-b-[#e0ddff] bg-white px-6 py-3 shadow-sm dark:border-b-[#1f2937] dark:bg-[#0d0b1a] transition-colors duration-200">
            <div className="hidden w-32 md:flex md:items-center" aria-hidden />
            <ModelToggle
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />
            <div className="flex w-32 items-center justify-end gap-2">
              {/* Profile avatar + dropdown */}
              <div ref={profileDropdownRef} className="relative">
                <button
                  type="button"
                  onClick={() => setIsProfileOpen((v) => !v)}
                  aria-label="User menu"
                  aria-expanded={isProfileOpen}
                  className="inline-flex h-7 w-7 cursor-pointer items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] text-xs font-medium text-white shadow-sm transition-transform duration-150 hover:scale-105"
                >
                  {user?.email?.[0]?.toUpperCase() ?? "U"}
                </button>

                {/* Dropdown */}
                {isProfileOpen && (
                  <div className="absolute right-0 top-full z-50 mt-2 w-[220px] origin-top-right rounded-xl border bg-background/95 shadow-xl backdrop-blur-sm animate-[spring-in_180ms_cubic-bezier(0.16,1,0.3,1)_forwards]">
                    {/* User info */}
                    <div className="px-4 py-3">
                      <p className="truncate text-[13px] font-semibold text-foreground">
                        {user?.email ?? "Signed in"}
                      </p>
                      {user?.email && (
                        <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                          {user.email}
                        </p>
                      )}
                    </div>
                    <div className="mx-3 border-t border-border/60" />

                    {/* Navigation items */}
                    <div className="p-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          router.push("/profile");
                        }}
                        className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] text-foreground transition-colors hover:bg-muted"
                      >
                        <UserCircle className="size-4 shrink-0 text-muted-foreground" />
                        Profile Settings
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          setIsShortcutsOpen(true);
                        }}
                        className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] text-foreground transition-colors hover:bg-muted"
                      >
                        <Keyboard className="size-4 shrink-0 text-muted-foreground" />
                        Keyboard Shortcuts
                      </button>
                    </div>

                    <div className="mx-3 border-t border-border/60" />

                    {/* Sign out */}
                    <div className="p-1.5">
                      <button
                        type="button"
                        onClick={async () => {
                          setIsProfileOpen(false);
                          try {
                            sessionStorage.removeItem("prism_app_loaded");
                            sessionStorage.removeItem("prism_bulk_embedded");
                            sessionStorage.removeItem("prism_user_id");
                          } catch {
                            /* sessionStorage unavailable */
                          }
                          await supabase.auth.signOut();
                          router.push("/landing");
                        }}
                        className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2 text-[12px] text-red-500 transition-colors hover:bg-red-500/10"
                      >
                        <LogOut className="size-4 shrink-0" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Theme toggle */}
              <button
                type="button"
                aria-label="Toggle theme"
                onClick={() =>
                  setTheme(currentTheme === "dark" ? "light" : "dark")
                }
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-xs text-foreground shadow-sm transition-colors hover:bg-muted"
              >
                <span
                  className={`relative inline-flex h-4 w-4 items-center justify-center ${
                    isThemeRotating ? "prism-theme-rotate" : ""
                  }`}
                >
                  <Sun
                    className={`absolute size-4 text-foreground/80 transition-all duration-400 ${
                      isThemeMounted && isDarkTheme ? "opacity-0" : "opacity-100"
                    }`}
                  />
                  <Moon
                    className={`absolute size-4 text-foreground/80 transition-all duration-400 ${
                      isThemeMounted && isDarkTheme ? "opacity-100" : "opacity-0"
                    }`}
                  />
                </span>
              </button>
            </div>
          </header>

          <main className="flex min-h-0 flex-1 flex-col">
            {/* Project context banner — shown when a project is linked */}
            {activeProject && (
              <div
                className="flex items-center gap-2 border-b border-border px-4 py-2 text-[12px] text-muted-foreground"
                style={{ borderLeftWidth: "3px", borderLeftColor: activeProject.color, background: `${activeProject.color}08` }}
              >
                <FolderOpen size={13} style={{ color: activeProject.color }} />
                <span className="font-medium" style={{ color: activeProject.color }}>{activeProject.name}</span>
                <span className="text-muted-foreground/60">· Project context active</span>
                <button
                  onClick={async () => {
                    if (activeConversationId) {
                      try { await linkConversationToProject(activeConversationId, null); } catch { /* ignore */ }
                    }
                    setActiveProject(null);
                  }}
                  className="ml-auto flex cursor-pointer items-center justify-center rounded text-muted-foreground/40 hover:text-muted-foreground"
                >
                  <X size={12} />
                </button>
              </div>
            )}

            {isAgentMode && (
              <AgentProgress
                steps={agentSteps}
                currentStep={agentCurrentStep}
                completedSteps={agentCompletedSteps}
                isComplete={agentComplete}
              />
            )}
            <ChatWindow
              messages={messages}
              modelsById={modelsById}
              isLoading={isLoading}
              conversationId={activeConversationId}
              scrollToBottomSignal={chatScrollSignal}
              onRegenerate={handleRegenerate}
              onEditMessage={handleEditMessage}
              onQuoteReply={handleQuoteReply}
              onSuggestionClick={(text) => {
                setInputValue(text);
                handleSend(text);
              }}
            />
          </main>
        </div>

        {/*
          ChatInput is fixed but lives in the stable root (no ancestor transform),
          so it always anchors to the viewport correctly. Outer shell stays transparent
          so the composer reads as floating; ChatInput uses pointer-events-auto.
        */}
        <div
          className={`pointer-events-none fixed inset-x-0 z-[55] bg-transparent px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] ${
            keyboardOpen
              ? "bottom-0"
              : "bottom-0 max-md:bottom-[calc(4rem+env(safe-area-inset-bottom))]"
          }`}
        >
          <ChatInput
            onSend={handleSend}
            isLoading={isLoading}
            lastSentMessage={lastSentMessage}
            value={inputValue}
            onChangeValue={setInputValue}
            inputRef={inputRef}
            currentModel={selectedModel}
            modelsById={modelsById}
            activeProject={activeProject}
            onActiveProjectChange={async (project) => {
              setActiveProject(project);
              if (activeConversationId) {
                try {
                  await linkConversationToProject(activeConversationId, project?.id ?? null);
                  if (project) {
                    pushToast(`Linked to "${project.name}"`, "success");
                    /* Refresh project details to keep file count accurate. */
                    getProject(project.id).then(setActiveProject).catch(() => {});
                  }
                } catch {
                  pushToast("Failed to link project", "error");
                }
              }
            }}
            onSelectSuggestion={(convId) => {
              const conv = conversations.find((c) => c.id === convId);
              if (conv) {
                void openConversationById(convId, conv);
              } else {
                void openConversationById(convId);
              }
              setInputValue("");
            }}
          />
        </div>
        </motion.div>
      </div>

      <ConversationContextMenu
        open={contextMenu !== null}
        conversation={contextMenu?.conversation ?? null}
        anchor={contextMenu?.anchor ?? null}
        projects={contextMenuProjects}
        isPinned={
          contextMenu
            ? pinnedConversationIds.includes(contextMenu.conversation.id)
            : false
        }
        onClose={() => setContextMenu(null)}
        onPin={() => {
          if (!contextMenu) return;
          const id = contextMenu.conversation.id;
          setPinnedConversationIds((prev) => {
            const next = prev.includes(id)
              ? prev.filter((x) => x !== id)
              : [id, ...prev];
            try {
              window.localStorage.setItem(
                "prism_pinned_conversations",
                JSON.stringify(next)
              );
            } catch {
              /* ignore */
            }
            return next;
          });
          setContextMenu(null);
        }}
        onRename={async () => {
          if (!contextMenu) return;
          const c = contextMenu.conversation;
          const next = window.prompt("Rename conversation", c.title);
          setContextMenu(null);
          if (!next?.trim()) return;
          try {
            await updateConversationTitle(c.id, next.trim());
            await refreshConversations();
          } catch {
            pushToast("Could not rename conversation", "error");
          }
        }}
        onExport={async () => {
          if (!contextMenu) return;
          const c = contextMenu.conversation;
          setContextMenu(null);
          try {
            const msgs = await getConversationMessages(c.id);
            const blob = new Blob(
              [JSON.stringify({ conversation: c, messages: msgs }, null, 2)],
              { type: "application/json" }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `prism-chat-${c.id.slice(0, 8)}.json`;
            a.click();
            URL.revokeObjectURL(url);
          } catch {
            pushToast("Export failed", "error");
          }
        }}
        onLinkProject={async (projectId) => {
          if (!contextMenu) return;
          const id = contextMenu.conversation.id;
          setContextMenu(null);
          try {
            await linkConversationToProject(id, projectId);
            await refreshConversations();
            if (activeConversationId === id) {
              if (projectId) {
                try {
                  const proj = await getProject(projectId);
                  setActiveProject(proj);
                } catch {
                  setActiveProject(null);
                }
              } else {
                setActiveProject(null);
              }
            }
            pushToast(
              projectId ? "Linked to project" : "Unlinked from project",
              "success"
            );
          } catch {
            pushToast("Could not update project link", "error");
          }
        }}
        onDelete={() => {
          if (!contextMenu) return;
          const id = contextMenu.conversation.id;
          setContextMenu(null);
          requestDeleteConversation(id);
        }}
      />

      {showInstallBanner && installPrompt && !keyboardOpen && (
        <div
          className="fixed inset-x-0 z-[52] mx-3 hidden max-md:block rounded-xl border border-white/10 bg-zinc-950/95 p-3 shadow-xl backdrop-blur-xl"
          style={{
            bottom:
              "calc(4rem + env(safe-area-inset-bottom, 0px) + 12px)",
          }}
        >
          <p className="text-sm font-semibold text-white">
            Add Prism to Home Screen
          </p>
          <p className="mt-1 text-xs text-white/60">
            Quick access, works offline
          </p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="flex-1 rounded-lg border border-white/15 py-2 text-xs font-medium text-white/80 transition-colors hover:bg-white/5"
              onClick={dismissInstallBanner}
            >
              Not now
            </button>
            <button
              type="button"
              className="flex-1 rounded-lg bg-gradient-to-r from-[#7c3aed] to-[#2563eb] py-2 text-xs font-medium text-white shadow-sm transition-opacity hover:opacity-95"
              onClick={() => void handleInstallClick()}
            >
              Install
            </button>
          </div>
        </div>
      )}

      <ToastContainer />

      {/* Keyboard shortcuts modal */}
      {isShortcutsOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          onClick={() => setIsShortcutsOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border bg-background p-6 shadow-2xl animate-[spring-in_180ms_cubic-bezier(0.16,1,0.3,1)_forwards]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold">
                <Keyboard className="size-4 text-muted-foreground" />
                Keyboard Shortcuts
              </h2>
              <button
                type="button"
                onClick={() => setIsShortcutsOpen(false)}
                className="inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <div className="space-y-2 text-[12px]">
              {[
                ["Send message", "Enter"],
                ["New line", "Shift + Enter"],
                ["New conversation", "Ctrl + K"],
                ["Toggle sidebar", "Ctrl + B"],
                ["History navigation", "↑ / ↓"],
              ].map(([label, keys]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <kbd className="rounded-md border bg-muted px-2 py-0.5 font-mono text-[11px] text-foreground">
                    {keys}
                  </kbd>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </>
    </ToastProvider>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <HomeContent />
    </Suspense>
  );
}
