"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, ArrowUp, Check } from "lucide-react";

// ── Inline keyframes (prefixed dm-) so the component is self-contained ────────

const DEMO_CSS = `
  @keyframes dm-bounce {
    0%, 80%, 100% { transform: scale(0.75); opacity: 0.35; }
    40%            { transform: scale(1);    opacity: 1;    }
  }
  @keyframes dm-blink {
    0%, 100% { opacity: 1; }
    50%      { opacity: 0; }
  }
  @keyframes dm-spin {
    to { transform: rotate(360deg); }
  }
  .dm-cursor { animation: dm-blink 1s step-end infinite; }
  .dm-scroll::-webkit-scrollbar       { width: 4px; }
  .dm-scroll::-webkit-scrollbar-track { background: transparent; }
  .dm-scroll::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 999px; }
  .dm-scroll::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.55); }
`;

const SUGGESTED_PROMPTS = [
  "Write a Python binary search",
  "Explain neural networks simply",
  "Draft a professional email",
];

const CTA_BULLETS = [
  "Unlimited conversations",
  "Memory across sessions",
  "Projects & file upload",
  "Voice input",
];

const APP_URL = "https://prism-frontend-three.vercel.app";

// ── Types ─────────────────────────────────────────────────────────────────────

interface DemoMessage {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
  isError?: boolean;
  routedTo?: string;
}

interface StatusData {
  messages_remaining: number;
  limit_reached: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

interface DemoChatProps {
  /**
   * compact=true  → fixed 320px message area height (landing page embed).
   * compact=false → flex-1 min-h-0 (standalone /demo, fills parent height).
   */
  compact?: boolean;
}

export function DemoChat({ compact = true }: DemoChatProps) {
  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://prism-backend-sjhg.onrender.com";

  const messagesScrollRef = useRef<HTMLDivElement>(null);
  const streamingRef = useRef("");
  const pendingRoutedTo = useRef<string | null>(null);

  const [messages, setMessages] = useState<DemoMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messagesRemaining, setMessagesRemaining] = useState<number | null>(null);
  const [limitReached, setLimitReached] = useState(false);
  const [statusLoading, setStatusLoading] = useState(true);
  const [backendWaking, setBackendWaking] = useState(false);

  // ── Status fetch on mount ────────────────────────────────────────────────
  useEffect(() => {
    // Show "waking up" affordance after 3 s of no response
    const wakingTimer = setTimeout(() => setBackendWaking(true), 3000);

    fetch(`${API_URL}/api/v1/demo/status`)
      .then((r) => {
        if (!r.ok) throw new Error("status failed");
        return r.json();
      })
      .then((data: StatusData) => {
        setMessagesRemaining(data.messages_remaining);
        setLimitReached(data.limit_reached);
        setStatusLoading(false);
        clearTimeout(wakingTimer);
        setBackendWaking(false);
      })
      .catch(() => {
        // If status fails, assume full quota — don't block the UI
        setMessagesRemaining(3);
        setStatusLoading(false);
        clearTimeout(wakingTimer);
        setBackendWaking(false);
      });

    return () => clearTimeout(wakingTimer);
  }, [API_URL]);

