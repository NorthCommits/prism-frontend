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
  BookOpen,
  CheckSquare,
  FileCode,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  ImageIcon,
  LucideProps,
  Lightbulb,
  Paperclip,
  Search,
  Sparkles,
  X,
} from "lucide-react";
import { ProjectPicker } from "@/components/ProjectPicker";
import type { Project } from "@/lib/projects";

// Maps the icon name strings returned by the backend to Lucide components.
const ICON_MAP: Record<string, React.ComponentType<LucideProps>> = {
  Lightbulb,
  Search,
  CheckSquare,
  FileText,
  Sparkles,
  BookOpen,
};

import { Button } from "@/components/ui/button";
import type { AvailableModel, ModelId, ParsedFile } from "../lib/api";
import { parseFile } from "../lib/api";
import { getTemplates, Template } from "../lib/templates";
import { useToast } from "@/components/Toast";

type AttachedFile = ParsedFile & {
  status: "idle" | "parsing" | "error";
};

type AttachedImage = {
  base64: string;
  mediaType: string;
  // Full data-URL used as the thumbnail src; not sent to the API.
  preview: string;
  name: string;
};

type ChatInputProps = {
  onSend: (
    message: string,
    file?: { file_name: string; file_type: string; file_content: string },
    image?: { base64: string; mediaType: string },
    // Template id for the backend and a pre-formatted display label.
    template?: { id: string; label: string }
  ) => void;
  isLoading: boolean;
  /** Last sent user message for ArrowUp history navigation. */
  lastSentMessage?: string | null;
  value: string;
  onChangeValue: (value: string) => void;
  inputRef?: React.RefObject<HTMLTextAreaElement | null>;
  currentModel: ModelId | null;
  modelsById?: Record<ModelId, AvailableModel>;
  /** Currently linked project — null means no project linked. */
  activeProject?: Project | null;
  onActiveProjectChange?: (project: Project | null) => void;
};

