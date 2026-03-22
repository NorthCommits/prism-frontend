"use client";

import {
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  Check,
  Copy,
  Loader2,
  Play,
  WrapText,
  X,
  XCircle,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

import { createClient } from "@/lib/supabase";
import type { HistoryMessage } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const LINE_COLLAPSE_THRESHOLD = 20;
const COLLAPSED_MAX_PX = 320;

const RUNNABLE_LANGUAGES = new Set([
  "python",
  "javascript",
  "typescript",
  "bash",
  "js",
  "ts",
  "py",
]);

const LINE_NUMBER_STYLE: CSSProperties = {
  color: "rgba(255,255,255,0.2)",
  paddingRight: "16px",
  borderRight: "1px solid rgba(255,255,255,0.06)",
  marginRight: "16px",
};

type CodeBlockProps = {
  code: string;
  language: string;
  conversationId?: string | null;
};

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

function mapPrismLanguage(lang: string): string {
  const lower = lang.toLowerCase();
  const aliases: Record<string, string> = {
    js: "javascript",
    ts: "typescript",
    py: "python",
    sh: "bash",
    shell: "bash",
  };
  if (!lower || lower === "text") return "markup";
  return aliases[lower] ?? lower;
}

function badgeLabel(lang: string): string {
  const lower = lang.toLowerCase();
  if (!lower || lower === "text") return "code";
  return lower;
}

function normalizeRunLanguage(lang: string): string {
  const lower = lang.toLowerCase();
  if (lower === "js") return "javascript";
  if (lower === "ts") return "typescript";
  if (lower === "py") return "python";
  return lower;
}

function isRunnableLanguage(lang: string): boolean {
  return RUNNABLE_LANGUAGES.has(lang.toLowerCase());
}

async function postRunCodeMessage(message: string): Promise<
  | { ok: true; text: string }
  | { ok: false; error: string }
> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (session?.access_token) {
    headers.Authorization = `Bearer ${session.access_token}`;
  }

  const body: Record<string, unknown> = {
    message,
    model_id: "auto",
    conversation_history: [] as HistoryMessage[],
    user_id: session?.user?.id,
  };

  const response = await fetch(`${API_URL}/api/v1/chat`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    let detail = "Request failed";
    try {
      const data = (await response.json()) as {
        detail?: string;
        message?: string;
      };
      detail = data.detail || data.message || detail;
    } catch {
      // Ignore JSON parse errors.
    }
    return { ok: false, error: detail };
  }

  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = (await response.json()) as { reply?: string };
    return { ok: true, text: data.reply ?? "" };
  }

  if (!contentType.includes("text/event-stream")) {
    return {
      ok: false,
      error: `Unexpected response: ${contentType || "unknown"}`,
    };
  }

  const reader = response.body?.getReader();
  if (!reader) {
    return { ok: false, error: "No response body" };
  }

  const decoder = new TextDecoder();
  let buffer = "";
  let accumulated = "";
  let streamError: string | null = null;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;

      try {
        const event = JSON.parse(raw) as {
          type: string;
          content?: string;
          message?: string;
        };

        if (event.type === "token" && typeof event.content === "string") {
          accumulated += event.content;
        } else if (event.type === "error") {
          streamError = event.message || "Something went wrong";
        }
      } catch {
        // Ignore malformed SSE JSON lines.
      }
    }
  }

  const tail = buffer.trim();
  if (tail.startsWith("data: ")) {
    const raw = tail.slice(6).trim();
    if (raw) {
      try {
        const event = JSON.parse(raw) as {
          type: string;
          content?: string;
          message?: string;
        };
        if (event.type === "token" && typeof event.content === "string") {
          accumulated += event.content;
        } else if (event.type === "error") {
          streamError = event.message || "Something went wrong";
        }
      } catch {
        // Ignore.
      }
    }
  }

  if (streamError) {
    return { ok: false, error: streamError };
  }
  return { ok: true, text: accumulated };
}

