"use client";

import { useEffect, useRef, useState } from "react";
import {
  MessageSquare,
  Plus,
  Circle,
  Trash2,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
} from "lucide-react";
import { useTheme } from "next-themes";
import { useRouter } from "next/navigation";

import {
  AvailableModel,
  ChatMessage,
  HistoryMessage,
  ModelId,
  fetchModels,
  sendMessage,
} from "../lib/api";
import { ChatInput } from "@/components/ChatInput";
import { ChatWindow } from "@/components/ChatWindow";
import { ModelToggle } from "@/components/ModelToggle";
import { SplashScreen } from "@/components/SplashScreen";
import {
  Conversation,
  deleteConversation,
  getConversations,
  getConversationMessages,
  createConversation,
  saveMessage,
} from "@/lib/history";
import { createClient } from "@/lib/supabase";

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
  const [user, setUser] = useState<any | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const { theme, setTheme, resolvedTheme } = useTheme();
  const router = useRouter();
  const supabase = createClient();

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
      setUser(session.user);
    };
    initAuth();

    const {
      data: authListener,
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        setUser(null);
        router.push("/login");
      } else {
        setUser(session.user);
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
      const stored = window.localStorage.getItem("prism_sidebar_collapsed");
      if (stored !== null) {
        setIsSidebarCollapsed(stored === "1");
      } else if (window.innerWidth < 768) {
        setIsSidebarCollapsed(true);
      }
    } catch {
      // Ignore storage errors.
    }
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem("prism_sidebar_collapsed", next ? "1" : "0");
      } catch {
        // Ignore storage errors.
      }
      return next;
    });
  };

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
  };

  const handleOpenConversation = async (id: string) => {
    setActiveConversationId(id);
    try {
      const items = await getConversationMessages(id);
      const mapped: ChatMessage[] = items.map((message) => ({
        role: message.role,
        content: message.content as any,
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
    try {
      await deleteConversation(id);
      await refreshConversations();
    } catch {
      // Ignore delete failures for now.
    }
    if (activeConversationId === id) {
      setActiveConversationId(null);
      setMessages([]);
    }
  };

  const handleSend = async (
    message: string,
    file?: { file_name: string; file_type: string; file_content: string }
  ) => {
    if (!selectedModel) {
      return;
    }

    const userMessage: ChatMessage = {
      role: "user",
      // Casting for compatibility with the existing API message shape.
      content: message as any,
      file_used: !!file,
      file_name: file?.file_name,
      file_type: file?.file_type,
      file_content: file?.file_content,
    } as ChatMessage;

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

    try {
      const history: HistoryMessage[] = messages.map((item) => ({
        role: item.role,
        content: String(item.content),
      }));

      const response = await sendMessage(
        message,
        selectedModel,
        file?.file_name,
        file?.file_type,
        file?.file_content,
        history
      );
      const assistantMessage: ChatMessage = {
        role: "assistant",
        content: response.reply,
        model_id: selectedModel,
        routed_to: (response.routed_to as ModelId | undefined) ?? undefined,
        routing_reason: response.routing_reason,
        search_used: response.search_used,
        search_query: response.search_query,
        response_type: response.response_type,
        plot_json: response.plot_json,
        image_url: response.image_url,
      };
      const fullMessages = [...userMessages, assistantMessage];
      setMessages(fullMessages);
      try {
        await saveMessage({
          conversation_id: conversationId!,
          role: "assistant",
          content: response.reply,
          model_id: selectedModel,
          routed_to: response.routed_to,
          routing_reason: response.routing_reason,
          search_used: response.search_used,
          search_query: response.search_query,
        });
        await refreshConversations();
      } catch {
        // Ignore assistant save failure.
      }
    } catch {
      const errorMessage: ChatMessage = {
        role: "assistant",
        content: "Something went wrong, please try again." as any,
      } as ChatMessage;
      const fullMessages = [...userMessages, errorMessage];
      setMessages(fullMessages);
      try {
        await saveMessage({
          conversation_id: conversationId!,
          role: "assistant",
          content: errorMessage.content as any,
          model_id: selectedModel,
        });
        await refreshConversations();
      } catch {
        // Ignore assistant error save failure.
      }
    } finally {
      setIsLoading(false);
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

  return (
    <>
      <SplashScreen onEnter={handleSplashEnter} />
      <div className="min-h-screen bg-background text-foreground transition-colors duration-200">
        {/* Fixed sidebar */}
        <aside
          className={`fixed left-0 top-0 z-40 h-screen border-r border-border bg-[#f5f3ff] px-4 py-4 dark:bg-[#0d0b1a] transition-all duration-200 ${
            isSidebarCollapsed ? "w-0 md:w-12" : "w-64"
          }`}
        >
          <div className="flex h-full flex-col">
            <div className="mb-3 flex items-center justify-between gap-2">
              {!isSidebarCollapsed && (
                <div className="flex items-center gap-2 overflow-hidden">
                  <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-sky-500 via-violet-500 to-emerald-400 text-xs font-semibold text-white shadow-sm">
                    P
                  </div>
                  <span className="truncate text-sm font-semibold tracking-tight">
                    Prism
                  </span>
                </div>
              )}
              <button
                type="button"
                onClick={toggleSidebar}
                className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-xs text-foreground shadow-sm transition-colors hover:bg-muted"
                aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
              >
                {isSidebarCollapsed ? (
                  <PanelLeftOpen className="size-4" />
                ) : (
                  <PanelLeftClose className="size-4" />
                )}
              </button>
            </div>

            {!isSidebarCollapsed && (
              <>
                <button
                  type="button"
                  onClick={handleCreateConversation}
                  className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#2563eb] px-3 py-2 text-xs font-medium text-white shadow-sm transition-colors hover:brightness-110"
                >
                  <Plus className="size-4" />
                  <span>New Chat</span>
                </button>

                <div className="mb-2 px-3 text-[10px] font-medium uppercase tracking-widest text-muted-foreground/50">
                  Recent
                </div>

                <div className="flex-1 overflow-y-auto pb-2 text-xs">
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
                          className={`group flex items-center gap-2 rounded-lg px-2 py-1.5 text-left transition-colors ${
                            isActive
                              ? "bg-[#e9ddff] dark:bg-[#2a1f44]"
                              : "hover:bg-[#ede9fe] dark:hover:bg-[#1f1633]"
                          }`}
                        >
                          <button
                            type="button"
                            onClick={() => handleOpenConversation(conversation.id)}
                            className="flex min-w-0 flex-1 items-center gap-2"
                          >
                            <MessageSquare className="size-3.5 text-muted-foreground" />
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

                <div className="mt-2 space-y-1 border-t border-border/60 pt-3 text-[11px] text-muted-foreground">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gradient-to-br from-[#7c3aed] to-[#06b6d4] text-[11px] font-semibold text-white">
                        {user?.email?.[0]?.toUpperCase() ?? "U"}
                      </div>
                      <span className="max-w-[120px] truncate">
                        {user?.email ?? "Signed in"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-border text-muted-foreground hover:bg-muted"
                      aria-label="Sign out"
                      onClick={async () => {
                        await supabase.auth.signOut();
                        router.push("/login");
                      }}
                    >
                      <LogOut className="size-3.5" />
                    </button>
                  </div>
                  <div className="text-[10px]">Prism v0.1.0 beta</div>
                </div>
              </>
            )}
          </div>
        </aside>

        {/* Main chat area */}
        <div
          className={`flex min-h-screen flex-col transition-all duration-200 ${
            isSidebarCollapsed ? "ml-0 md:ml-12" : "ml-0 md:ml-64"
          }`}
        >
          <header className="flex items-center justify-between border-b border-b-[#e0ddff] bg-white px-6 py-3 shadow-sm dark:border-b-[#1f2937] dark:bg-[#0d0b1a] transition-colors duration-200">
            <div className="w-32" />
            <ModelToggle
              selectedModel={selectedModel}
              onModelChange={setSelectedModel}
            />
            <div className="flex w-32 justify-end">
              <button
                type="button"
                aria-label="Toggle theme"
                onClick={() =>
                  setTheme(
                    (theme === "system" ? resolvedTheme : theme) === "dark"
                      ? "light"
                      : "dark"
                  )
                }
                className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border bg-background text-xs text-foreground shadow-sm transition-colors hover:bg-muted"
              >
                <Circle className="size-3 fill-foreground/80 text-background" />
              </button>
            </div>
          </header>

          <main className="flex min-h-0 flex-1 flex-col">
            <ChatWindow
              messages={messages}
              modelsById={modelsById}
              isLoading={isLoading}
              onQuoteReply={handleQuoteReply}
              onSuggestionClick={(text) => {
                setInputValue(text);
                handleSend(text);
              }}
            />
          </main>

          <div className="fixed inset-x-0 bottom-0 z-30">
            <ChatInput
              onSend={handleSend}
              isLoading={isLoading}
              value={inputValue}
              onChangeValue={setInputValue}
              inputRef={inputRef}
              currentModel={selectedModel}
              modelsById={modelsById}
            />
          </div>
        </div>
      </div>
    </>
  );
}

