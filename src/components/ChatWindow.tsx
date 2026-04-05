"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  ArrowRight,
  ChevronDown,
  Copy,
  Eye,
  Globe,
  Quote,
  Code2,
  PenLine,
  FileSpreadsheet,
  FileCode,
  FileText,
  Zap,
} from "lucide-react";

import type { AvailableModel, ChatMessage, ModelId } from "../lib/api";
import { MessageActionsBar } from "@/components/MessageActionsBar";
import { submitFeedback } from "@/lib/feedback";
import { createClient } from "@/lib/supabase";
import { PlotRenderer } from "@/components/PlotRenderer";
import { ImageRenderer } from "@/components/ImageRenderer";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";
import { AnimatePresence, motion } from "motion/react";
import { useToast } from "@/components/Toast";
import { formatMessageTime } from "@/lib/messageTime";
import { Haptics } from "@/lib/haptics";
import { ResponseActions } from "@/components/ResponseActions";

type ChatWindowProps = {
  messages: ChatMessage[];
  modelsById?: Record<ModelId, AvailableModel>;
  /** When true, shows assistant-style typing dots at the end of the thread. */
  isLoading?: boolean;
  onQuoteReply?: (text: string) => void;
  onSuggestionClick?: (text: string) => void;
  /** Active conversation id passed through to the feedback widget. */
  conversationId?: string | null;
  /** Increment to scroll the thread to the bottom after messages load (e.g. open conversation). */
  scrollToBottomSignal?: number;
  onRegenerate?: (messageIndex: number) => void;
  onEditMessage?: (messageIndex: number, newContent: string) => void;
  onBranch?: (messageIndex: number) => void;
  fontSize?: "small" | "medium" | "large";
  onResponseAction?: (
    actionId: string,
    prompt: string,
    messageIndex: number
  ) => void;
  /** Preferred TTS voice from the user's profile settings. */
  userVoice?: string;
};

// Basic parser to split plain text and fenced code blocks for readable display.
function parseContentSegments(text: string): Array<
  | { type: "text"; value: string }
  | { type: "code"; value: string }
> {
  const parts = text.split("```");
  const segments: Array<
    { type: "text"; value: string } | { type: "code"; value: string }
  > = [];

  parts.forEach((part, index) => {
    if (part.length === 0) {
      return;
    }
    if (index % 2 === 0) {
      segments.push({ type: "text", value: part });
    } else {
      // Drop optional language hint on first line if present.
      const lines = part.split("\n");
      const [, ...rest] = lines;
      segments.push({ type: "code", value: rest.join("\n") || part });
    }
  });

  return segments;
}

function spawnRipple(
  target: HTMLButtonElement,
  clientX: number,
  clientY: number
) {
  const rect = target.getBoundingClientRect();
  const size = Math.max(rect.width, rect.height) * 2;
  const x = clientX - rect.left - size / 2;
  const y = clientY - rect.top - size / 2;

  const ripple = document.createElement("span");
  ripple.className = "prism-ripple";
  ripple.style.width = `${size}px`;
  ripple.style.height = `${size}px`;
  ripple.style.left = `${x}px`;
  ripple.style.top = `${y}px`;

  target.appendChild(ripple);
  window.setTimeout(() => ripple.remove(), 400);
}

const SCROLL_PADDING_BOTTOM = 80;
const USER_SCROLL_UP_DISTANCE = 100;
const AT_BOTTOM_DISTANCE = 50;
const NEAR_BOTTOM_FOLLOW = 150;
const STREAM_BOTTOM_SLACK = 20;

function instantScrollToBottom(container: HTMLElement) {
  container.scrollTop = Math.max(
    0,
    container.scrollHeight - container.clientHeight
  );
}

function smoothScrollToBottom(container: HTMLElement) {
  const maxScroll = Math.max(0, container.scrollHeight - container.clientHeight);
  container.scrollTo({ top: maxScroll, behavior: "smooth" });
}

function instantScrollUserMessageToTop(container: HTMLElement) {
  const nodes = container.querySelectorAll('[data-message][data-role="user"]');
  const lastUser = nodes[nodes.length - 1] as HTMLElement | undefined;
  if (!lastUser) {
    instantScrollToBottom(container);
    return;
  }
  const cRect = container.getBoundingClientRect();
  const mRect = lastUser.getBoundingClientRect();
  const delta = mRect.top - cRect.top - 24;
  container.scrollTop += delta;
}

function scrollToIncludeLastMessageMetadata(container: HTMLElement) {
  const messageEls = container.querySelectorAll("[data-message]");
  const lastMessage = messageEls[messageEls.length - 1] as HTMLElement | undefined;
  if (lastMessage) {
    const messageBottom = lastMessage.getBoundingClientRect().bottom;
    const containerBottom = container.getBoundingClientRect().bottom;
    if (messageBottom > containerBottom - SCROLL_PADDING_BOTTOM) {
      const delta = messageBottom - containerBottom + SCROLL_PADDING_BOTTOM;
      container.scrollTo({
        top: container.scrollTop + delta,
        behavior: "smooth",
      });
    }
  } else {
    smoothScrollToBottom(container);
  }
}


