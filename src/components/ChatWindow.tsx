"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  Check,
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
} from "lucide-react";

import type { AvailableModel, ChatMessage, ModelId } from "../lib/api";
import { PlotRenderer } from "@/components/PlotRenderer";
import { ImageRenderer } from "@/components/ImageRenderer";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import {
  vscDarkPlus,
  vs,
} from "react-syntax-highlighter/dist/esm/styles/prism";
import { useTheme } from "next-themes";
import { useToast } from "@/components/Toast";

type ChatWindowProps = {
  messages: ChatMessage[];
  modelsById?: Record<ModelId, AvailableModel>;
  /** When true, shows assistant-style typing dots at the end of the thread. */
  isLoading?: boolean;
  onQuoteReply?: (text: string) => void;
  onSuggestionClick?: (text: string) => void;
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

// Icon-only copy control for fenced code headers; shows a checkmark briefly after copy.
function CopyCodeButton(props: { code: string }) {
  const { code } = props;
  const [copied, setCopied] = useState(false);
  const { addToast } = useToast();

  const handleCopy = async (event: ReactMouseEvent<HTMLButtonElement>) => {
    try {
      spawnRipple(event.currentTarget, event.clientX, event.clientY);
      await window.navigator.clipboard.writeText(code);
      setCopied(true);
      addToast("Copied to clipboard", "success");
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignore clipboard errors.
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      title={copied ? "Copied" : "Copy code"}
      className={`relative overflow-hidden inline-flex items-center justify-center rounded p-0.5 text-xs text-muted-foreground transition-colors hover:text-white ${
        copied ? "prism-copy-flash-bg" : ""
      }`}
    >
      <span className="relative inline-flex size-3.5 items-center justify-center">
        <Copy
          className={`absolute inset-0 transition-opacity duration-150 ${
            copied ? "opacity-0" : "opacity-100"
          }`}
          aria-hidden
        />
        <Check
          className={`absolute inset-0 transition-opacity duration-150 ${
            copied ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden
        />
      </span>
    </button>
  );
}

// Fenced assistant code: Prism theme bar + syntax-highlighted body with scroll cap.
function MarkdownFencedCode(props: { code: string; language?: string }) {
  const { code, language } = props;
  const { resolvedTheme } = useTheme();
  const isDarkMode = resolvedTheme === "dark";

  const prismLanguage = language && language.length > 0 ? language : "markup";
  const headerLabel = language && language.length > 0 ? language : "code";

  const codeBackground = isDarkMode ? "#1e1e2e" : "#f6f8fa";
  const codeText = isDarkMode ? "#e2e8f0" : "#24292e";
  const headerBorderColor = isDarkMode ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.08)";

  return (
    <div className="relative mb-3 overflow-hidden rounded-lg font-mono text-sm">
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          backgroundColor: codeBackground,
          borderBottom: `1px solid ${headerBorderColor}`,
        }}
      >
        <span className="text-xs" style={{ color: codeText }}>
          {headerLabel}
        </span>
        <CopyCodeButton code={code} />
      </div>
      <SyntaxHighlighter
        style={isDarkMode ? vscDarkPlus : vs}
        language={prismLanguage}
        PreTag="div"
        customStyle={{
          margin: 0,
          padding: "16px",
          background: codeBackground,
          color: codeText,
          borderRadius: "0 0 8px 8px",
          fontSize: "13px",
          maxHeight: "400px",
          overflowY: "auto",
          overflowX: "auto",
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
}

// Renders assistant text as GitHub-flavored markdown with Prism-themed styles.
function AssistantMarkdown(props: { content: string }) {
  const { content } = props;

  const markdownComponents: Partial<Components> = {
    h1: ({ children, ...rest }) => (
      <h1 className="mt-4 mb-3 text-2xl font-bold" {...rest}>
        {children}
      </h1>
    ),
    h2: ({ children, ...rest }) => (
      <h2 className="mt-4 mb-2 text-xl font-bold" {...rest}>
        {children}
      </h2>
    ),
    h3: ({ children, ...rest }) => (
      <h3 className="mt-3 mb-2 text-lg font-semibold" {...rest}>
        {children}
      </h3>
    ),
    p: ({ children, ...rest }) => (
      <p className="mb-3 leading-relaxed last:mb-0" {...rest}>
        {children}
      </p>
    ),
    ul: ({ children, ...rest }) => (
      <ul
        className="mb-3 ml-4 list-outside list-disc space-y-1"
        {...rest}
      >
        {children}
      </ul>
    ),
    ol: ({ children, ...rest }) => (
      <ol
        className="mb-3 ml-4 list-outside list-decimal space-y-1"
        {...rest}
      >
        {children}
      </ol>
    ),
    li: ({ children, ...rest }) => (
      <li className="leading-relaxed" {...rest}>
        {children}
      </li>
    ),
    blockquote: ({ children, ...rest }) => (
      <blockquote
        className="mb-3 border-l-[3px] border-[#7c3aed] pl-4 italic text-muted-foreground"
        {...rest}
      >
        {children}
      </blockquote>
    ),
    hr: ({ ...rest }) => (
      <hr className="mt-4 mb-4 border-border" {...rest} />
    ),
    a: ({ children, href, ...rest }) => (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="text-purple-500 hover:underline"
        {...rest}
      >
        {children}
      </a>
    ),
    strong: ({ children, ...rest }) => (
      <strong className="font-semibold" {...rest}>
        {children}
      </strong>
    ),
    em: ({ children, ...rest }) => (
      <em className="italic" {...rest}>
        {children}
      </em>
    ),
    table: ({ children, ...rest }) => (
      <div className="mb-3 w-full overflow-x-auto">
        <table className="w-full border-collapse" {...rest}>
          {children}
        </table>
      </div>
    ),
    thead: ({ children, ...rest }) => <thead {...rest}>{children}</thead>,
    tbody: ({ children, ...rest }) => (
      <tbody className="[&>tr:nth-child(even)]:bg-muted/35" {...rest}>
        {children}
      </tbody>
    ),
    tr: ({ children, ...rest }) => <tr {...rest}>{children}</tr>,
    th: ({ children, ...rest }) => (
      <th
        className="border border-border bg-muted px-4 py-2 text-left font-semibold"
        {...rest}
      >
        {children}
      </th>
    ),
    td: ({ children, ...rest }) => (
      <td className="border border-border px-4 py-2" {...rest}>
        {children}
      </td>
    ),
    // Let the `code` renderer handle both inline + fenced blocks.
    // Avoid rendering children directly here to prevent inline styles from bleeding into fenced blocks.
    pre: ({ children }) => <>{children}</>,
    code: ({ className, children }) => {
      const match = /language-(\w+)/.exec(className || "");

      const rawChildren = children ?? "";
      const codeString = (Array.isArray(rawChildren)
        ? rawChildren.join("")
        : String(rawChildren)
      ).replace(/\n$/, "");

      const language = match ? match[1] : "text";
      const isFencedBlock = Boolean(match) || codeString.includes("\n");

      if (isFencedBlock) {
        return <MarkdownFencedCode code={codeString} language={language} />;
      }

      return (
        <code
          className={`rounded-md bg-[rgba(124,58,237,0.1)] px-1.5 py-0.5 font-mono text-sm text-[#7c3aed] dark:text-[#a78bfa] ${className ?? ""}`}
        >
          {children}
        </code>
      );
    },
  };

  return (
    <div className="text-[15px] leading-relaxed">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function ChatWindow(props: ChatWindowProps) {
  const {
    messages,
    modelsById,
    isLoading = false,
    onQuoteReply,
    onSuggestionClick,
  } = props;
  const { addToast } = useToast();
  // Scroll container ref to keep view pinned to bottom.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [unreadCount, setUnreadCount] = useState(0);
  const isAtBottomRef = useRef(true);
  const prevMessageCountRef = useRef(messages.length);

  const handleScrollToBottom = () => {
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    el.scrollTop = el.scrollHeight;
    isAtBottomRef.current = true;
    setIsAtBottom(true);
    setUnreadCount(0);
  };

  useEffect(() => {
    if (scrollRef.current && isAtBottomRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      // Consider "at bottom" when within 20px of the bottom.
      const remaining = el.scrollHeight - el.scrollTop - el.clientHeight;
      const atBottom = remaining < 20;
      isAtBottomRef.current = atBottom;
      setIsAtBottom(atBottom);
      if (atBottom) setUnreadCount(0);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, []);

  useEffect(() => {
    const prev = prevMessageCountRef.current;
    const next = messages.length;
    if (next > prev && !isAtBottomRef.current) {
      setUnreadCount((current) => current + (next - prev));
    }
    prevMessageCountRef.current = next;
  }, [messages.length]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        menuRef.current &&
        event.target instanceof Node &&
        !menuRef.current.contains(event.target)
      ) {
        setOpenMenuIndex(null);
      }
    };

    if (openMenuIndex !== null) {
      window.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, [openMenuIndex]);

  useEffect(() => {
    if (openMenuIndex === null) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpenMenuIndex(null);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [openMenuIndex]);

  const hasMessages = messages.length > 0;

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
          ? "bg-gradient-to-r from-[#7c3aed] via-[#2563eb] to-[#06b6d4] text-white"
          : "text-foreground";

        const baseModelId = chatMessage.model_id as ModelId | undefined;
        const routedTo = chatMessage.routed_to as ModelId | undefined;
        const routingReason = chatMessage.routing_reason;
        const searchUsed = chatMessage.search_used;
        const searchQuery = chatMessage.search_query;

        const plainText = String(message.content ?? "");
        const isThinking =
          !isUser &&
          chatMessage.isStreaming &&
          plainText.trim().length === 0 &&
          (chatMessage.response_type === "text" || !chatMessage.response_type);
        const segments = isUser
          ? parseContentSegments(plainText)
          : ([] as ReturnType<typeof parseContentSegments>);

        const handleCopy = async (event: ReactMouseEvent<HTMLButtonElement>) => {
          try {
            spawnRipple(event.currentTarget, event.clientX, event.clientY);
            await window.navigator.clipboard.writeText(plainText);
            setCopiedIndex(index);
            addToast("Copied to clipboard", "success");
            window.setTimeout(() => {
              setCopiedIndex((current) => (current === index ? null : current));
            }, 2000);
          } catch {
            // Swallow clipboard errors silently for now.
          }
        };

        const handleReplyWithQuote = () => {
          if (!onQuoteReply) return;
          const trimmed = plainText.trim();
          if (!trimmed) return;
          const preview =
            trimmed.length > 80 ? `${trimmed.slice(0, 80)}...` : trimmed;
          const quoted = `> ${preview}\n\n`;
          onQuoteReply(quoted);
          setOpenMenuIndex(null);
        };

        return (
          <div
            key={index}
            className={`group flex w-full flex-col gap-1.5 ${alignClass} ${
              isUser ? "prism-anim-user-message" : "prism-anim-assistant-message"
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
            <div className="flex flex-col items-start gap-1.5">
              <div
                className={`${
                  isUser ? "max-w-[62%] ml-auto mr-12" : "max-w-[78%]"
                } rounded-2xl px-5 py-3.5 text-[15px] leading-relaxed ${
                  isUser ? `${bubbleClass} shadow-sm` : "bg-transparent text-foreground"
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
                  <>
                    {segments.map((segment, idx) =>
                      segment.type === "text" ? (
                        <p
                          key={idx}
                          className="whitespace-pre-wrap text-[15px] leading-[1.75]"
                        >
                          {segment.value}
                        </p>
                      ) : (
                        <div
                          key={idx}
                          className="mt-3 max-h-80 overflow-hidden rounded-md border border-border bg-background/80 text-[14px] font-mono text-foreground/90"
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
                  </>
                ) : (
                  <>
                    <div className="relative min-h-[16px]">
                      <div
                        className={`transition-opacity duration-200 prism-thinking-shimmer ${
                          isThinking ? "opacity-100" : "opacity-0"
                        }`}
                        style={{ position: "absolute", left: 0, top: 0 }}
                        aria-hidden
                      />
                      <div
                        className={`transition-opacity duration-200 ${
                          isThinking ? "opacity-0" : "opacity-100"
                        }`}
                      >
                        <AssistantMarkdown content={plainText} />
                      </div>
                    </div>
                    {chatMessage.isStreaming &&
                      !isThinking &&
                      (chatMessage.response_type === "text" ||
                        !chatMessage.response_type) &&
                      plainText.trim().length > 0 && (
                        <span className="inline-block w-0.5 h-4 bg-current ml-0.5 animate-pulse" />
                      )}
                  </>
                )}
              </div>

              {!isUser && baseModelId === "auto" && routedTo && (
                <div className="prism-routing-badge-anim inline-flex max-w-[80%] items-start gap-1 rounded-full border border-[#7c3aed]/10 bg-gradient-to-r from-[#7c3aed]/[0.06] to-[#2563eb]/[0.06] px-2 py-1 text-xs leading-snug text-muted-foreground dark:border-[#7c3aed]/15 dark:from-[#7c3aed]/[0.08] dark:to-[#2563eb]/[0.08]">
                  <span
                    className="mt-px shrink-0 text-[12px] leading-none text-muted-foreground"
                    aria-hidden
                  >
                    ✦
                  </span>
                  <span className="whitespace-pre-wrap text-muted-foreground">
                    Auto-routed to{" "}
                    {routedTo === "coding" ? "Coding" : "Writing"}
                    {routingReason
                      ? ` · ${routingReason}`
                      : " based on your request."}
                  </span>
                </div>
              )}

              {!isUser && searchUsed && (
                <div className="inline-flex max-w-[80%] items-start gap-1.5 rounded-full bg-sky-950/5 px-3 py-1.5 text-[11px] leading-snug text-sky-700 dark:bg-sky-500/10 dark:text-sky-200">
                  <span className="mt-[1px] text-xs">🔍</span>
                  <span className="whitespace-pre-wrap">
                    Web search
                    {searchQuery ? ` · ${searchQuery}` : ""}
                  </span>
                </div>
              )}

              {!isUser && chatMessage.image_used && (
                <div className="inline-flex max-w-[80%] items-center gap-1.5 rounded-full bg-violet-950/5 px-3 py-1.5 text-[11px] leading-snug text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                  <Eye className="size-3 shrink-0" />
                  <span>Vision · Analyzed with GPT-4o</span>
                </div>
              )}

              {!isUser && (
                <div className="mt-1 flex w-full justify-end opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <div className="flex items-center gap-1.5 text-xs" ref={menuRef}>
                    <button
                      type="button"
                      onClick={handleCopy}
                      title="Copy"
                      className={`relative overflow-hidden inline-flex items-center justify-center rounded-full border border-transparent bg-transparent px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-border hover:bg-muted/70 ${
                        copiedIndex === index ? "prism-copy-flash-bg" : ""
                      }`}
                    >
                      <span className="relative inline-flex size-[14px] items-center justify-center">
                        <Copy
                          className={`absolute inset-0 transition-opacity duration-150 ${
                            copiedIndex === index ? "opacity-0" : "opacity-100"
                          }`}
                          aria-hidden
                        />
                        <Check
                          className={`absolute inset-0 transition-opacity duration-150 ${
                            copiedIndex === index ? "opacity-100" : "opacity-0"
                          }`}
                          aria-hidden
                        />
                      </span>
                    </button>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() =>
                          setOpenMenuIndex((current) =>
                            current === index ? null : index
                          )
                        }
                        className="inline-flex items-center justify-center rounded-full border border-transparent bg-transparent px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-border hover:bg-muted/70"
                        aria-expanded={openMenuIndex === index}
                        aria-haspopup="menu"
                      >
                        <ChevronDown className="size-[14px]" />
                      </button>
                      {openMenuIndex === index && (
                        <div className="absolute right-0 z-40 mt-1 w-40 rounded-md border bg-popover p-1 text-left text-[11px] shadow-md">
                          <button
                            type="button"
                            onClick={handleReplyWithQuote}
                            className="flex w-full items-center gap-1.5 rounded-sm px-2 py-1.5 text-xs text-foreground hover:bg-muted"
                          >
                            <Quote className="size-[14px]" />
                            <span>Reply with quote</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }),
    [messages, modelsById, copiedIndex, onQuoteReply, openMenuIndex, addToast]
  );

  return (
    <section
      ref={scrollRef}
      className="relative flex-1 overflow-y-auto px-8 pt-8 pb-48 transition-colors duration-200"
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
        <div className="mx-auto flex w-full max-w-[768px] flex-col gap-6">
          {renderedMessages}
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

