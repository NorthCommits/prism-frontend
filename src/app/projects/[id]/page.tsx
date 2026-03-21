"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  FileText,
  FolderOpen,
  MessageSquare,
  Pencil,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  deleteProject,
  deleteProjectFile,
  formatFileSize,
  getProject,
  getProjectConversations,
  updateProject,
  uploadProjectFile,
} from "@/lib/projects";
import type { Project, ProjectFile } from "@/lib/projects";
import { CreateProjectModal } from "@/components/CreateProjectModal";

/* Map file extension → colour for the file icon. */
function fileIconColor(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (ext === "pdf")  return "#ef4444";
  if (ext === "docx") return "#3b82f6";
  if (ext === "csv" || ext === "xlsx") return "#22c55e";
  if (["py", "js", "ts"].includes(ext)) return "#eab308";
  if (ext === "json") return "#f97316";
  return "#9ca3af"; // gray for txt/md/html/other
}

const MAX_STORAGE = 25 * 1024 * 1024; // 25 MB in bytes

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [project, setProject]             = useState<Project | null>(null);
  const [files, setFiles]                 = useState<ProjectFile[]>([]);
  const [conversations, setConversations] = useState<{ id: string; title: string; updated_at: string }[]>([]);
  const [isLoading, setIsLoading]         = useState(true);
  const [showEdit, setShowEdit]           = useState(false);

  /* Inline name editing */
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameValue, setNameValue]         = useState("");

  /* Instructions auto-save */
  const [instructions, setInstructions]   = useState("");
  const [savedIndicator, setSavedIndicator] = useState(false);

  /* File upload */
  const fileInputRef  = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging]       = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadError, setUploadError]     = useState("");

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [proj, convs] = await Promise.all([
        getProject(id),
        getProjectConversations(id),
      ]);
      setProject(proj);
      setFiles(proj.files ?? []);
      setNameValue(proj.name);
      setInstructions(proj.instructions ?? "");
      setConversations(convs);
    } catch {
      router.push("/projects");
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  /* Save instructions on blur. */
  const handleInstructionsBlur = async () => {
    if (!project || instructions === project.instructions) return;
    try {
      const updated = await updateProject(id, { instructions });
      setProject(updated);
      setSavedIndicator(true);
      window.setTimeout(() => setSavedIndicator(false), 1800);
    } catch { /* ignore */ }
  };

  /* Save name on Enter or blur. */
  const commitName = async () => {
    setIsEditingName(false);
    if (!project || !nameValue.trim() || nameValue === project.name) return;
    try {
      const updated = await updateProject(id, { name: nameValue.trim() });
      setProject(updated);
    } catch { setNameValue(project.name); }
  };

  /* Upload a single file with progress. */
  const handleFileUpload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024) { setUploadError("File exceeds 5 MB limit."); return; }
    setUploadError("");
    setUploadProgress(0);
    try {
      const newFile = await uploadProjectFile(id, file, (pct) => setUploadProgress(pct));
      setFiles((prev) => [...prev, newFile]);
      setProject((prev) =>
        prev
          ? { ...prev, file_count: prev.file_count + 1, total_size: prev.total_size + file.size }
          : prev
      );
    } catch (e) {
      setUploadError((e as Error).message || "Upload failed.");
    } finally {
      setUploadProgress(null);
    }
  };

  const handleDeleteFile = async (fileId: string, fileSize: number) => {
    try {
      await deleteProjectFile(id, fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setProject((prev) =>
        prev
          ? { ...prev, file_count: prev.file_count - 1, total_size: prev.total_size - fileSize }
          : prev
      );
    } catch { /* ignore */ }
  };

  const handleDeleteProject = async () => {
    if (!window.confirm("Delete this project and all its files?")) return;
    try { await deleteProject(id); router.push("/projects"); } catch { /* ignore */ }
  };

  if (isLoading || !project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-violet-500" />
      </div>
    );
  }

  const usedPct = Math.min((project.total_size / MAX_STORAGE) * 100, 100);
  const storageColor = usedPct >= 95 ? "#ef4444" : usedPct >= 80 ? "#f59e0b" : "#8b5cf6";

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center gap-4 border-b border-border bg-background/80 px-6 py-3 backdrop-blur">
        <Link href="/projects" className="text-[13px] text-muted-foreground hover:text-foreground">
          ← Projects
        </Link>
        <span className="text-border">/</span>
        <span
          className="h-3 w-3 shrink-0 rounded-full"
          style={{ background: project.color }}
        />
        {isEditingName ? (
          <input
            autoFocus
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitName}
            onKeyDown={(e) => { if (e.key === "Enter") commitName(); if (e.key === "Escape") { setIsEditingName(false); setNameValue(project.name); } }}
            className="rounded bg-muted px-2 py-0.5 text-[15px] font-bold text-foreground outline-none focus:ring-2 focus:ring-violet-500"
          />
        ) : (
          <h1
            className="cursor-pointer text-[15px] font-bold text-foreground hover:text-violet-400"
            onClick={() => setIsEditingName(true)}
            title="Click to rename"
          >
            {project.name}
          </h1>
        )}
        <div className="ml-auto flex items-center gap-2">
          <button
            onClick={() => setShowEdit(true)}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <Pencil size={12} /> Edit
          </button>
          <button
            onClick={handleDeleteProject}
            className="flex cursor-pointer items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-medium text-red-500 transition-colors hover:bg-red-500/10"
          >
            <Trash2 size={12} /> Delete
          </button>
        </div>
      </header>

      {/* Two-panel layout */}
      <div className="mx-auto flex max-w-6xl gap-6 p-6">
        {/* ── Left panel: files + instructions ── */}
        <div className="w-80 shrink-0 space-y-5">
          {/* Instructions */}
          <section className="rounded-2xl border border-border bg-card p-5 dark:bg-[#0d0b1a]">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Project Instructions
              </h2>
              {savedIndicator && (
                <span className="text-[11px] font-medium text-emerald-500">Saved ✓</span>
              )}
            </div>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              onBlur={handleInstructionsBlur}
              placeholder={"Add instructions for this project...\ne.g. Always respond in the context of our pharma content workflow. Use formal language."}
              rows={5}
              className="w-full resize-none rounded-xl bg-muted/30 px-3 py-2.5 text-[13px] text-foreground outline-none transition-all placeholder:text-muted-foreground focus:ring-2 focus:ring-violet-500/50"
            />
          </section>

          {/* Files */}
          <section className="rounded-2xl border border-border bg-card p-5 dark:bg-[#0d0b1a]">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                Files{" "}
                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">
                  {project.file_count}
                </span>
              </h2>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex cursor-pointer items-center gap-1 rounded-lg px-2.5 py-1 text-[12px] font-medium text-violet-400 transition-colors hover:bg-violet-500/10"
              >
                <Upload size={12} /> Upload
              </button>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setIsDragging(false);
                const f = e.dataTransfer.files[0];
                if (f) handleFileUpload(f);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={`mb-3 flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed py-5 transition-colors ${
                isDragging
                  ? "border-violet-500 bg-violet-500/10"
                  : "border-border hover:border-violet-500/40 hover:bg-muted/30"
              }`}
            >
              <Upload size={18} className="mb-1.5 text-muted-foreground/50" />
              <p className="text-[12px] text-muted-foreground">Drop files or click to upload</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground/50">
                PDF · DOCX · TXT · MD · CSV · XLSX · JSON · PY · JS · TS
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              accept=".pdf,.docx,.txt,.md,.csv,.xlsx,.json,.html,.py,.js,.ts"
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }}
            />

            {/* Upload progress */}
            {uploadProgress !== null && (
              <div className="mb-3">
                <div className="mb-1 flex justify-between text-[11px] text-muted-foreground">
                  <span>Uploading…</span>
                  <span>{Math.round(uploadProgress)}%</span>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-violet-500 transition-all"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}
            {uploadError && (
              <p className="mb-2 text-[12px] text-red-400">{uploadError}</p>
            )}

            {/* File list */}
            <div className="space-y-1.5">
              {files.map((file) => (
                <div key={file.id} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 hover:bg-muted/40">
                  <FileText size={14} style={{ color: fileIconColor(file.file_name) }} className="shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[12px] font-medium text-foreground">{file.file_name}</p>
                    <p className="text-[10px] text-muted-foreground">{formatFileSize(file.file_size)}</p>
                  </div>
                  <button
                    onClick={() => handleDeleteFile(file.id, file.file_size)}
                    className="flex cursor-pointer items-center justify-center rounded text-muted-foreground/50 transition-colors hover:text-red-400"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              ))}
              {files.length === 0 && (
                <p className="py-3 text-center text-[12px] text-muted-foreground/50">
                  No files yet
                </p>
              )}
            </div>

            {/* Storage bar */}
            <div className="mt-4 border-t border-border pt-3">
              <div className="mb-1.5 flex justify-between text-[11px] text-muted-foreground">
                <span>{formatFileSize(project.total_size)} / 25 MB used</span>
                <span>{Math.round(usedPct)}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${usedPct}%`, background: storageColor }}
                />
              </div>
            </div>
          </section>
        </div>

        {/* ── Right panel: linked conversations ── */}
        <div className="flex-1">
          <section className="rounded-2xl border border-border bg-card p-6 dark:bg-[#0d0b1a]">
            <h2 className="mb-4 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              Linked Conversations
            </h2>

            {conversations.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <MessageSquare size={40} className="mb-3 text-muted-foreground/25" />
                <p className="mb-1 text-[14px] font-semibold text-foreground">
                  No conversations linked yet
                </p>
                <p className="mb-5 text-[13px] text-muted-foreground">
                  Start a chat and link it to this project.
                </p>
                <Link
                  href="/"
                  className="inline-flex items-center gap-2 rounded-full px-5 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
                  style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
                >
                  Start New Conversation →
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {conversations.map((conv) => (
                  <Link
                    key={conv.id}
                    href={`/?conversation=${conv.id}`}
                    className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors hover:bg-muted/50"
                  >
                    <FolderOpen size={15} style={{ color: project.color }} className="shrink-0" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] font-medium text-foreground">{conv.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {new Date(conv.updated_at).toLocaleDateString()}
                      </p>
                    </div>
                    <X size={12} className="shrink-0 text-muted-foreground/30" />
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>
      </div>

      {showEdit && (
        <CreateProjectModal
          project={project}
          onClose={() => setShowEdit(false)}
          onSaved={(updated) => { setProject(updated); setShowEdit(false); }}
        />
      )}
    </div>
  );
}