  // ── Auto-scroll message container (never scrolls the page) ──────────────
  useEffect(() => {
    const el = messagesScrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // ── Send message ─────────────────────────────────────────────────────────
  const sendMessage = async (text?: string) => {
    const messageText = (text ?? input).trim();
    if (!messageText || isLoading || limitReached) return;

    const userMsg: DemoMessage = { role: "user", content: messageText };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    streamingRef.current = "";
    pendingRoutedTo.current = null;

    try {
      const response = await fetch(`${API_URL}/api/v1/demo/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          // Sanitize to just role+content so the backend isn't confused by
          // our extra fields (routedTo, isStreaming, isError).
          history: [...messages, userMsg]
            .slice(-4)
            .map(({ role, content }) => ({ role, content })),
        }),
      });

      if (response.status === 429) {
        setLimitReached(true);
        setMessagesRemaining(0);
        setIsLoading(false);
        return;
      }

      if (!response.ok || !response.body) throw new Error("Request failed");

      // Add a streaming placeholder row
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "", isStreaming: true },
      ]);

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      outer: while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          let data: Record<string, unknown>;
          try {
            data = JSON.parse(line.slice(6));
          } catch {
            continue; // skip malformed SSE lines
          }

          if (data.type === "metadata") {
            if (typeof data.messages_remaining === "number") {
              setMessagesRemaining(data.messages_remaining as number);
            }
            if (data.limit_reached) setLimitReached(true);
            if (typeof data.routed_to === "string") {
              pendingRoutedTo.current = data.routed_to as string;
            }
          }

          if (data.type === "token") {
            streamingRef.current += (data.content as string) ?? "";
            const accumulated = streamingRef.current;
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant" && last.isStreaming) {
                next[next.length - 1] = { ...last, content: accumulated };
              }
              return next;
            });
          }

          if (data.type === "done") {
            const finalText = streamingRef.current;
            const routedTo = pendingRoutedTo.current ?? undefined;
            streamingRef.current = "";
            setMessages((prev) => {
              const next = [...prev];
              const last = next[next.length - 1];
              if (last?.role === "assistant" && last.isStreaming) {
                next[next.length - 1] = { role: "assistant", content: finalText, routedTo };
              }
              return next;
            });
            setIsLoading(false);
            // Refresh counter from server after stream ends
            fetch(`${API_URL}/api/v1/demo/status`)
              .then((r) => r.json())
              .then((s: StatusData) => {
                setMessagesRemaining(s.messages_remaining);
                setLimitReached(s.limit_reached);
              })
              .catch(() => {});
            break outer;
          }

          if (data.type === "error") {
            streamingRef.current = "";
            if (data.limit_reached) {
              setLimitReached(true);
              setMessagesRemaining(0);
              // Pop the empty streaming row
              setMessages((prev) => {
                const next = [...prev];
                if (next[next.length - 1]?.isStreaming) next.pop();
                return next;
              });
            } else {
              const errText =
                typeof data.message === "string"
                  ? data.message
                  : "Something went wrong. Please try again.";
              setMessages((prev) => {
                const next = [...prev];
                const last = next[next.length - 1];
                if (last?.role === "assistant" && last.isStreaming) {
                  next[next.length - 1] = { role: "assistant", content: errText, isError: true };
                  return next;
                }
                return [...prev, { role: "assistant", content: errText, isError: true }];
              });
            }
            setIsLoading(false);
            break outer;
          }
        }
      }

      // Stream closed without explicit `done` event — settle whatever we have
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        if (last?.role === "assistant" && last.isStreaming) {
          next[next.length - 1] = {
            role: "assistant",
            content: last.content,
            routedTo: pendingRoutedTo.current ?? undefined,
          };
        }
        return next;
      });
      streamingRef.current = "";
      setIsLoading(false);
    } catch {
      setMessages((prev) => {
        const next = [...prev];
        const last = next[next.length - 1];
        const errMsg = { role: "assistant" as const, content: "Something went wrong. Please try again.", isError: true };
        if (last?.role === "assistant" && last.isStreaming) {
          next[next.length - 1] = errMsg;
          return next;
        }
        return [...prev, errMsg];
      });
      streamingRef.current = "";
      setIsLoading(false);
    }
  };

  // ── Derived UI values ────────────────────────────────────────────────────
  const remaining = messagesRemaining ?? 3;
  const counterColor =
    remaining >= 3 ? "#22c55e" :
    remaining === 2 ? "#22c55e" :
    remaining === 1 ? "#f59e0b" :
    "#ef4444";

  const isEmpty = messages.length === 0;
  const messagesStyle: React.CSSProperties = compact
    ? { height: "320px" }
    : { flex: 1, minHeight: 0 };

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: DEMO_CSS }} />

      {/* Card */}
      <div
        className={`overflow-hidden rounded-[20px] ${compact ? "" : "flex flex-col"}`}
        style={{
          border: "1px solid rgba(139,92,246,0.3)",
          background: "rgba(0,0,0,0.88)",
          ...(compact ? {} : { height: "100%" }),
        }}
      >
        {/* ── Window chrome ─────────────────────────────────────────────── */}
        <div
          className="flex shrink-0 items-center justify-between border-b px-4 py-3"
          style={{
            borderColor: "rgba(255,255,255,0.06)",
            background: "rgba(255,255,255,0.02)",
          }}
        >
          {/* Traffic lights */}
          <div className="flex items-center gap-2" aria-hidden="true">
            {["#ff5f57", "#ffbd2e", "#28c840"].map((c) => (
              <div key={c} className="h-3 w-3 rounded-full" style={{ background: c, opacity: 0.75 }} />
            ))}
          </div>

          {/* Prism mark + title */}
          <div className="flex items-center gap-2">
            <div
              className="flex h-5 w-5 items-center justify-center rounded text-[10px] font-black text-white"
              style={{ background: "linear-gradient(135deg, #8b5cf6, #06b6d4)" }}
              aria-hidden="true"
            >
              P
            </div>
            <span className="text-[12px] font-medium text-white/35">Prism Demo</span>
          </div>

          {/* Messages remaining counter */}
          <div className="text-right">
            {statusLoading ? (
              <span className="text-[11px] text-white/25">—</span>
            ) : limitReached ? (
              <span className="text-[11px] font-semibold text-red-400">Limit reached</span>
            ) : (
              <span className="text-[11px] font-semibold tabular-nums" style={{ color: counterColor }}>
                {remaining} msg{remaining !== 1 ? "s" : ""} left
              </span>
            )}
          </div>
        </div>

        {/* ── Messages area ─────────────────────────────────────────────── */}
        <div
          ref={messagesScrollRef}
          className="dm-scroll flex flex-col gap-3 overflow-y-auto overflow-x-hidden p-5"
          style={messagesStyle}
          aria-live="polite"
          aria-label="Chat messages"
          role="log"
        >
          {/* Cold-start / waking up state */}
          {statusLoading && backendWaking && (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 py-12 text-center">
              <div
                className="h-5 w-5 rounded-full border-2 border-violet-500/30 border-t-violet-400"
                style={{ animation: "dm-spin 0.9s linear infinite" }}
                aria-hidden="true"
              />
              <p className="text-[13px] text-white/40">Waking up the backend…</p>
              <p className="text-[11px] text-white/25">First request may take ~30 s on cold start</p>
            </div>
          )}

          {/* Empty / welcome state */}
          {!statusLoading && isEmpty && (
            <div className="flex flex-col gap-3">
              {/* Welcome bubble */}
              <div className="flex flex-col items-start gap-1">
                <div className="flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-400" aria-hidden="true" />
                  <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/35">
                    PRISM
                  </span>
                </div>
                <div
                  className="px-4 py-2.5 text-[13px] leading-relaxed text-white/82"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.08)",
                    borderRadius: "18px 18px 18px 4px",
                  }}
                >
                  Hi! I&apos;m Prism — an AI copilot that routes every message to the best
                  specialist model automatically. Ask me anything: code, writing, research.
                  You have {remaining} free message{remaining !== 1 ? "s" : ""}.
                </div>
              </div>

              {/* Suggested prompt chips */}
              <div className="mt-2 flex flex-wrap gap-2">
                {SUGGESTED_PROMPTS.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => sendMessage(prompt)}
                    disabled={isLoading || limitReached}
                    className="rounded-full border px-3 py-1.5 text-[12px] text-white/55 transition-all hover:border-violet-500/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                    style={{
                      borderColor: "rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.02)",
                    }}
                  >
                    ✦ {prompt}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Message list */}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex shrink-0 flex-col ${msg.role === "user" ? "items-end" : "items-start"}`}
            >
              {msg.role === "user" ? (
                <div
                  className="max-w-[80%] px-4 py-2.5 text-[13px] leading-relaxed text-white"
                  style={{
                    background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
                    borderRadius: "18px 18px 4px 18px",
                  }}
                >
                  {msg.content}
                </div>
              ) : (
                <div className="max-w-[85%] min-w-0">
                  {/* PRISM label */}
                  <div className="mb-1 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" aria-hidden="true" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/35">
                      PRISM
                    </span>
                  </div>

                  {/* Bubble */}
                  <div
                    className="px-4 py-2.5 text-[13px] leading-relaxed"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: `1px solid ${msg.isError ? "rgba(239,68,68,0.35)" : "rgba(255,255,255,0.08)"}`,
                      borderRadius: "18px 18px 18px 4px",
                      color: msg.isError ? "rgba(239,68,68,0.85)" : "rgba(255,255,255,0.82)",
                    }}
                  >
                    {msg.isStreaming && !msg.content ? (
                      /* Thinking dots */
                      <div className="flex items-center gap-1 py-0.5" aria-label="Thinking…">
                        {[0, 1, 2].map((j) => (
                          <div
                            key={j}
                            className="h-1.5 w-1.5 rounded-full bg-white/40"
                            style={{ animation: `dm-bounce 1s ease-in-out ${j * 0.2}s infinite` }}
                          />
                        ))}
                      </div>
                    ) : msg.isStreaming ? (
                      /* Streaming cursor */
                      <>
                        {msg.content}
                        <span
                          className="dm-cursor ml-0.5 inline-block h-3.5 w-px align-middle bg-violet-400"
                          aria-hidden="true"
                        />
                      </>
                    ) : (
                      msg.content
                    )}
                  </div>

                  {/* Routing badge — appears after stream completes */}
                  <AnimatePresence>
                    {!msg.isStreaming && msg.routedTo && !msg.isError && (
                      <motion.div
                        key="badge"
                        initial={{ opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.28, delay: 0.08 }}
                        className="mt-1.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-medium"
                        style={{
                          background: "rgba(139,92,246,0.1)",
                          border: "1px solid rgba(139,92,246,0.25)",
                          color: "rgba(139,92,246,0.8)",
                        }}
                      >
                        <span aria-hidden="true">✦</span>
                        Auto-routed to {msg.routedTo}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* ── Limit-reached CTA ─────────────────────────────────────────── */}
        <AnimatePresence>
          {limitReached && (
            <motion.div
              key="cta"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.45, type: "spring", bounce: 0.3 }}
              className="shrink-0 p-5 text-center"
              style={{
                background: "rgba(139,92,246,0.07)",
                borderTop: "1px solid rgba(139,92,246,0.22)",
              }}
            >
              <p className="mb-1 text-[14px] font-semibold text-white">
                ✦ You&apos;ve used all 3 demo messages.
              </p>
              <p className="mb-4 text-[13px] text-white/45">Sign up free to get:</p>
              <ul className="mb-5 inline-flex flex-col items-start gap-1.5">
                {CTA_BULLETS.map((b) => (
                  <li key={b} className="flex items-center gap-2 text-[13px] text-white/60">
                    <Check size={12} className="text-violet-400 shrink-0" aria-hidden="true" />
                    {b}
                  </li>
                ))}
              </ul>
              <br />
              {/* Opens in new tab so it escapes any iframe */}
              <a
                href={`${APP_URL}/login`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
                style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
              >
                Get Full Access →
                <ArrowRight size={13} aria-hidden="true" />
              </a>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── Input row ─────────────────────────────────────────────────── */}
        {!limitReached && (
          <div
            className="flex shrink-0 items-end gap-3 px-4 py-3"
            style={{
              borderTop: "1px solid rgba(255,255,255,0.06)",
              background: "rgba(255,255,255,0.02)",
            }}
          >
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void sendMessage();
                }
              }}
              onInput={(e) => {
                const t = e.currentTarget;
                t.style.height = "auto";
                t.style.height = `${Math.min(t.scrollHeight, 96)}px`;
              }}
              placeholder="Ask me anything…"
              rows={1}
              disabled={isLoading || statusLoading}
              aria-label="Chat message input"
              className="flex-1 resize-none bg-transparent text-[14px] text-white outline-none placeholder:text-white/25 disabled:opacity-50"
              style={{ maxHeight: "96px", lineHeight: "1.5" }}
            />
            <button
              type="button"
              onClick={() => void sendMessage()}
              disabled={!input.trim() || isLoading || limitReached || statusLoading}
              aria-label="Send message"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-all hover:scale-105 hover:shadow-[0_0_12px_rgba(139,92,246,0.5)] disabled:opacity-40 disabled:hover:scale-100 disabled:cursor-not-allowed"
              style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
            >
              {isLoading ? (
                <div
                  className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white"
                  style={{ animation: "dm-spin 0.8s linear infinite" }}
                  aria-hidden="true"
                />
              ) : (
                <ArrowUp size={15} aria-hidden="true" />
              )}
            </button>
          </div>
        )}

        {/* ── Disclaimer ────────────────────────────────────────────────── */}
        <div
          className="shrink-0 px-4 py-2 text-center"
          style={{ borderTop: "1px solid rgba(255,255,255,0.04)" }}
        >
          <p className="text-[10px] text-white/20">
            3 free messages · No signup required · AI may make mistakes
          </p>
        </div>
      </div>
    </>
  );
}
