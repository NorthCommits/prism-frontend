"use client";

import { useCallback, useState } from "react";
import { motion } from "motion/react";
import { Check, Copy, Download, FileCode, FileText, X } from "lucide-react";
import { CodeBlock } from "@/components/CodeBlock";
import { MarkdownRenderer } from "@/components/MarkdownRenderer";

type Tab = "view" | "edit" | "preview";

const LANGUAGE_EXTENSIONS: Record<string, string> = {
  python: "py",
  py: "py",
  javascript: "js",
  js: "js",
  typescript: "ts",
  ts: "ts",
  jsx: "jsx",
  tsx: "tsx",
  html: "html",
  css: "css",
  markdown: "md",
  md: "md",
  bash: "sh",
  sh: "sh",
  shell: "sh",
  json: "json",
  yaml: "yaml",
  yml: "yml",
  sql: "sql",
  rust: "rs",
  go: "go",
  java: "java",
  c: "c",
  cpp: "cpp",
};

function getFilename(language: string): string {
  const lang = language.toLowerCase();
  const ext = LANGUAGE_EXTENSIONS[lang] ?? "txt";
  return `artifact.${ext}`;
}

function getMimeType(language: string): string {
  const lang = language.toLowerCase();
  if (lang === "html") return "text/html";
  if (lang === "json") return "application/json";
  if (lang === "css") return "text/css";
  if (lang === "markdown" || lang === "md") return "text/markdown";
  return "text/plain";
}

export type ArtifactPanelProps = {
  content: string;
  language: string;
  filename?: string;
  onClose: () => void;
};

const TABS: { id: Tab; label: string }[] = [
  { id: "view", label: "View" },
  { id: "edit", label: "Edit" },
  { id: "preview", label: "Preview" },
];

export function ArtifactPanel({ content, language, filename, onClose }: ArtifactPanelProps) {
  const [activeTab, setActiveTab] = useState<Tab>("view");
  const [editedCode, setEditedCode] = useState(content);
  const [copied, setCopied] = useState(false);

  const derivedFilename = filename ?? getFilename(language);
  const lang = language.toLowerCase();

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(editedCode);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore clipboard errors
    }
  }, [editedCode]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([editedCode], { type: getMimeType(language) });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = derivedFilename;
    a.click();
    URL.revokeObjectURL(url);
  }, [editedCode, derivedFilename, language]);

  const FileIcon = lang === "markdown" || lang === "md" ? FileText : FileCode;

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed right-0 top-0 bottom-0 z-[49] flex flex-col border-l border-[rgba(139,92,246,0.3)] bg-[#f5f3ff] dark:bg-[#0d0b1a] md:w-[45%] max-md:inset-0 max-md:w-full"
    >
      {/* Header */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-[rgba(139,92,246,0.15)] px-4">
        <div className="flex min-w-0 items-center gap-2">
          <FileIcon className="size-4 shrink-0 text-[#7c3aed]" />
          <span className="truncate text-sm font-medium text-foreground">
            {derivedFilename}
          </span>
        </div>
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={handleCopy}
            title="Copy"
            aria-label="Copy code"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[rgba(139,92,246,0.1)] hover:text-foreground"
          >
            {copied ? (
              <Check className="size-4 text-emerald-500" />
            ) : (
              <Copy className="size-4" />
            )}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            title="Download"
            aria-label="Download file"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[rgba(139,92,246,0.1)] hover:text-foreground"
          >
            <Download className="size-4" />
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Close"
            aria-label="Close artifact panel"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-[rgba(139,92,246,0.1)] hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex shrink-0 border-b border-[rgba(139,92,246,0.15)]">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span
                className="absolute inset-x-0 bottom-0 h-[2px] rounded-full"
                style={{ background: "linear-gradient(90deg, #7c3aed, #06b6d4)" }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="min-h-0 flex-1 overflow-auto">
        {activeTab === "view" && (
          <CodeBlock code={content} language={language} />
        )}

        {activeTab === "edit" && (
          <textarea
            value={editedCode}
            onChange={(e) => setEditedCode(e.target.value)}
            className="h-full w-full resize-none bg-[#0d0b1a] p-4 font-mono text-sm text-[rgba(255,255,255,0.85)] outline-none dark:bg-[#080610]"
            spellCheck={false}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
          />
        )}

        {activeTab === "preview" && (
          <div className="h-full">
            {lang === "html" ? (
              <iframe
                srcDoc={editedCode}
                sandbox="allow-scripts"
                className="h-full w-full border-0 bg-white"
                title="HTML Preview"
              />
            ) : lang === "markdown" || lang === "md" ? (
              <div className="p-6">
                <MarkdownRenderer content={editedCode} />
              </div>
            ) : (
              <div className="flex h-full items-center justify-center p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  Live preview is not available for this language. Run it using the code execution button in the message.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </motion.div>
  );
}
