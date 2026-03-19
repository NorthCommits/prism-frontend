"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  ChevronDown,
  Copy,
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

type ChatWindowProps = {
  messages: ChatMessage[];
  modelsById?: Record<ModelId, AvailableModel>;
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

export function ChatWindow(props: ChatWindowProps) {
  const { messages, modelsById, onQuoteReply, onSuggestionClick } = props;
  // Scroll container ref to keep view pinned to bottom.
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [openMenuIndex, setOpenMenuIndex] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

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
        const effectiveModelId = routedTo ?? baseModelId;

        const modelLabelId = effectiveModelId ?? "auto";

        const segments = parseContentSegments(String((message as any).content));

        const plainText = String((message as any).content ?? "");

        const handleCopy = async () => {
          try {
            await window.navigator.clipboard.writeText(plainText);
            setCopiedIndex(index);
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
            className={`group flex w-full flex-col gap-1.5 ${alignClass} animate-in fade-in-0 slide-in-from-bottom-1`}
          >
            {!isUser && (
              <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
                <span
                  className={`inline-flex size-2 rounded-full ${
                    modelLabelId === "coding"
                      ? "bg-[#7c3aed]"
                      : modelLabelId === "writing"
                      ? "bg-[#2563eb]"
                      : "bg-[#06b6d4]"
                  }`}
                />
                <span className="font-medium uppercase tracking-wide">
                  Prism
                </span>
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
                ) : (
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
                              onClick={async () => {
                                try {
                                  await window.navigator.clipboard.writeText(
                                    segment.value
                                  );
                                } catch {
                                  // Ignore clipboard errors for now.
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded border border-transparent px-2 py-0.5 text-[11px] transition-colors hover:border-border hover:bg-background/80"
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
                )}
              </div>

              {!isUser && baseModelId === "auto" && routedTo && (
                <div className="inline-flex max-w-[80%] items-start gap-1.5 rounded-full border border-[#7c3aed33] bg-gradient-to-r from-[#7c3aed1a] to-[#2563eb1a] px-3 py-1.5 text-[11px] leading-snug text-muted-foreground">
                  <span className="mt-[1px] text-xs">✦</span>
                  <span className="whitespace-pre-wrap">
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

              {!isUser && (
                <div className="mt-1 flex w-full justify-end opacity-0 transition-opacity duration-150 group-hover:opacity-100">
                  <div className="flex items-center gap-1.5 text-xs" ref={menuRef}>
                    <button
                      type="button"
                      onClick={handleCopy}
                      title="Copy"
                      className="inline-flex items-center justify-center rounded-full border border-transparent bg-transparent px-2 py-1 text-[11px] text-muted-foreground transition-colors hover:border-border hover:bg-muted/70"
                    >
                      {copiedIndex === index ? (
                        <Check className="size-[14px]" />
                      ) : (
                        <Copy className="size-[14px]" />
                      )}
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
    [messages, modelsById]
  );

  return (
    <section
      ref={scrollRef}
      className="flex-1 overflow-y-auto px-8 pt-8 pb-48 transition-colors duration-200"
    >
      {!hasMessages ? (
        <div className="flex h-full flex-col items-center justify-center text-center text-sm text-muted-foreground">
          <div className="space-y-4">
            <h1 className="bg-gradient-to-r from-[#7c3aed] via-[#2563eb] to-[#06b6d4] bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-5xl">
              Prism
            </h1>
            <p className="text-base text-foreground/80">
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
                className="inline-flex items-center gap-2 rounded-full border border-[#7c3aed33] bg-background/60 px-4 py-2 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-[#f5f3ff] dark:hover:bg-[#1f1633]"
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
                className="inline-flex items-center gap-2 rounded-full border border-[#7c3aed33] bg-background/60 px-4 py-2 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-[#f5f3ff] dark:hover:bg-[#1f1633]"
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
                className="inline-flex items-center gap-2 rounded-full border border-[#7c3aed33] bg-background/60 px-4 py-2 text-xs font-medium text-foreground shadow-sm transition-colors hover:bg-[#f5f3ff] dark:hover:bg-[#1f1633]"
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
    </section>
  );
}