function StreamingAssistantContent(props: {
  content: string;
  isStreaming: boolean;
  conversationId?: string | null;
  fontSize: "small" | "medium" | "large";
}) {
  const { content, isStreaming, conversationId, fontSize } = props;
  const [displayContent, setDisplayContent] = useState(content);
  const [settleReady, setSettleReady] = useState(!isStreaming);
  const rafRef = useRef<number | null>(null);

  const textSizeClass =
    fontSize === "small"
      ? "text-sm leading-6"
      : fontSize === "large"
        ? "text-lg leading-8"
        : "text-base leading-7";

  useEffect(() => {
    if (!isStreaming) {
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      setDisplayContent(content);
      return;
    }

    if (rafRef.current != null) {
      window.cancelAnimationFrame(rafRef.current);
    }
    rafRef.current = window.requestAnimationFrame(() => {
      setDisplayContent(content);
      rafRef.current = null;
    });
  }, [content, isStreaming]);

  useEffect(() => {
    if (isStreaming) {
      setSettleReady(false);
      return;
    }
    const timer = window.setTimeout(() => {
      setSettleReady(true);
    }, 50);
    return () => window.clearTimeout(timer);
  }, [isStreaming]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) {
        window.cancelAnimationFrame(rafRef.current);
      }
    };
  }, []);

  if (isStreaming || !settleReady) {
    return (
      <div className={`chat-message-content ${textSizeClass} whitespace-pre-wrap break-words ${isStreaming ? "font-mono" : ""}`}>
        {displayContent}
        <StreamingCursor
          isStreaming={isStreaming}
          hasText={displayContent.trim().length > 0}
        />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0.8 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.15 }}
    >
      <MarkdownRenderer
        content={content}
        conversationId={conversationId}
        fontSize={fontSize}
      />
    </motion.div>
  );
}

function ThinkingDots() {
  return (
    <div
      className="thinking-dots flex items-center gap-1.5 py-1"
      aria-hidden
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="thinking-dot"
          style={{ animationDelay: `${i * 0.15}s` }}
        />
      ))}
    </div>
  );
}

function StreamingCursor(props: { isStreaming: boolean; hasText: boolean }) {
  const { isStreaming, hasText } = props;
  const [fadeOut, setFadeOut] = useState(false);
  const everStreamedRef = useRef(false);

  useEffect(() => {
    if (isStreaming) {
      everStreamedRef.current = true;
    }
  }, [isStreaming]);

  useEffect(() => {
    if (!isStreaming && everStreamedRef.current && hasText) {
      setFadeOut(true);
      const id = window.setTimeout(() => {
        setFadeOut(false);
        everStreamedRef.current = false;
      }, 320);
      return () => window.clearTimeout(id);
    }
    if (!isStreaming && !hasText) {
      everStreamedRef.current = false;
    }
    return undefined;
  }, [isStreaming, hasText]);

  const visible = (isStreaming && hasText) || fadeOut;
  if (!visible) return null;

  return (
    <span
      className={`streaming-cursor ${fadeOut ? "streaming-cursor--fade-out" : ""}`}
      aria-hidden
    />
  );
}