export function ChatInput({
  onSend,
  isLoading,
  lastSentMessage,
  value,
  onChangeValue,
  inputRef,
  currentModel,
  activeProject,
  onActiveProjectChange,
}: ChatInputProps) {
  const internalRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaRef = inputRef ?? internalRef;
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const slashPopupRef = useRef<HTMLDivElement | null>(null);

  const [attachedFile, setAttachedFile] = useState<AttachedFile | null>(null);
  const [attachedImage, setAttachedImage] = useState<AttachedImage | null>(null);

  // Project picker popup visibility.
  const [showProjectPicker, setShowProjectPicker] = useState(false);

  // Prompt template state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [activeTemplate, setActiveTemplate] = useState<Template | null>(null);
  // When true the popup is suppressed even if the value starts with "/".
  const [slashMenuHidden, setSlashMenuHidden] = useState(false);
  const [slashHighlightIdx, setSlashHighlightIdx] = useState(0);

  const { addToast } = useToast();
  const [historyNavActive, setHistoryNavActive] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [isInputShaking, setIsInputShaking] = useState(false);
  const [isSuccessFlash, setIsSuccessFlash] = useState(false);
  const prevIsLoadingRef = useRef<boolean>(isLoading);

  // Fetch templates once on mount.
  useEffect(() => {
    getTemplates().then(setTemplates).catch(() => {});
  }, []);

  // ── Slash command derived state ──────────────────────────────────────────

  const slashIsActive = value.startsWith("/") && !value.includes(" ");
  const slashQuery = slashIsActive ? value.slice(1).toLowerCase() : "";

  const filteredTemplates = slashIsActive
    ? slashQuery === ""
      ? templates
      : templates.filter(
          (t) =>
            t.command.replace(/^\//, "").startsWith(slashQuery) ||
            t.title.toLowerCase().startsWith(slashQuery)
        )
    : [];

  // Keep highlight index in bounds after filtering.
  const clampedIdx = Math.min(slashHighlightIdx, Math.max(0, filteredTemplates.length - 1));
  const slashMenuOpen = slashIsActive && filteredTemplates.length > 0 && !slashMenuHidden;

  // Reset hidden flag and highlight whenever the user types.
  useEffect(() => {
    setSlashMenuHidden(false);
    setSlashHighlightIdx(0);
  }, [value]);

  // Scroll the highlighted row into view during keyboard navigation.
  useEffect(() => {
    if (!slashPopupRef.current || !slashMenuOpen) return;
    const el = slashPopupRef.current.querySelector<HTMLElement>(`[data-idx="${clampedIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [clampedIdx, slashMenuOpen]);

  // Applies a template: stores it as active, clears the slash input, closes the popup.
  const selectTemplate = (template: Template) => {
    setActiveTemplate(template);
    setSlashMenuHidden(true);
    onChangeValue("");
  };

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

  useEffect(() => {
    const prev = prevIsLoadingRef.current;
    prevIsLoadingRef.current = isLoading;

    // Success flash after streaming completes.
    if (prev && !isLoading) {
      setIsSuccessFlash(true);
      window.setTimeout(() => setIsSuccessFlash(false), 300);
    }
  }, [isLoading]);

  const handleSubmit = (event?: FormEvent) => {
    if (event) {
      event.preventDefault();
    }
    const trimmed = value.trim();
    if (isLoading) return;
    if (!trimmed) {
      setIsInputShaking(true);
      window.setTimeout(() => setIsInputShaking(false), 450);
      return;
    }
    const imagePayload = attachedImage
      ? { base64: attachedImage.base64, mediaType: attachedImage.mediaType }
      : undefined;

    // Build the template payload: id for the backend, pre-formatted label for display.
    const templatePayload = activeTemplate
      ? { id: activeTemplate.id, label: `${activeTemplate.icon} ${activeTemplate.title}` }
      : undefined;

    if (attachedFile && attachedFile.status === "idle") {
      onSend(
        trimmed,
        {
          file_name: attachedFile.file_name,
          file_type: attachedFile.file_type,
          file_content: attachedFile.content,
        },
        imagePayload,
        templatePayload
      );
      setAttachedFile(null);
    } else {
      onSend(trimmed, undefined, imagePayload, templatePayload);
    }
    setAttachedImage(null);
    setActiveTemplate(null);
    onChangeValue("");
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    // Slash-command popup captures arrow keys, Enter, and Escape first.
    if (slashMenuOpen) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setSlashHighlightIdx((i) => Math.min(i + 1, filteredTemplates.length - 1));
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setSlashHighlightIdx((i) => Math.max(i - 1, 0));
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        const tpl = filteredTemplates[clampedIdx];
        if (tpl) selectTemplate(tpl);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setSlashMenuHidden(true);
        return;
      }
    }

    if (event.key === "ArrowUp") {
      if (lastSentMessage && !isLoading) {
        event.preventDefault();
        onChangeValue(lastSentMessage);
        setHistoryNavActive(true);
      }
      return;
    }

    if (event.key === "ArrowDown") {
      if (historyNavActive && !isLoading) {
        event.preventDefault();
        onChangeValue("");
        setHistoryNavActive(false);
      }
      return;
    }

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
    const fileName = file.name;
    const next: AttachedFile = {
      file_name: fileName,
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
      addToast(`File ready · ${fileName}`, "info");
    } catch {
      setAttachedFile((current) =>
        current
          ? {
              ...current,
              status: "error",
            }
          : null
      );
      addToast("File parse failed", "error");
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

  const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5 MB

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > MAX_IMAGE_BYTES) {
      addToast("Image must be under 5 MB", "error");
      if (event.target) event.target.value = "";
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      // Split "data:<mediaType>;base64,<base64data>" to extract parts.
      const [header, base64] = dataUrl.split(",");
      const mediaType = header.replace("data:", "").replace(";base64", "");
      setAttachedImage({
        base64,
        mediaType,
        preview: dataUrl,
        name: file.name,
      });
      addToast(`Image ready · ${file.name}`, "info");
    };
    reader.readAsDataURL(file);

    // Allow re-selecting the same file.
    if (event.target) event.target.value = "";
  };

  const handleRemoveImage = () => {
    setAttachedImage(null);
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
      className="pointer-events-none bg-transparent"
    >
      <div className="pointer-events-auto mx-auto flex w-full max-w-2xl items-end gap-2.5 py-4">
        {/*
          relative so the slash popup can use absolute positioning inside this box
          and match its width exactly. Frosted glass lives on the pill only.
        */}
        <div
          className="relative flex-1 rounded-2xl border border-border/60 bg-card/90 px-3.5 py-2.5 shadow-lg backdrop-blur-[20px] [-webkit-backdrop-filter:blur(20px)] dark:border-[rgba(255,255,255,0.08)] dark:bg-[rgba(15,15,20,0.8)]"
        >

          {/* Slash-command popup */}
          {slashMenuOpen && (
            <div
              ref={slashPopupRef}
              className="absolute bottom-full left-0 right-0 mb-2 max-h-80 overflow-y-auto rounded-2xl border bg-background/95 shadow-xl backdrop-blur-sm animate-[spring-in_180ms_cubic-bezier(0.16,1,0.3,1)_forwards]"
              style={{ zIndex: 50 }}
            >
              <p className="sticky top-0 border-b bg-background/95 px-3 py-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground/60">
                Prompt Templates
              </p>
              {filteredTemplates.map((tpl, idx) => (
                <button
                  key={tpl.id}
                  type="button"
                  data-idx={idx}
                  // onMouseDown + preventDefault keeps textarea focused so blur
                  // doesn't fire and close the menu before the click registers.
                  onMouseDown={(e) => {
                    e.preventDefault();
                    selectTemplate(tpl);
                  }}
                  className={`flex w-full cursor-pointer items-start gap-3 px-3 py-2.5 text-left transition-colors ${
                    idx === clampedIdx
                      ? "bg-[#7c3aed]/10 dark:bg-[#7c3aed]/15"
                      : "hover:bg-muted/50"
                  }`}
                >
                  {(() => {
                    const IconComponent = ICON_MAP[tpl.icon];
                    return (
                      <span
                        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 ${
                          idx === clampedIdx
                            ? "text-purple-300"
                            : "text-purple-400"
                        }`}
                      >
                        {IconComponent ? (
                          <IconComponent size={16} />
                        ) : (
                          // Fallback for unknown icon names.
                          <span className="text-xs">{tpl.icon}</span>
                        )}
                      </span>
                    );
                  })()}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <code className="text-xs font-medium text-[#7c3aed] dark:text-[#c4b5fd]">
                        {tpl.command}
                      </code>
                      <span className="text-xs font-medium text-foreground">
                        {tpl.title}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {tpl.description}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Active template chip */}
          {activeTemplate && (
            <div className="mb-2 prism-file-chip-appear inline-flex w-full items-center justify-between gap-2 rounded-xl border border-[#7c3aed]/30 bg-gradient-to-r from-[#7c3aed]/10 to-[#2563eb]/10 px-3 py-1.5 text-[11px] text-foreground dark:from-[#7c3aed]/15 dark:to-[#2563eb]/15">
              <div className="flex min-w-0 items-center gap-2">
                {(() => {
                  const IconComponent = ICON_MAP[activeTemplate.icon];
                  return (
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
                      {IconComponent ? (
                        <IconComponent size={16} />
                      ) : (
                        <span className="text-xs">{activeTemplate.icon}</span>
                      )}
                    </span>
                  );
                })()}
                <div className="min-w-0">
                  <p className="truncate font-medium">{activeTemplate.title}</p>
                  <p className="text-[10px] text-muted-foreground">Prompt template active</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveTemplate(null)}
                className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full border border-transparent text-muted-foreground hover:border-border hover:bg-background"
                aria-label="Remove template"
              >
                <X className="size-3" />
              </button>
            </div>
          )}

          {/* Image preview chip */}
          {attachedImage && (
            <div className="mb-2 prism-file-chip-appear inline-flex w-full items-center justify-between gap-2 rounded-xl border border-[#7c3aed33] bg-[#f5f3ff] px-2 py-1.5 text-[11px] text-foreground dark:bg-[#1f1633]">
              <div className="flex min-w-0 items-center gap-2">
                {/* Thumbnail — data: URI; next/image cannot optimise these */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={attachedImage.preview}
                  alt="Preview"
                  className="h-10 w-10 shrink-0 rounded-lg object-cover"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">
                    {attachedImage.name.length > 20
                      ? `${attachedImage.name.slice(0, 20)}…`
                      : attachedImage.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground">Image attached</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleRemoveImage}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-transparent text-muted-foreground hover:border-border hover:bg-background"
                aria-label="Remove image"
              >
                <X className="size-3" />
              </button>
            </div>
          )}

          {/* Active project chip */}
          {activeProject && (
            <div className="mb-2 prism-file-chip-appear inline-flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-1.5 text-[11px] text-foreground"
              style={{ borderColor: `${activeProject.color}33`, background: `${activeProject.color}11` }}
            >
              <div className="flex min-w-0 items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: activeProject.color }} />
                <div className="min-w-0">
                  <p className="truncate font-medium">{activeProject.name}</p>
                  <p className="text-[10px] text-muted-foreground">Project context active</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onActiveProjectChange?.(null)}
                className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-transparent text-muted-foreground hover:border-border hover:bg-background"
                aria-label="Unlink project"
              >
                <X className="size-3" />
              </button>
            </div>
          )}

          {/* Document / file chip */}
          {attachedFile && (
            <div
              className={`mb-2 prism-file-chip-appear inline-flex w-full items-center justify-between gap-2 rounded-xl border px-3 py-1.5 text-[11px] ${
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
            <button
              type="button"
              onClick={() => imageInputRef.current?.click()}
              className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent text-muted-foreground hover:border-border hover:bg-background/60"
              aria-label="Attach image"
            >
              <ImageIcon className="size-4" />
            </button>
            <input
              ref={imageInputRef}
              type="file"
              className="hidden"
              accept="image/png,image/jpeg,image/jpg,image/webp,image/gif"
              onChange={handleImageChange}
            />

            {/* Project picker toggle */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowProjectPicker((v) => !v)}
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full border border-transparent transition-colors hover:border-border hover:bg-background/60 ${activeProject ? "text-foreground" : "text-muted-foreground"}`}
                aria-label="Link to Project"
                title="Link to Project"
              >
                {activeProject ? (
                  <span className="relative">
                    <FolderOpen className="size-4" />
                    <span
                      className="absolute -right-0.5 -top-0.5 h-1.5 w-1.5 rounded-full"
                      style={{ background: activeProject.color }}
                    />
                  </span>
                ) : (
                  <FolderOpen className="size-4" />
                )}
              </button>
              {showProjectPicker && (
                <ProjectPicker
                  activeProjectId={activeProject?.id ?? null}
                  onSelect={(p) => { onActiveProjectChange?.(p); }}
                  onClose={() => setShowProjectPicker(false)}
                />
              )}
            </div>
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(event) => onChangeValue(event.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() =>
              // Short delay so onMouseDown on popup rows fires before blur hides the menu.
              window.setTimeout(() => setSlashMenuHidden(true), 150)
            }
            rows={1}
            placeholder="Message Prism..."
            className={`flex w-full resize-none bg-transparent text-[15px] leading-relaxed text-foreground placeholder:text-[15px] placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#7c3aed] focus-visible:ring-offset-0 focus-visible:shadow-[0_0_0_3px_rgba(124,58,237,0.1)] ${
              isInputShaking
                ? "prism-warp-chat-shake ring-2 ring-red-500/50 shadow-[0_0_0_3px_rgba(239,68,68,0.12)]"
                : ""
            }`}
          />
          </div>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/70 px-3 py-1 text-[11px] text-muted-foreground backdrop-blur-md [-webkit-backdrop-filter:blur(12px)] dark:border-white/[0.1] dark:bg-[rgba(15,15,20,0.65)]">
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
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            onMouseLeave={() => setIsPressed(false)}
            className={`shrink-0 bg-gradient-to-r from-[#7c3aed] via-[#2563eb] to-[#06b6d4] text-white transition-all duration-150 hover:scale-[1.08] hover:shadow-[0_0_30px_rgba(124,58,237,0.55)] shadow-[0_0_20px_rgba(124,58,237,0.4)] ${
              isLoading ? "prism-btn-gradient-anim prism-btn-loading-pulse" : ""
            } ${isSuccessFlash ? "prism-btn-success-flash" : ""} ${
              isPressed && !isLoading ? "prism-send-pop-trigger" : ""
            }`}
          >
            {isLoading ? <X className="size-4" /> : <ArrowUpRight className="size-4" />}
          </Button>
        </div>
      </div>
      <div className="pointer-events-auto mx-auto w-full max-w-2xl pb-1 text-center text-[10px] text-muted-foreground/80 drop-shadow-sm">
        Prism can make mistakes. Verify important info.
      </div>
    </form>
  );
}

