"use client";

import {
  memo,
  useCallback,
  useMemo,
  useState,
  type CSSProperties,
} from "react";
import type { MouseEvent as ReactMouseEvent } from "react";
import {
  Check,
  Copy,
  Play,
  WrapText,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { supabase } from "@/lib/supabase";

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
  "sh",
  "shell",
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
  isStreaming?: boolean;
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

type SandboxExecuteResponse = {
  stdout?: string;
  stderr?: string;
  exit_code?: number;
  timed_out?: boolean;
};

async function executeSandboxCode(code: string, language: string): Promise<{
  output: string;
  type: "success" | "error";
}> {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { output: "Please log in to run code", type: "error" };
  }

  const response = await fetch(`${API_URL}/api/v1/sandbox/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
    },
    body: JSON.stringify({
      code,
      language: (language || "python").toLowerCase(),
    }),
  });

  if (!response.ok) {
    let detail = "Execution failed";
    try {
      const data = (await response.json()) as {
        detail?: string;
        message?: string;
      };
      detail = data.detail || data.message || detail;
    } catch {
      // Ignore JSON parse errors.
    }
    return { output: detail, type: "error" };
  }

  const result = (await response.json()) as SandboxExecuteResponse;
  if (result.timed_out) {
    return { output: "Execution timed out after 10 seconds", type: "error" };
  }
  const stdout = typeof result.stdout === "string" ? result.stdout.trim() : "";
  const stderr = typeof result.stderr === "string" ? result.stderr.trim() : "";

  if (stderr && !stdout) {
    return { output: stderr, type: "error" };
  }
  if (stdout) {
    const merged = stderr ? `${stdout}\n\n⚠️ Warnings:\n${stderr}` : stdout;
    return { output: merged, type: "success" };
  }
  if (stderr) {
    return { output: stderr, type: "error" };
  }
  if (typeof result.exit_code === "number" && result.exit_code !== 0) {
    return {
      output: `Execution failed (exit code ${result.exit_code})`,
      type: "error",
    };
  }
  return { output: "No output produced", type: "success" };
}

function CodeBlockComponent(props: CodeBlockProps) {
  const { code, language, isStreaming = false } = props;

  const [expanded, setExpanded] = useState(false);
  const [wordWrap, setWordWrap] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string | null>(null);
  const [outputType, setOutputType] = useState<"success" | "error" | null>(null);

  const lines = useMemo(() => code.split("\n"), [code]);
  const totalLines = lines.length;
  const needsCollapse = totalLines > LINE_COLLAPSE_THRESHOLD;

  const displayCode = useMemo(() => {
    if (!needsCollapse || expanded) return code;
    return lines.slice(0, LINE_COLLAPSE_THRESHOLD).join("\n");
  }, [code, expanded, lines, needsCollapse]);

  const prismLanguage = mapPrismLanguage(language);
  const label = badgeLabel(language);
  const canRun = isRunnableLanguage(language);

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
    setIsRunning(true);
    setOutput(null);
    setOutputType(null);
    try {
      const result = await executeSandboxCode(code, runLang);
      setOutput(result.output);
      setOutputType(result.type);
    } catch (e) {
      setOutput(`Error: ${(e as Error)?.message || "Something went wrong"}`);
      setOutputType("error");
    } finally {
      setIsRunning(false);
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
        output ? "rounded-t-lg" : "rounded-lg"
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
          {canRun && (
            <button
              type="button"
              onClick={handleRun}
              disabled={isRunning}
              title="Run code"
              className="flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-green-400/70 transition-all duration-150 hover:bg-green-400/10 hover:text-green-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isRunning ? (
                <div
                  className="h-3 w-3 animate-spin rounded-full border border-green-400/40 border-t-green-400"
                  aria-hidden
                />
              ) : (
                <Play size={12} />
              )}
              <span>{isRunning ? "Running..." : "Run"}</span>
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
        {isStreaming ? (
          <pre
            className="overflow-x-auto p-4 text-sm text-white/80"
            style={{
              background: "#282c34",
              maxHeight: codeMaxHeight,
              overflowY: "auto",
              whiteSpace: wordWrap ? "pre-wrap" : "pre",
              wordBreak: wordWrap ? "break-word" : "normal",
            }}
          >
            <code>{displayCode}</code>
          </pre>
        ) : (
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
        )}

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
        {output !== null && outputType && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`overflow-hidden border-t border-white/5 ${
              outputType === "error"
                ? "border-l-2 border-l-red-500/50 bg-red-500/5"
                : "border-l-2 border-l-green-500/50 bg-green-500/5"
            }`}
          >
            <div>
              <div className="flex items-center justify-between px-4 py-2">
                <span
                  className={`text-xs font-medium ${
                    outputType === "error" ? "text-red-400" : "text-green-400"
                  }`}
                >
                  {outputType === "error" ? "✗ Error" : "▶ Output"}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setOutput(null);
                    setOutputType(null);
                  }}
                  className="text-xs text-white/20 transition-colors hover:text-white/50"
                >
                  ✕
                </button>
              </div>
              <pre className="max-h-52 overflow-y-auto whitespace-pre-wrap break-words px-4 pb-4 font-mono text-sm text-white/80">
                {output}
              </pre>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export const CodeBlock = memo(
  CodeBlockComponent,
  (prev, next) =>
    prev.code === next.code &&
    prev.language === next.language &&
    prev.conversationId === next.conversationId &&
    prev.isStreaming === next.isStreaming
);