export function ChatWindow(props: ChatWindowProps) {
  const {
    messages,
    modelsById,
    isLoading = false,
    onQuoteReply,
    onSuggestionClick,
    conversationId,
    scrollToBottomSignal = 0,
    onRegenerate,
    onEditMessage,
    onBranch,
    fontSize = "medium",
    onResponseAction,
    userVoice,
  } = props;
  const { addToast } = useToast();
  const textSizeClass =
    fontSize === "small"
      ? "text-sm leading-6"
      : fontSize === "large"
        ? "text-lg leading-8"
        : "text-base leading-7";
  const codeSizeClass =
    fontSize === "small"
      ? "text-xs"
      : fontSize === "large"
        ? "text-base"
        : "text-sm";
  const messagesContainerRef = useRef<HTMLElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const [streamJumpVisible, setStreamJumpVisible] = useState(false);
  const [completionPulseIndex, setCompletionPulseIndex] = useState<
    number | null
  >(null);
  const isAtBottomRef = useRef(true);
  const isUserScrollingUpRef = useRef(false);
  const lastScrollTopRef = useRef(0);
  const streamScrollRafRef = useRef<number | null>(null);
  const prevMessagesLengthForAppendRef = useRef(0);
  const prevMessageCountRef = useRef(messages.length);
  const prevLastAssistantStreamingRef = useRef(false);
  const prevStreamLenRef = useRef(0);
  const prevThreadMessageCountRef = useRef(0);
  const [hoveredMessageId, setHoveredMessageId] = useState<string | null>(null);
  const hoverLeaveTimerRef = useRef<number | null>(null);
  const longPressTimerRef = useRef<number | null>(null);
  const [feedbackRatingByKey, setFeedbackRatingByKey] = useState<
    Record<string, 1 | -1 | null>
  >({});
  const [feedbackInputKey, setFeedbackInputKey] = useState<string | null>(null);
  const [feedbackDraftByKey, setFeedbackDraftByKey] = useState<
    Record<string, string>
  >({});
  const [editingUserKey, setEditingUserKey] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const editTextareaRef = useRef<HTMLTextAreaElement | null>(null);

  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const handleSpeak = useCallback(async (messageId: string, content: string) => {
    if (speakingMessageId === messageId) {
      currentAudioRef.current?.pause();
      currentAudioRef.current = null;
      setSpeakingMessageId(null);
      return;
    }
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    setSpeakingMessageId(messageId);
    Haptics.tap();
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setSpeakingMessageId(null); return; }

      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL}/api/v1/voice/speak`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ text: content, voice: userVoice || "nova", speed: 1.0 }),
        }
      );
      if (!response.ok) { setSpeakingMessageId(null); return; }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      currentAudioRef.current = audio;
      audio.onended = () => {
        setSpeakingMessageId(null);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
      };
      audio.onerror = () => {
        setSpeakingMessageId(null);
        currentAudioRef.current = null;
      };
      await audio.play();
    } catch {
      setSpeakingMessageId(null);
    }
  }, [speakingMessageId, userVoice]);

  const clearHoverLeaveTimer = () => {
    if (hoverLeaveTimerRef.current != null) {
      window.clearTimeout(hoverLeaveTimerRef.current);
      hoverLeaveTimerRef.current = null;
    }
  };

  const enterMessageHover = (id: string) => {
    clearHoverLeaveTimer();
    setHoveredMessageId(id);
  };

  const leaveMessageHover = () => {
    clearHoverLeaveTimer();
    hoverLeaveTimerRef.current = window.setTimeout(() => {
      setHoveredMessageId(null);
    }, 100);
  };

  const clearLongPressTimer = () => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  };

  const isNearBottom = () => {
    const container = messagesContainerRef.current;
    if (!container) return true;
    return (
      container.scrollHeight -
        container.scrollTop -
        container.clientHeight <
      NEAR_BOTTOM_FOLLOW
    );
  };

  const handleScrollToBottom = () => {
    const c = messagesContainerRef.current;
    if (!c) return;
    isUserScrollingUpRef.current = false;
    lastScrollTopRef.current = c.scrollTop;
    smoothScrollToBottom(c);
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    setUnreadCount(0);
    setStreamJumpVisible(false);
  };

  const hasMessages = messages.length > 0;

  const streamingAssistantContent = useMemo(() => {
    const last = messages[messages.length - 1];
    if (last?.role === "assistant" && last.isStreaming) {
      return String(last.content ?? "");
    }
    return null;
  }, [messages]);

  useEffect(() => {
    prevLastAssistantStreamingRef.current = false;
    prevStreamLenRef.current = 0;
    prevThreadMessageCountRef.current = 0;
    prevMessagesLengthForAppendRef.current = 0;
    lastScrollTopRef.current = 0;
    isUserScrollingUpRef.current = false;
  }, [conversationId]);

  // First batch of messages for this conversation: instant bottom (no animation),
  // except a lone new user message (handled by append effect).
  useEffect(() => {
    if (messages.length === 0) {
      prevThreadMessageCountRef.current = 0;
      return;
    }
    if (prevThreadMessageCountRef.current === 0) {
      const last = messages[messages.length - 1];
      const shouldInstant =
        messages.length > 1 || last?.role === "assistant";
      prevThreadMessageCountRef.current = messages.length;
      if (shouldInstant) {
        prevMessagesLengthForAppendRef.current = messages.length;
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => {
            const c = messagesContainerRef.current;
            if (c) {
              instantScrollToBottom(c);
              lastScrollTopRef.current = c.scrollTop;
            }
          });
        });
      } else {
        /* Single user bubble first: keep append ref at 0 so the append effect scrolls. */
        prevMessagesLengthForAppendRef.current = 0;
      }
      return;
    }
    prevThreadMessageCountRef.current = messages.length;
  }, [messages.length]);

  useEffect(() => {
    if (!scrollToBottomSignal) return;
    const id = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        const c = messagesContainerRef.current;
        if (!c) return;
        instantScrollToBottom(c);
        lastScrollTopRef.current = c.scrollTop;
        isUserScrollingUpRef.current = false;
        isAtBottomRef.current = true;
        setIsAtBottom(true);
        setUnreadCount(0);
        setStreamJumpVisible(false);
      });
    });
    return () => window.cancelAnimationFrame(id);
  }, [scrollToBottomSignal]);

  // New messages: user → pin their bubble toward top (instant); assistant → smooth if following.
  useEffect(() => {
    const container = messagesContainerRef.current;
    const len = messages.length;
    if (len === 0) {
      prevMessagesLengthForAppendRef.current = 0;
      return;
    }
    const last = messages[len - 1];
    const grew = len > prevMessagesLengthForAppendRef.current;
    prevMessagesLengthForAppendRef.current = len;
    if (!grew) return;

    if (last.role === "user") {
      isUserScrollingUpRef.current = false;
      setStreamJumpVisible(false);
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          const c = messagesContainerRef.current;
          if (c) {
            instantScrollUserMessageToTop(c);
            lastScrollTopRef.current = c.scrollTop;
          }
        });
      });
      return;
    }

    if (last.role === "assistant" && !isUserScrollingUpRef.current) {
      if (isNearBottom()) {
        window.requestAnimationFrame(() => {
          const c = messagesContainerRef.current;
          if (c) smoothScrollToBottom(c);
        });
      }
    }
  }, [messages]);

  // Streaming tokens: one rAF per update, smooth follow only if user did not scroll up.
  useEffect(() => {
    if (streamingAssistantContent === null) {
      prevStreamLenRef.current = 0;
      if (streamScrollRafRef.current != null) {
        window.cancelAnimationFrame(streamScrollRafRef.current);
        streamScrollRafRef.current = null;
      }
      return;
    }
    const len = streamingAssistantContent.length;
    if (len === 0) return;
    if (isUserScrollingUpRef.current) {
      prevStreamLenRef.current = len;
      return;
    }

    if (streamScrollRafRef.current != null) {
      window.cancelAnimationFrame(streamScrollRafRef.current);
    }
    streamScrollRafRef.current = window.requestAnimationFrame(() => {
      streamScrollRafRef.current = null;
      const c = messagesContainerRef.current;
      if (!c || isUserScrollingUpRef.current) return;
      const dist = c.scrollHeight - c.scrollTop - c.clientHeight;
      if (dist > STREAM_BOTTOM_SLACK) {
        const maxScroll = Math.max(0, c.scrollHeight - c.clientHeight);
        c.scrollTo({ top: maxScroll, behavior: "smooth" });
      }
    });
    prevStreamLenRef.current = len;
    return () => {
      if (streamScrollRafRef.current != null) {
        window.cancelAnimationFrame(streamScrollRafRef.current);
        streamScrollRafRef.current = null;
      }
    };
  }, [streamingAssistantContent]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el || !hasMessages) return;

    const last = messages[messages.length - 1];
    const streamingAssist =
      last?.role === "assistant" && Boolean(last.isStreaming);
    const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
    const nearBottom = remaining < NEAR_BOTTOM_FOLLOW;

    if (streamingAssist) {
      if (nearBottom && !isUserScrollingUpRef.current) {
        isAtBottomRef.current = true;
        setIsAtBottom(true);
        setUnreadCount(0);
        setStreamJumpVisible(false);
      } else if (
        String(last.content ?? "").length > 0 &&
        remaining > USER_SCROLL_UP_DISTANCE
      ) {
        setStreamJumpVisible(true);
      }
      return;
    }
    setStreamJumpVisible(false);
  }, [messages, isLoading, hasMessages]);

  useEffect(() => {
    const last = messages[messages.length - 1];
    const now =
      last?.role === "assistant" ? Boolean(last.isStreaming) : false;
    const prev = prevLastAssistantStreamingRef.current;

    if (last?.role === "assistant" && prev === true && now === false) {
      Haptics.responseComplete();
      const idx = messages.length - 1;
      setCompletionPulseIndex(idx);
      const t = window.setTimeout(() => setCompletionPulseIndex(null), 650);
      const tMeta = window.setTimeout(() => {
        if (isUserScrollingUpRef.current) return;
        const c = messagesContainerRef.current;
        if (c) scrollToIncludeLastMessageMetadata(c);
      }, 150);
      prevLastAssistantStreamingRef.current = now;
      return () => {
        window.clearTimeout(t);
        window.clearTimeout(tMeta);
      };
    }

    prevLastAssistantStreamingRef.current = now;
  }, [messages]);

  useEffect(() => {
    const el = messagesContainerRef.current;
    if (!el) return;

    const syncScrollState = (container: HTMLElement) => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

      if (
        scrollTop < lastScrollTopRef.current &&
        distanceFromBottom > USER_SCROLL_UP_DISTANCE
      ) {
        isUserScrollingUpRef.current = true;
      }
      if (distanceFromBottom < AT_BOTTOM_DISTANCE) {
        isUserScrollingUpRef.current = false;
        setStreamJumpVisible(false);
        setUnreadCount(0);
      }

      lastScrollTopRef.current = scrollTop;
      const atBottom = distanceFromBottom < NEAR_BOTTOM_FOLLOW;
      isAtBottomRef.current = atBottom;
      setIsAtBottom(atBottom);
    };

    const handleScroll = (e: Event) => {
      syncScrollState(e.currentTarget as HTMLElement);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    syncScrollState(el);
    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, [hasMessages]);

  useEffect(() => {
    if (!editingUserKey) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setEditingUserKey(null);
        setEditDraft("");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingUserKey]);

  useLayoutEffect(() => {
    const el = editTextareaRef.current;
    if (!el || !editingUserKey) return;
    el.style.height = "auto";
    el.style.height = `${Math.max(el.scrollHeight, 44)}px`;
  }, [editDraft, editingUserKey]);

  useEffect(() => {
    const prev = prevMessageCountRef.current;
    const next = messages.length;
    if (next > prev && !isAtBottomRef.current) {
      setUnreadCount((current) => current + (next - prev));
    }
    prevMessageCountRef.current = next;
  }, [messages.length]);

  const renderedMessages = useMemo(
    () =>
      messages.map((message, index) => {
        const chatMessage = message as ChatMessage & {
          routed_to?: ModelId;
          routing_reason?: string;
          search_used?: boolean;
          search_query?: string;
        };
        const isUser = message.role === "user";
        const alignClass = isUser ? "items-end" : "items-start";
        const bubbleClass = isUser
          ? "bg-gradient-to-r from-[#7c3aed] via-[#2563eb] to-[#06b6d4] text-white [&_*]:text-white [&_a]:text-white/80 [&_a]:underline"
          : "text-foreground dark:text-[rgba(255,255,255,0.9)]";

        const baseModelId = chatMessage.model_id as ModelId | undefined;
        const routedTo = chatMessage.routed_to as ModelId | undefined;
        const routingReason = chatMessage.routing_reason;
        const searchUsed = chatMessage.search_used;
        const searchQuery = chatMessage.search_query;

        const plainText = String(message.content ?? "");
        const messageKey = chatMessage.id ?? `local-${index}`;
        const markdownCopyText =
          chatMessage.response_type === "plot" && chatMessage.plot_json
            ? "```json\n" +
              JSON.stringify(chatMessage.plot_json, null, 2) +
              "\n```"
            : chatMessage.response_type === "image" && chatMessage.image_url
              ? chatMessage.image_url
              : plainText;

        const isThinking =
          !isUser &&
          Boolean(isLoading) &&
          chatMessage.isStreaming &&
          plainText.trim().length === 0 &&
          (chatMessage.response_type === "text" || !chatMessage.response_type);
        const segments = isUser
          ? parseContentSegments(plainText)
          : ([] as ReturnType<typeof parseContentSegments>);

        const handleReplyWithQuote = () => {
          if (!onQuoteReply) return;
          const trimmed = plainText.trim();
          if (!trimmed) return;
          const preview =
            trimmed.length > 80 ? `${trimmed.slice(0, 80)}...` : trimmed;
          const quoted = `> ${preview}\n\n`;
          onQuoteReply(quoted);
        };

        const copyPlain = async () => {
          try {
            await window.navigator.clipboard.writeText(plainText);
            addToast("Copied to clipboard", "success");
          } catch {
            addToast("Could not copy", "error");
            throw new Error("copy failed");
          }
        };

        const copyMd = async () => {
          try {
            await window.navigator.clipboard.writeText(markdownCopyText);
            addToast("Copied to clipboard", "success");
          } catch {
            addToast("Could not copy", "error");
            throw new Error("copy failed");
          }
        };

        const submitBarFeedback = async (rating: 1 | -1, text: string) => {
          if (!conversationId) return;
          try {
            await submitFeedback({
              conversation_id: conversationId,
              message_id: chatMessage.id,
              message_content: plainText,
              rating,
              feedback_text: text || undefined,
            });
            addToast("Thanks for your feedback", "success");
          } catch {
            addToast("Could not send feedback", "error");
            throw new Error("feedback failed");
          }
        };

        const showActionBar =
          isUser
            ? editingUserKey !== messageKey
            : !chatMessage.isStreaming;

        const setRatingForMessage = (r: 1 | -1 | null) => {
          if (r === 1) Haptics.thumbsUp();
          if (r === -1) Haptics.thumbsDown();
          setFeedbackRatingByKey((prev) => ({ ...prev, [messageKey]: r }));
          if (r !== -1) {
            setFeedbackInputKey((k) => (k === messageKey ? null : k));
            setFeedbackDraftByKey((prev) => {
              const next = { ...prev };
              delete next[messageKey];
              return next;
            });
          }
        };

        return (
          <div
            key={messageKey}
            data-message="true"
            data-role={isUser ? "user" : "assistant"}
            className={`flex w-full flex-col gap-0.5 ${alignClass} ${
              isUser ? "prism-anim-user-message justify-end" : "prism-anim-assistant-message"
            }`}
          >
            {!isUser && (
              <div className="flex items-center prism-label-anim text-[9px] font-semibold tracking-[0.2em] text-muted-foreground/60">
                <span
                  style={{
                    background:
                      "linear-gradient(135deg, #7c3aed, #2563eb, #06b6d4)",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    display: "inline-block",
                    marginRight: "6px",
                  }}
                  aria-hidden
                />
                <span className="uppercase">PRISM</span>
              </div>
            )}
            <div className="flex w-full flex-col items-start gap-0.5">
              {!isUser &&
              index === messages.length - 1 &&
              !chatMessage.isStreaming &&
              !isLoading &&
              !isUserScrollingUpRef.current ? (
                <ResponseActions
                  messageContent={plainText}
                  onAction={(actionId, prompt) =>
                    onResponseAction?.(actionId, prompt, index)
                  }
                  isLastMessage={index === messages.length - 1}
                  isStreaming={Boolean(chatMessage.isStreaming)}
                />
              ) : null}
              <div
                className={`group/msg relative pb-2 ${
                  isUser
                    ? "ml-auto w-fit min-w-0 max-w-[70%] md:max-w-[60%] self-end"
                    : "w-full min-w-0 max-w-[85%] md:max-w-[75%] self-start"
                }`}
                onMouseEnter={() => enterMessageHover(messageKey)}
                onMouseLeave={leaveMessageHover}
                onTouchStart={() => {
                  clearLongPressTimer();
                  longPressTimerRef.current = window.setTimeout(() => {
                    enterMessageHover(messageKey);
                  }, 500);
                }}
                onTouchEnd={clearLongPressTimer}
                onTouchCancel={clearLongPressTimer}
              >
              <motion.div
                initial={false}
                animate={
                  completionPulseIndex === index && !isUser
                    ? {
                        boxShadow: [
                          "0 0 0px rgba(139,92,246,0)",
                          "0 0 20px rgba(139,92,246,0.15)",
                          "0 0 0px rgba(139,92,246,0)",
                        ],
                      }
                    : {}
                }
                transition={{ duration: 0.6, times: [0, 0.5, 1], ease: "easeOut" }}
                className={`chat-message-content w-full min-w-0 break-words rounded-2xl px-5 ${isUser ? "py-3.5" : "py-2.5"} ${textSizeClass} ${
                  isUser ? `${bubbleClass} shadow-sm` : "bg-transparent text-foreground dark:text-[rgba(255,255,255,0.9)]"
                }`}
              >
                {/* Inline image for user messages that had an image attached.
                    data: URIs cannot be optimised by next/image. */}
                {isUser && chatMessage.image_base64 && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:${chatMessage.image_media_type ?? "image/jpeg"};base64,${chatMessage.image_base64}`}
                    alt="Uploaded image"
                    className="mb-2 max-w-[300px] rounded-xl object-contain"
                  />
                )}

                {isUser && chatMessage.file_name && (
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-[#7c3aed33] bg-[#f5f3ff] px-3 py-1 text-[11px] text-foreground dark:bg-[#1f1633]">
                    {(() => {
                      const lower = chatMessage.file_name!.toLowerCase();
                      if (lower.endsWith(".csv") || lower.endsWith(".xlsx")) {
                        return <FileSpreadsheet className="size-3.5 text-[#7c3aed]" />;
                      }
                      if (
                        [".py", ".js", ".ts", ".jsx", ".tsx"].some((ext) =>
                          lower.endsWith(ext)
                        )
                      ) {
                        return <FileCode className="size-3.5 text-[#7c3aed]" />;
                      }
                      return <FileText className="size-3.5 text-[#7c3aed]" />;
                    })()}
                    <span className="truncate">
                      {chatMessage.file_name.length > 30
                        ? `${chatMessage.file_name.slice(0, 30)}...`
                        : chatMessage.file_name}
                    </span>
                  </div>
                )}

                {!isUser &&
                chatMessage.response_type === "plot" &&
                chatMessage.plot_json ? (
                  <PlotRenderer
                    plot_json={
                      chatMessage.plot_json as {
                        data: object[];
                        layout: object;
                      }
                    }
                  />
                ) : !isUser &&
                  chatMessage.response_type === "image" &&
                  chatMessage.image_url ? (
                  <ImageRenderer image_url={chatMessage.image_url} />
                ) : isUser ? (
                  editingUserKey === messageKey ? (
                  <motion.div
                    layout
                    className="w-full space-y-2"
                    transition={{ duration: 0.2, ease: "easeOut" }}
                  >
                    <textarea
                      ref={editTextareaRef}
                      value={editDraft}
                      onChange={(e) => setEditDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (
                          e.key === "Enter" &&
                          (e.metaKey || e.ctrlKey)
                        ) {
                          e.preventDefault();
                          const t = editDraft.trim();
                          if (
                            !t ||
                            t === plainText.trim()
                          ) {
                            return;
                          }
                          if (onEditMessage) onEditMessage(index, t);
                          setEditingUserKey(null);
                          setEditDraft("");
                        }
                      }}
                      rows={1}
                      className={`chat-message-content w-full resize-none rounded-[12px] border border-[rgba(139,92,246,0.5)] bg-[rgba(255,255,255,0.05)] px-4 py-3 ${textSizeClass} text-white outline-none transition-[min-height] duration-200 ease-out focus:border-[rgba(139,92,246,0.85)] focus:ring-2 focus:ring-[rgba(139,92,246,0.45)]`}
                    />
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        className="rounded-full px-3 py-1.5 text-[11px] text-white/45 transition-colors hover:bg-white/10 hover:text-white/75"
                        onClick={() => {
                          setEditingUserKey(null);
                          setEditDraft("");
                        }}
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        disabled={
                          !editDraft.trim() ||
                          editDraft.trim() === plainText.trim()
                        }
                        className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] px-3 py-1.5 text-[11px] font-medium text-white shadow-sm transition-opacity disabled:cursor-not-allowed disabled:opacity-40 hover:enabled:brightness-110"
                        onClick={() => {
                          const t = editDraft.trim();
                          if (!t || t === plainText.trim()) return;
                          if (onEditMessage) onEditMessage(index, t);
                          setEditingUserKey(null);
                          setEditDraft("");
                        }}
                      >
                        Save &amp; Resend
                        <ArrowRight className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </motion.div>
                  ) : (
                  <>
                    {segments.map((segment, idx) =>
                      segment.type === "text" ? (
                        <p
                          key={idx}
                          className={`chat-message-content whitespace-pre-wrap ${textSizeClass}`}
                        >
                          {segment.value}
                        </p>
                      ) : (
                        <div
                          key={idx}
                          className={`mt-3 max-h-80 overflow-hidden rounded-md border border-border bg-background/80 ${codeSizeClass} font-mono text-foreground/90`}
                        >
                          <div className="flex items-center justify-between border-b border-border/70 bg-muted/60 px-3 py-1.5 text-[11px] text-muted-foreground">
                            <span>Code</span>
                            <button
                              type="button"
                              onClick={async (
                                event: ReactMouseEvent<HTMLButtonElement>
                              ) => {
                                try {
                                  spawnRipple(
                                    event.currentTarget,
                                    event.clientX,
                                    event.clientY
                                  );
                                  await window.navigator.clipboard.writeText(
                                    segment.value
                                  );
                                  addToast(
                                    "Copied to clipboard",
                                    "success"
                                  );
                                } catch {
                                  // Ignore clipboard errors for now.
                                }
                              }}
                              className="relative overflow-hidden inline-flex items-center gap-1 rounded border border-transparent px-2 py-0.5 text-[11px] transition-colors hover:border-border hover:bg-background/80"
                            >
                              <Copy className="size-[12px]" />
                              <span>Copy code</span>
                            </button>
                          </div>
                          <pre className="max-h-72 overflow-auto px-3 py-2">
                            <code>{segment.value}</code>
                          </pre>
                        </div>
                      )
                    )}
                    {chatMessage.isEdited ? (
                      <p className="mt-1 text-[11px] text-white/40 opacity-40">
                        Edited
                      </p>
                    ) : null}
                  </>
                  )
                ) : (
                  <>
                    <div className="relative min-h-[24px]">
                      <AnimatePresence>
                        {isThinking && (
                          <motion.div
                            key="thinking"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="flex flex-col gap-1"
                          >
                            <ThinkingDots />
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {!isThinking && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.22, ease: "easeOut" }}
                        >
                          <StreamingAssistantContent
                            content={plainText}
                            isStreaming={Boolean(chatMessage.isStreaming)}
                            conversationId={conversationId}
                            fontSize={fontSize}
                          />
                        </motion.div>
                      )}
                    </div>
                  </>
                )}
              </motion.div>
              {chatMessage.created_at &&
                !(message.role === "assistant" && chatMessage.isStreaming) && (
                  <div
                    className={`mt-0.5 max-h-0 -translate-y-1 overflow-hidden opacity-0 transition-[opacity,transform,max-height] duration-150 ease-out group-hover/msg:max-h-10 group-hover/msg:translate-y-0 group-hover/msg:opacity-100 ${
                      isUser ? "w-full text-right" : "text-left"
                    }`}
                  >
                    <span className="text-[11px] italic text-[rgba(255,255,255,0.3)]">
                      {formatMessageTime(chatMessage.created_at)}
                    </span>
                  </div>
                )}
              {showActionBar && (
                <MessageActionsBar
                  visible={hoveredMessageId === messageKey}
                  align={isUser ? "right" : "left"}
                  variant={isUser ? "user" : "assistant"}
                  markdownCopyText={markdownCopyText}
                  onPointerEnter={() => enterMessageHover(messageKey)}
                  onPointerLeave={leaveMessageHover}
                  onCopyMessage={copyPlain}
                  onCopyMarkdown={copyMd}
                  onRegenerate={
                    !isUser && onRegenerate
                      ? () => onRegenerate(index)
                      : undefined
                  }
                  onEdit={
                    isUser && onEditMessage
                      ? () => {
                          setEditingUserKey(messageKey);
                          setEditDraft(plainText);
                        }
                      : undefined
                  }
                  onQuote={
                    !isUser && onQuoteReply ? handleReplyWithQuote : undefined
                  }
                  showRegenerateSpinner={false}
                  conversationId={conversationId ?? null}
                  feedbackRating={feedbackRatingByKey[messageKey] ?? null}
                  onFeedbackRatingChange={setRatingForMessage}
                  feedbackInputOpen={feedbackInputKey === messageKey}
                  onFeedbackInputOpenChange={(open) =>
                    setFeedbackInputKey(open ? messageKey : null)
                  }
                  feedbackDraft={feedbackDraftByKey[messageKey] ?? ""}
                  onFeedbackDraftChange={(v) =>
                    setFeedbackDraftByKey((prev) => ({
                      ...prev,
                      [messageKey]: v,
                    }))
                  }
                  onSubmitFeedback={submitBarFeedback}
                  onSpeak={
                    !isUser
                      ? () => handleSpeak(messageKey, plainText)
                      : undefined
                  }
                  isSpeaking={speakingMessageId === messageKey}
                  onBranch={onBranch ? () => onBranch(index) : undefined}
                  messageIndex={index}
                />
              )}
              </div>

              {!isUser && baseModelId === "auto" && (
                <AnimatePresence mode="wait">
                  {chatMessage.isStreaming && !routedTo ? (
                    <motion.div
                      key="routing-shimmer"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="prism-routing-shimmer-pill max-w-[80%]"
                      aria-hidden
                    />
                  ) : routedTo ? (
                    <motion.div
                      key="routing-badge"
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{
                        type: "spring",
                        stiffness: 380,
                        damping: 28,
                      }}
                      className="prism-routing-badge-anim inline-flex max-w-[80%] items-start gap-1 rounded-full border border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.15)] px-2 py-1 text-xs leading-snug text-[rgba(200,180,255,0.9)]"
                    >
                      <span
                        className="mt-px shrink-0 text-[12px] leading-none text-[rgba(200,180,255,0.9)]"
                        aria-hidden
                      >
                        ✦
                      </span>
                      <span className="whitespace-pre-wrap text-[rgba(200,180,255,0.9)]">
                        Auto-routed to{" "}
                        {routedTo === "coding" ? "Coding" : "Writing"}
                        {routingReason
                          ? ` · ${routingReason}`
                          : " based on your request."}
                      </span>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              )}

              {!isUser && searchUsed && (
                <div className="inline-flex max-w-[80%] items-start gap-1.5 rounded-full border border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.15)] px-3 py-1.5 text-[11px] leading-snug text-[rgba(200,180,255,0.9)]">
                  <span className="mt-[1px] text-xs">🔍</span>
                  <span className="whitespace-pre-wrap">
                    Web search
                    {searchQuery ? ` · ${searchQuery}` : ""}
                  </span>
                </div>
              )}

              {!isUser && chatMessage.image_used && (
                <div className="inline-flex max-w-[80%] items-center gap-1.5 rounded-full border border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.15)] px-3 py-1.5 text-[11px] leading-snug text-[rgba(200,180,255,0.9)]">
                  <Eye className="size-3 shrink-0" />
                  <span>Vision · Analyzed with GPT-4o</span>
                </div>
              )}

              {!isUser && chatMessage.is_agent && (
                <div className="inline-flex max-w-[80%] items-center gap-1.5 rounded-full border border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.15)] px-3 py-1.5 text-[11px] leading-snug text-[rgba(200,180,255,0.9)]">
                  <Zap className="size-3 shrink-0" />
                  <span>
                    Agent Mode
                    {chatMessage.agent_step_count
                      ? ` · ${chatMessage.agent_step_count} steps`
                      : ""}
                  </span>
                </div>
              )}

              {!isUser && (chatMessage as ChatMessage & { active_template_label?: string }).active_template_label && (
                <div className="inline-flex max-w-[80%] items-center gap-1.5 rounded-full border border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.15)] px-3 py-1.5 text-[11px] leading-snug text-[rgba(200,180,255,0.9)]">
                  <span>
                    {(chatMessage as ChatMessage & { active_template_label?: string }).active_template_label}
                  </span>
                </div>
              )}

            </div>
          </div>
        );
      }),
    [
      messages,
      modelsById,
      onQuoteReply,
      addToast,
      conversationId,
      isLoading,
      completionPulseIndex,
      hoveredMessageId,
      editingUserKey,
      editDraft,
      feedbackRatingByKey,
      feedbackInputKey,
      feedbackDraftByKey,
      onRegenerate,
      onEditMessage,
      onResponseAction,
      speakingMessageId,
      handleSpeak,
    ]
  );

  const lastMessageForStream = hasMessages
    ? messages[messages.length - 1]
    : undefined;
  const isLastAssistantStreaming =
    lastMessageForStream?.role === "assistant" &&
    Boolean(lastMessageForStream.isStreaming);

  return (
    <section
      ref={messagesContainerRef}
      className="relative min-h-0 flex-1 overflow-y-auto px-8 pt-8 pb-48 transition-colors duration-200"
      style={{ scrollPaddingBottom: SCROLL_PADDING_BOTTOM }}
    >
      {!hasMessages ? (
        <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
          <div className="space-y-4">
            <h1 className="prism-empty-float bg-gradient-to-r from-[#7c3aed] via-[#2563eb] to-[#06b6d4] bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl">
              Prism
            </h1>
            <p className="prism-empty-tagline text-base text-foreground/80">
              The right model. Every time.
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() =>
                  onSuggestionClick &&
                  onSuggestionClick(
                    "Write a Python implementation of binary search."
                  )
                }
                className="prism-empty-suggestion-chip prism-empty-suggestion-chip-appear inline-flex items-center gap-2 rounded-full border border-[#7c3aed33] bg-background/60 px-4 py-2 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-[#f5f3ff] dark:hover:bg-[#1f1633] transition-transform hover:scale-[1.03] active:scale-[0.97]"
                style={{ animationDelay: "0ms" }}
              >
                <Code2 className="size-4 text-[#7c3aed]" />
                <span>Write a Python binary search</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onSuggestionClick &&
                  onSuggestionClick(
                    "Draft a friendly LinkedIn post about our new product launch."
                  )
                }
                className="prism-empty-suggestion-chip prism-empty-suggestion-chip-appear inline-flex items-center gap-2 rounded-full border border-[#7c3aed33] bg-background/60 px-4 py-2 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-[#f5f3ff] dark:hover:bg-[#1f1633] transition-transform hover:scale-[1.03] active:scale-[0.97]"
                style={{ animationDelay: "100ms" }}
              >
                <PenLine className="size-4 text-[#7c3aed]" />
                <span>Draft a LinkedIn post</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  onSuggestionClick &&
                  onSuggestionClick("What is new in React 19?")
                }
                className="prism-empty-suggestion-chip prism-empty-suggestion-chip-appear inline-flex items-center gap-2 rounded-full border border-[#7c3aed33] bg-background/60 px-4 py-2 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-[#f5f3ff] dark:hover:bg-[#1f1633] transition-transform hover:scale-[1.03] active:scale-[0.97]"
                style={{ animationDelay: "200ms" }}
              >
                <Globe className="size-4 text-[#7c3aed]" />
                <span>What&apos;s new in React 19?</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex w-full flex-col gap-2 pb-[80px]">
          {renderedMessages}
        </div>
      )}

      {/* Fade thread into the floating composer (skip empty state) */}
      {hasMessages ? (
        <div
          className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-[120px] bg-gradient-to-b from-transparent to-background"
          aria-hidden
        />
      ) : null}

      {streamJumpVisible && (
        <div className="absolute bottom-32 right-8 z-20">
          <button
            type="button"
            onClick={handleScrollToBottom}
            className={`prism-stream-new-content-btn inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#7c3aed] via-[#2563eb] to-[#06b6d4] px-4 py-2 text-xs font-medium text-white shadow-lg ${
              isLastAssistantStreaming ? "prism-scroll-hint-bounce" : ""
            }`}
            aria-label="Scroll to new streamed content"
          >
            <span aria-hidden>↓</span>
            <span>New content</span>
          </button>
        </div>
      )}

      {unreadCount > 0 && !isAtBottom && (
        <div className="absolute bottom-20 right-8 z-10">
          <button
            type="button"
            onClick={handleScrollToBottom}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-r from-[#7c3aed] via-[#2563eb] to-[#06b6d4] text-white shadow-lg transition-opacity duration-200"
            aria-label="Scroll to bottom"
            title="Scroll to bottom"
          >
            <ChevronDown className="size-4 -mb-[1px]" />
          </button>
          <div className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-background px-1 text-[10px] font-semibold text-foreground shadow">
            {unreadCount}
          </div>
        </div>
      )}
    </section>
  );
}