export function CodeBlock(props: CodeBlockProps) {
  const { code, language } = props;

  const [expanded, setExpanded] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);
  const [copied, setCopied] = useState(false);
  const [runLoading, setRunLoading] = useState(false);
  const [runOutput, setRunOutput] = useState<{
    text: string;
    isError: boolean;
  } | null>(null);

  const lines = useMemo(() => code.split("\n"), [code]);
  const totalLines = lines.length;
  const needsCollapse = totalLines > LINE_COLLAPSE_THRESHOLD;

  const displayCode = useMemo(() => {
    if (!needsCollapse || expanded) return code;
    return lines.slice(0, LINE_COLLAPSE_THRESHOLD).join("\n");
  }, [code, expanded, lines, needsCollapse]);

  const prismLanguage = mapPrismLanguage(language);
  const label = badgeLabel(language);
  const showRun = isRunnableLanguage(language);

  const handleCopy = async (event: ReactMouseEvent<HTMLButtonElement>) => {
    try {
      spawnRipple(event.currentTarget, event.clientX, event.clientY);
      await window.navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 500);
    } catch {
      // Ignore clipboard errors.
    }
  };

  const handleRun = useCallback(async () => {
    const runLang = normalizeRunLanguage(language);
    const message = `Run this ${runLang} code:\n\`\`\`${runLang}\n${code}\n\`\`\``;
    setRunLoading(true);
    setRunOutput(null);
    try {
      const result = await postRunCodeMessage(message);
      if (result.ok) {
        setRunOutput({ text: result.text.trim() || "(no output)", isError: false });
      } else {
        setRunOutput({ text: result.error, isError: true });
      }
    } catch (e) {
      setRunOutput({
        text: (e as Error)?.message || "Something went wrong",
        isError: true,
      });
    } finally {
      setRunLoading(false);
    }
  }, [code, language]);

  const codeMaxHeight =
    needsCollapse && !expanded
      ? COLLAPSED_MAX_PX
      : "min(70vh, 560px)";

  const highlighterCustomStyle: CSSProperties = {
    margin: 0,
    padding: "16px",
    background: "#282c34",
    borderRadius: 0,
    fontSize: "13px",
    maxHeight: codeMaxHeight,
    overflowY: "auto",
    overflowX: wordWrap ? "hidden" : "auto",
    whiteSpace: wordWrap ? "pre-wrap" : "pre",
    wordBreak: wordWrap ? "break-word" : "normal",
  };

  return (
    <div
      className={`relative mb-3 overflow-hidden font-mono text-sm ${
        runOutput ? "rounded-t-lg" : "rounded-lg"
      }`}
    >
      <div
        className="flex h-9 shrink-0 items-center justify-between rounded-t-lg border-b border-[rgba(255,255,255,0.06)] px-3"
        style={{ background: "rgba(255,255,255,0.04)" }}
      >
        <span
          className="rounded border border-[rgba(255,255,255,0.08)] px-2 py-0.5 font-mono text-[11px] lowercase"
          style={{
            background: "rgba(255,255,255,0.06)",
            color: "rgba(255,255,255,0.4)",
          }}
        >
          {label}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            title="Toggle word wrap"
            onClick={() => setWordWrap((w) => !w)}
            className={`relative inline-flex h-7 w-7 items-center justify-center rounded transition-colors ${
              wordWrap
                ? "text-white/80 bg-white/10"
                : "text-white/50 hover:bg-white/10 hover:text-white/80"
            }`}
          >
            <WrapText className="size-3.5" aria-hidden />
          </button>
          {showRun && (
            <button
              type="button"
              onClick={handleRun}
              disabled={runLoading}
              className="relative inline-flex items-center gap-1 rounded px-2 py-1 text-xs text-[rgba(34,197,94,0.7)] transition-colors hover:text-[rgba(34,197,94,1)] disabled:opacity-60"
            >
              {runLoading ? (
                <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
              ) : (
                <Play className="size-3.5 shrink-0" aria-hidden />
              )}
              <span>Run</span>
            </button>
          )}
          <button
            type="button"
            onClick={handleCopy}
            title={copied ? "Copied" : "Copy code"}
            className="relative inline-flex items-center gap-1 overflow-hidden rounded px-2 py-1 text-xs text-white/50 transition-colors hover:bg-white/10 hover:text-white/80"
          >
            <span
              className="relative inline-flex size-3.5 items-center justify-center"
              style={{ color: copied ? "rgb(34,197,94)" : undefined }}
            >
              <Copy
                className={`absolute inset-0 transition-opacity duration-200 ${
                  copied ? "opacity-0" : "opacity-100"
                }`}
                aria-hidden
              />
              <Check
                className={`absolute inset-0 transition-opacity duration-200 ${
                  copied ? "opacity-100" : "opacity-0"
                }`}
                aria-hidden
              />
            </span>
            <AnimatePresence mode="wait">
              {copied && (
                <motion.span
                  key="copied"
                  initial={{ opacity: 0, x: -4 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -4 }}
                  transition={{ duration: 0.15 }}
                  className="text-[11px] font-medium"
                  style={{ color: "rgb(34,197,94)" }}
                >
                  Copied!
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </div>

      <div className="relative">
        <SyntaxHighlighter
          style={oneDark}
          language={prismLanguage}
          PreTag="div"
          showLineNumbers
          lineNumberStyle={LINE_NUMBER_STYLE}
          customStyle={highlighterCustomStyle}
        >
          {displayCode}
        </SyntaxHighlighter>

        {needsCollapse && !expanded && (
          <>
            <div
              className="pointer-events-none absolute bottom-0 left-0 right-0 h-16"
              style={{
                background:
                  "linear-gradient(to bottom, transparent, rgba(40,44,52,0.97))",
              }}
              aria-hidden
            />
            <div className="absolute bottom-2 left-0 right-0 flex justify-center">
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/60 backdrop-blur-sm transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white/90"
              >
                Show more ({totalLines} lines)
              </button>
            </div>
          </>
        )}

        {needsCollapse && expanded && (
          <div className="flex justify-center pb-2 pt-1">
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-white/60 transition-colors hover:border-white/20 hover:bg-white/10 hover:text-white/90"
            >
              Show less
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {runOutput && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div
              className="relative border border-t-0 px-4 py-3 font-mono text-[13px] leading-relaxed"
              style={{
                background: "rgba(0,0,0,0.4)",
                borderColor: runOutput.isError
                  ? "rgba(239,68,68,0.2)"
                  : "rgba(34,197,94,0.2)",
                borderLeftWidth: 3,
                borderLeftStyle: "solid",
                borderLeftColor: runOutput.isError ? "#ef4444" : "#22c55e",
                borderRadius: "0 0 8px 8px",
                maxHeight: 200,
                overflowY: "auto",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
              }}
            >
              <button
                type="button"
                onClick={() => setRunOutput(null)}
                className="absolute right-2 top-2 rounded p-1 text-white/40 transition-colors hover:bg-white/10 hover:text-white/80"
                aria-label="Dismiss output"
              >
                <X className="size-3.5" />
              </button>
              <div
                className="mb-2 flex items-center gap-1 pr-8 text-[11px] font-semibold uppercase tracking-wide"
                style={{
                  color: runOutput.isError ? "#ef4444" : "#22c55e",
                }}
              >
                {runOutput.isError ? (
                  <>
                    <XCircle className="size-3.5 shrink-0" aria-hidden />
                    <span>Error</span>
                  </>
                ) : (
                  <>
                    <Play className="size-3.5 shrink-0" aria-hidden />
                    <span>Output</span>
                  </>
                )}
              </div>
              <div className="text-white/85">{runOutput.text}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
