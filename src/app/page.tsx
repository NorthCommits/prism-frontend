"use client";

import { useEffect, useRef, useState } from "react";
import {
  BarChart2,
  BookOpen,
  Brain,
  Code2,
  Cpu,
  FileText,
  Globe,
  Image,
  Keyboard,
  Lightbulb,
  LogOut,
  Menu,
  MessageCircle,
  Moon,
  PanelLeftClose,
  PenLine,
  Plus,
  Search,
  Sparkles,
  Sun,
  Terminal,
  Trash2,
  UserCircle,
  Wand2,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

import {
  AvailableModel,
  ChatMessage,
  HistoryMessage,
  ModelId,
  fetchModels,
  sendMessageStream,
} from "../lib/api";
import { saveProfile } from "@/lib/profile";
import { AgentProgress } from "@/components/AgentProgress";
import { ChatInput } from "@/components/ChatInput";
import { ChatWindow } from "@/components/ChatWindow";
import { ModelToggle } from "@/components/ModelToggle";
import { SplashScreen } from "@/components/SplashScreen";
import { ToastContainer, ToastProvider, pushToast } from "@/components/Toast";
import {
  Conversation,
  deleteConversation,
  getConversations,
  getConversationMessages,
  createConversation,
  saveMessage,
} from "@/lib/history";
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

export default function Home() {
  type UserLike = { id?: string; email?: string | null };
  const [messages, setMessages] = useState<ChatMessage[]>([]);
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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSidebarContentVisible, setIsSidebarContentVisible] = useState(true);
  const [user, setUser] = useState<UserLike | null>(null);
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
  const supabase = createClient();
  const touchStartXRef = useRef<number | null>(null);

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
        router.push("/login");
        return;
      }
      setUser(session.user as UserLike);
    };
    initAuth();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        setUser(null);
        router.push("/login");
      } else {
        setUser(session.user as UserLike);

        // After email verification the user lands here for the first time.
        // If signup stored a pending profile name, save it now and clear it.
        if (event === "SIGNED_IN") {
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
    let isCancelled = false;
    const loadConversations = async () => {
      try {
        setIsConversationsLoading(true);
        const items = await getConversations();
        if (isCancelled) return;
        setConversations(items);
      } catch {
        if (isCancelled) return;
        setConversations([]);
      } finally {
        if (!isCancelled) {
          setIsConversationsLoading(false);
        }
      }
    };
    loadConversations();
    return () => {
      isCancelled = true;
    };
  }, []);

  const refreshConversations = async () => {
    try {
      const items = await getConversations();
      setConversations(items);
    } catch {
      // Ignore refresh failures; existing state remains.
    }
  };

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
    setActiveConversationId(id);
    try {
      const items = await getConversationMessages(id);
      const mapped: ChatMessage[] = items.map((message) => ({
        role: message.role,
        content: message.content,
        model_id: message.model_id as ModelId | undefined,
        routed_to: message.routed_to as ModelId | undefined,
        routing_reason: message.routing_reason ?? undefined,
        search_used: message.search_used,
        search_query: message.search_query,
      }));
      setMessages(mapped);
    } catch {
      setMessages([]);
    }
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

  const handleSend = async (
    message: string,
    file?: { file_name: string; file_type: string; file_content: string },
    image?: { base64: string; mediaType: string },
    template?: { id: string; label: string }
  ) => {
    if (!selectedModel) {
      return;
    }

    // Reset agent progress from any previous turn.
    setIsAgentMode(false);
    setAgentSteps([]);
    setAgentCurrentStep(0);
    setAgentCompletedSteps([]);
    setAgentComplete(false);

    setLastSentMessage(message);

    const userMessage: ChatMessage = {
      role: "user",
      content: message,
      file_used: !!file,
      file_name: file?.file_name,
      file_type: file?.file_type,
      file_content: file?.file_content,
      // Stored in message state for inline display; excluded from history.
      image_base64: image?.base64,
      image_media_type: image?.mediaType,
      image_used: !!image,
    };

    let conversationId = activeConversationId;

    if (!conversationId) {
      try {
        const title = message.trim() || "New conversation";
        const conversation = await createConversation(
          title.length > 35 ? title.slice(0, 35).trimEnd() : title,
          selectedModel
        );
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

    const userMessages = [...messages, userMessage];
    setMessages(userMessages);
    setIsLoading(true);

    try {
      await saveMessage({
        conversation_id: conversationId!,
        role: "user",
        content: message,
        model_id: selectedModel,
        file_used: !!file,
        file_name: file?.file_name,
      });
    } catch {
      // Ignore message save failure for user message.
    }

    // Include model_id so the backend context-compression layer can annotate
    // model-switch boundaries (e.g. coding → writing) between turns.
    const history: HistoryMessage[] = messages.map((item) => ({
      role: item.role,
      content: String(item.content),
      model_id: item.model_id || item.routed_to || undefined,
    }));

    // Create a placeholder assistant message and stream the response into it.
    const assistantPlaceholder: ChatMessage = {
      role: "assistant",
      content: "",
      model_id: selectedModel,
      isStreaming: true,
      // Store the pre-formatted label so ChatWindow can render the badge without
      // waiting for the backend to echo the template id back.
      active_template_label: template?.label,
    };

    const initialMessages = [...userMessages, assistantPlaceholder];
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
          setMessages((prev) =>
            prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, content: m.content + token } : m
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
              }

              return next;
            })
          );
        },
        () => {
          setIsLoading(false);

          setMessages((prev) =>
            prev.map((m, i) =>
              i === prev.length - 1 ? { ...m, isStreaming: false } : m
            )
          );

          void (async () => {
            if (!conversationId) return;
            try {
              await saveMessage({
                conversation_id: conversationId!,
                role: "assistant",
                content: assistantContent,
                model_id: selectedModel,
                routed_to: latestMetadata?.routed_to,
                routing_reason: latestMetadata?.routing_reason,
                search_used: latestMetadata?.search_used,
                search_query: latestMetadata?.search_query,
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
                ? { ...m, content: error, isStreaming: false }
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
            ? { ...m, content: "Something went wrong, please try again.", isStreaming: false }
            : m
        )
      );
    }
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

  // Warp class for the chat content area (not the sidebar or input).
  // Only applies while the splash is transitioning; once showSplash is false
  // no animation classes are set so the element stays naturally visible.
  const chatWarpClass = !showSplash
    ? ""
    : isChatWarpingIn
    ? "prism-warp-chat-in"
    : "prism-warp-chat-pre";

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

      {/*
        Stable layout root — never has a transform applied, so all
        position:fixed children (sidebar, input bar) anchor correctly to
        the viewport regardless of what animation is running on the content.
      */}
      <div suppressHydrationWarning className="min-h-screen bg-background text-foreground transition-colors duration-200">
        {/* Fixed sidebar — lives in the stable root so position:fixed anchors
            to the viewport and is never affected by the warp animation. */}
        <aside
          className={`fixed left-0 top-0 z-40 h-screen border-r border-border bg-[#f5f3ff] px-4 py-4 dark:bg-[#0d0b1a] overflow-hidden ${
            isMobile
              ? `w-64 transform transition-transform duration-[300ms] ease-out ${
                  isSidebarCollapsed ? "-translate-x-full" : "translate-x-0"
                }`
              : `w-[260px] transition-[max-width] duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
                  isSidebarCollapsed ? "max-w-0" : "max-w-[260px]"
                }`
          }`}
        >
          <div className="flex h-full flex-col">
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
                  className="mb-4 relative overflow-hidden inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#2563eb] px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:brightness-110 hover:shadow-[0_0_25px_rgba(124,58,237,0.25)] before:absolute before:inset-0 before:-translate-x-full before:bg-gradient-to-r before:from-transparent before:via-white/25 before:to-transparent before:transition-transform before:duration-700 hover:before:translate-x-full"
                >
                  <Plus className="size-4" />
                  <span>New Chat</span>
                </button>

                <div className="mb-2 px-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50">
                  Recent
                </div>

                <div className="sidebar-scroll flex-1 overflow-y-auto pb-2 text-xs">
                  {isConversationsLoading ? (
                    <div className="space-y-2 px-2 text-[11px] text-muted-foreground">
                      <div className="h-4 w-full animate-pulse rounded bg-muted/60" />
                      <div className="h-4 w-10/12 animate-pulse rounded bg-muted/60" />
                      <div className="h-4 w-8/12 animate-pulse rounded bg-muted/60" />
                    </div>
                  ) : conversations.length === 0 ? (
                    <p className="px-2 text-xs text-muted-foreground">
                      No conversations yet
                    </p>
                  ) : (
                    conversations.map((conversation) => {
                      const isActive = conversation.id === activeConversationId;
                      return (
                        <div
                          key={conversation.id}
                          className={`group relative flex items-center gap-2 rounded-lg px-2 py-1.5 text-left cursor-pointer transition-colors duration-200 overflow-hidden ${
                            isActive
                              ? "bg-[#e9ddff] dark:bg-[#2a1f44] pl-[11px] before:absolute before:left-0 before:top-0 before:bottom-0 before:w-[3px] before:bg-gradient-to-b before:from-[#7c3aed] before:to-[#06b6d4]"
                              : "bg-transparent after:content-[''] after:absolute after:inset-0 after:-z-10 after:bg-[#ede9fe] dark:after:bg-[#1f1633] after:-translate-x-full group-hover:after:translate-x-0 after:transition-transform after:duration-200"
                          } ${conversation.id === newConversationId ? "prism-conv-enter" : ""} ${
                            deletingConversationId === conversation.id
                              ? deletingConversationStage === "out"
                                ? "prism-conv-delete-out"
                                : "prism-conv-delete-collapse"
                              : ""
                          } ${isActive ? "prism-conv-active" : ""}`}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenConversation(conversation.id)}
                            className="flex min-w-0 flex-1 items-center gap-2"
                          >
                            {/* Dynamic icon whose colour reflects the topic of the conversation */}
                            {(() => {
                              const cfg = getConversationIconConfig(conversation.title);
                              const IconEl = cfg.icon;
                              return (
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
                            })()}
                            <div className="min-w-0 text-left">
                              <p className="line-clamp-1 text-foreground/90">
                                {conversation.title}
                              </p>
                              <p className="text-[10px] text-muted-foreground">
                                {formatRelativeTime(conversation.updated_at)}
                              </p>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleDeleteConversation(conversation.id);
                            }}
                            className="opacity-0 transition-opacity group-hover:opacity-100"
                            aria-label="Delete conversation"
                          >
                            <Trash2 className="size-3.5 text-muted-foreground hover:text-foreground" />
                          </button>
                        </div>
                      );
                    })
                  )}
                </div>

                <div className="mt-2 border-t border-border/60 pt-3 text-[10px] text-muted-foreground">
                  Prism v0.1.0 beta
                </div>
            </div>
          </div>
        </aside>

        {isMobile && !isSidebarCollapsed && (
          <div
            className="fixed inset-0 z-[39] bg-black/50 backdrop-blur-sm md:hidden cursor-pointer"
            onClick={() => setIsSidebarCollapsed(true)}
            onTouchStart={(e) => {
              touchStartXRef.current = e.touches?.[0]?.clientX ?? null;
            }}
            onTouchEnd={(e) => {
              const startX = touchStartXRef.current;
              const endX = e.changedTouches?.[0]?.clientX ?? null;
              touchStartXRef.current = null;
              if (!isMobile) return;
              if (startX === null || endX === null) return;
              // Swipe left closes the sidebar.
              if (startX - endX > 50) {
                setIsSidebarCollapsed(true);
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
            touchStartXRef.current = e.touches?.[0]?.clientX ?? null;
          }}
          onTouchEnd={(e) => {
            if (!isMobile) return;
            const startX = touchStartXRef.current;
            const endX = e.changedTouches?.[0]?.clientX ?? null;
            touchStartXRef.current = null;
            if (startX === null || endX === null) return;
            if (startX < 50 && endX - startX > 50) {
              setIsSidebarCollapsed(false);
            }
          }}
          className={`flex min-h-screen flex-col transition-[margin-left] duration-[250ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
            isMobile
              ? "ml-0"
              : isSidebarCollapsed
              ? "md:ml-12"
              : "md:ml-[260px]"
          } ${chatWarpClass} ${isChatShaking ? "prism-warp-chat-shake" : ""}`}
        >
          <header className="flex items-center justify-between border-b border-b-[#e0ddff] bg-white px-6 py-3 shadow-sm dark:border-b-[#1f2937] dark:bg-[#0d0b1a] transition-colors duration-200">
            <div className="flex w-32 items-center">
              <button
                type="button"
                className="md:hidden inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-xs text-foreground shadow-sm transition-colors hover:bg-muted"
                aria-label="Open sidebar"
                onClick={() => setIsSidebarCollapsed(false)}
              >
                <Menu className="size-4" />
              </button>
            </div>
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
                          await supabase.auth.signOut();
                          router.push("/login");
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
          so it always anchors to the viewport correctly.
        */}
        <div className="fixed inset-x-0 bottom-0 z-30">
          <ChatInput
            onSend={handleSend}
            isLoading={isLoading}
            lastSentMessage={lastSentMessage}
            value={inputValue}
            onChangeValue={setInputValue}
            inputRef={inputRef}
            currentModel={selectedModel}
            modelsById={modelsById}
          />
        </div>
      </div>
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

