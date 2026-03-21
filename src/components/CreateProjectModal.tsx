"use client";

import React, { useEffect, useState } from "react";
import { X } from "lucide-react";
import { createProject, updateProject, PROJECT_COLORS } from "@/lib/projects";
import type { Project } from "@/lib/projects";

interface CreateProjectModalProps {
  /** When provided the modal operates in edit mode. */
  project?: Project;
  onClose: () => void;
  onSaved: (project: Project) => void;
}

export function CreateProjectModal({ project, onClose, onSaved }: CreateProjectModalProps) {
  const isEdit = !!project;

  const [name, setName]               = useState(project?.name ?? "");
  const [description, setDescription] = useState(project?.description ?? "");
  const [instructions, setInstructions] = useState(project?.instructions ?? "");
  const [color, setColor]             = useState(project?.color ?? PROJECT_COLORS[0]);
  const [isSaving, setIsSaving]       = useState(false);
  const [error, setError]             = useState("");

  /* Re-sync fields when the project prop changes (e.g. modal re-opens). */
  useEffect(() => {
    if (project) {
      setName(project.name);
      setDescription(project.description ?? "");
      setInstructions(project.instructions ?? "");
      setColor(project.color);
    }
  }, [project]);

  /* Close on Escape key. */
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) { setError("Project name is required."); return; }
    setError("");
    setIsSaving(true);
    try {
      const saved = isEdit
        ? await updateProject(project!.id, { name: name.trim(), description, instructions, color })
        : await createProject({ name: name.trim(), description, instructions, color });
      onSaved(saved);
    } catch {
      setError("Failed to save project. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9500] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(6px)" }}
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="relative w-full overflow-hidden rounded-2xl"
        style={{
          maxWidth: "480px",
          background: "rgba(10,10,15,0.97)",
          border: "1px solid rgba(139,92,246,0.25)",
          boxShadow: "0 0 60px rgba(0,0,0,0.6)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-4" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <h2 className="text-[16px] font-bold text-white">
            {isEdit ? "Edit Project" : "New Project"}
          </h2>
          <button
            onClick={onClose}
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white"
          >
            <X size={15} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          {/* Project name */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-white/40">
              Project Name <span className="text-violet-400">*</span>
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pharma Content Q1"
              className="w-full rounded-xl px-4 py-2.5 text-[14px] text-white outline-none transition-all placeholder:text-white/25"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
              autoFocus
            />
          </div>

          {/* Description */}
          <div>
            <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-widest text-white/40">
              Description <span className="text-white/20">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project about?"
              rows={2}
              className="w-full resize-none rounded-xl px-4 py-2.5 text-[14px] text-white outline-none transition-all placeholder:text-white/25"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
            />
          </div>

          {/* Color picker */}
          <div>
            <label className="mb-2 block text-[11px] font-semibold uppercase tracking-widest text-white/40">
              Project Color
            </label>
            <div className="flex items-center gap-3">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="relative flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110"
                  style={{ background: c }}
                >
                  {color === c && (
                    <span
                      className="absolute inset-0 rounded-full"
                      style={{ boxShadow: `0 0 0 2px #000, 0 0 0 4px ${c}` }}
                    />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Instructions */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="text-[11px] font-semibold uppercase tracking-widest text-white/40">
                Instructions <span className="text-white/20">(optional)</span>
              </label>
              <span className="text-[11px] text-white/25">{instructions.length}/1000</span>
            </div>
            <textarea
              value={instructions}
              onChange={(e) => setInstructions(e.target.value.slice(0, 1000))}
              placeholder={`Custom instructions for this project...\nThese will be injected into every conversation linked to this project.`}
              rows={4}
              className="w-full resize-none rounded-xl px-4 py-2.5 text-[14px] text-white outline-none transition-all placeholder:text-white/25"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}
              onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)")}
              onBlur={(e) => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
            />
          </div>

          {error && <p className="text-[12px] text-red-400">{error}</p>}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 cursor-pointer rounded-xl py-2.5 text-[14px] font-medium text-white/50 transition-colors hover:bg-white/[0.06]"
              style={{ border: "1px solid rgba(255,255,255,0.1)" }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="flex-1 cursor-pointer rounded-xl py-2.5 text-[14px] font-semibold text-white transition-all hover:opacity-90 disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
            >
              {isSaving ? "Saving…" : isEdit ? "Save Changes" : "Create Project"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
