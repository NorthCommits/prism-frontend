"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  ArrowUpRight,
  Loader2,
  Paperclip,
  X,
  FileText,
  FileSpreadsheet,
  FileCode,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import type { AvailableModel, ModelId, ParsedFile } from "../lib/api";
import { parseFile } from "../lib/api";

type AttachedFile = ParsedFile & {
  status: "idle" | "parsing" | "error";
};

type ChatInputProps = {
  onSend: (
    message: string,
    file?: { file_name: string; file_type: string; file_content: string }
  ) => void;
  isLoading: boolean;
  value: string;
  onChangeValue: (value: string) => void;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  currentModel: ModelId | null;
  modelsById?: Record<ModelId, AvailableModel>;
};

export function ChatInput({
  onSend,
  isLoading,
  value,
  onChangeValue,
  inputRef,
  currentModel,
}: ChatInputProps) {
  const internalRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaRef = inputRef ?? internalRef;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);

  // Resize textarea as the user types for better multi-line experience.
  const autoResize = () => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const maxHeight = 5 * 24;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  };

  useEffect(() => {
    autoResize();
  }, [value]);

  const handleSubmit = (event?: FormEvent) => {
    if (event) {
      event.preventDefault();
    }
    const trimmed = value.trim();
    if (!trimmed || isLoading) return;
    if (attachedFile && attachedFile.status === "idle") {
      onSend(trimmed, {
        file_name: attachedFile.file_name,
        file_type: attachedFile.file_type,
        file_content: attachedFile.content,
      });
      setAttachedFile(null);
    } else {
      onSend(trimmed);
    }
    onChangeValue("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      handleSubmit();
    }
  };

  const isDisabled = isLoading || value.trim().length === 0;

  const handleFileChange = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const next: AttachedFile = {
      file_name: file.name,
      file_type: file.type || "application/octet-stream",
      content: "",
      status: "parsing",
    };
    setAttachedFile(next);
    try {
      const parsed = await parseFile(file);
      setAttachedFile({
        ...parsed,
        status: "idle",
      });
    } catch {
      setAttachedFile((current) =>
        current
          ? {
              ...current,
              status: "error",
            }
          : null
      );
    } finally {
      // Allow re-uploading the same file name.
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const handleRemoveFile = () => {
    setAttachedFile(null);
  };

  const renderFileIcon = (fileName?: string) => {
    if (!fileName) return <FileText className="size-3.5" />;
    const lower = fileName.toLowerCase();
    if (lower.endsWith(".csv") || lower.endsWith(".xlsx")) {
      return <FileSpreadsheet className="size-3.5" />;
    }
    if (
      [".py", ".js", ".ts", ".jsx", ".tsx"].some((ext) =>
        lower.endsWith(ext)
      )
    ) {
      return <FileCode className="size-3.5" />;
    }
    return <FileText className="size-3.5" />;
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="pointer-events-auto border-t bg-background/80 backdrop-blur"
    >
      <div className="mx-auto flex w-full max-w-2xl items-end gap-2.5 px-4 py-4">
        <div className="flex-1 rounded-2xl border bg-card/95 px-3.5 py-2.5 shadow-lg">
          {attachedFile && (
            <div
              className={`mb-2 inline-flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-1.5 text-[11px] ${
                attachedFile.status === "error"
                  ? "border-red-500/40 bg-red-500/10 text-red-500"
                  : "border-[#7c3aed33] bg-[#f5f3ff] text-foreground dark:bg-[#1f1633]"
              }`}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-[#7c3aed] dark:text-[#c4b5fd]">
                  {renderFileIcon(attachedFile.file_name)}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {attachedFile.file_name.length > 30
                      ? `${attachedFile.file_name.slice(0, 30)}...`
                      : attachedFile.file_name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {attachedFile.status === "parsing"
                      ? "Parsing file..."
                      : attachedFile.status === "error"
                      ? "Failed to parse"
                      : "Attached file"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveFile}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-transparent text-muted-foreground hover:border-border hover:bg-background"
                aria-label="Remove file"
              >
                <X className="size-3" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-muted-foreground hover:border-border hover:bg-background/60"
              aria-label="Attach file"
            >
              <Paperclip className="size-4" />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".txt,.md,.py,.js,.ts,.jsx,.tsx,.csv,.xlsx"
              onChange={handleFileChange}
            />
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChangeValue(event.target.value)}
            onKeyDown={handleKeyDown}
            rows={1}
            placeholder="Message Prism..."
            className="flex w-full resize-none bg-transparent text-[15px] leading-relaxed text-foreground placeholder:text-[15px] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed] focus-visible:ring-offset-0"
          />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-[#7c3aed33] bg-background/80 px-3 py-1 text-[11px] text-muted-foreground">
            <span className="inline-flex size-2 rounded-full bg-emerald-500" />
            <span>
              {currentModel === "coding"
                ? "Coding Assistant"
                : currentModel === "writing"
                ? "Writing Assistant"
                : "Auto"}
            </span>
          </div>
          <Button
            type="submit"
            size="icon"
            disabled={isDisabled}
            aria-label="Send message"
            className="shrink-0 bg-gradient-to-r from-[#7c3aed] via-[#2563eb] to-[#06b6d4] text-white hover:brightness-110"
          >
            {isLoading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ArrowUpRight className="size-4" />
            )}
          </Button>
        </div>
      </div>
      <div className="mx-auto w-full max-w-2xl px-4 pb-2 text-[10px] text-muted-foreground">
        Prism can make mistakes. Verify important info.
      </div>
    </form>
  );
}

