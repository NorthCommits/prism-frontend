"use client";

import React, { useEffect, useRef, useState } from "react";
import { Check, FolderOpen, Loader2, Plus } from "lucide-react";
import Link from "next/link";
import { getProjects } from "@/lib/projects";
import type { Project } from "@/lib/projects";
import { Haptics } from "@/lib/haptics";

interface ProjectPickerProps {
  activeProjectId: string | null;
  onSelect: (project: Project | null) => void;
  onClose: () => void;
}

export function ProjectPicker({ activeProjectId, onSelect, onClose }: ProjectPickerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const ref = useRef<HTMLDivElement>(null);

  /* Fetch projects on open. */
  useEffect(() => {
    (async () => {
      try {
        const data = await getProjects();
        setProjects(data);
      } catch { /* silent */ }
      finally { setIsLoading(false); }
    })();
  }, []);

  /* Close when clicking outside the popup. */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("mousedown", handler);
    return () => window.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full mb-2 w-[280px] overflow-hidden rounded-xl shadow-2xl"
      style={{
        background: "rgba(10,10,18,0.97)",
        border: "1px solid rgba(139,92,246,0.25)",
        backdropFilter: "blur(16px)",
        animation: "fadeSlideUp 0.15s ease-out",
      }}
    >
      {/* Header */}
      <div className="border-b px-4 py-3" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
        <p className="text-[13px] font-semibold text-white">Link to Project</p>
        <p className="text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
          Responses will use project context
        </p>
      </div>

      {/* Currently active project unlink row */}
      {activeProjectId && (
        <button
          onClick={() => {
            Haptics.press();
            onSelect(null);
            onClose();
          }}
          className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
          style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}
        >
          <span className="text-[12px] text-violet-400">✓ Currently linked — click to unlink</span>
        </button>
      )}

      {/* Project list */}
      <div className="max-h-[220px] overflow-y-auto py-1">
        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 size={16} className="animate-spin text-white/30" />
          </div>
        ) : projects.length === 0 ? (
          <div className="px-4 py-5 text-center">
            <FolderOpen size={24} className="mx-auto mb-2 text-white/20" />
            <p className="text-[12px] text-white/30">No projects yet</p>
            <Link
              href="/projects"
              onClick={onClose}
              className="mt-2 inline-block text-[12px] text-violet-400 hover:text-violet-300"
            >
              Create Project →
            </Link>
          </div>
        ) : (
          projects.map((p) => {
            const isActive = p.id === activeProjectId;
            return (
              <button
                key={p.id}
                onClick={() => {
                  Haptics.press();
                  onSelect(isActive ? null : p);
                  onClose();
                }}
                className="flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-white/[0.05]"
              >
                <span
                  className="mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full"
                  style={{ background: p.color }}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-white">{p.name}</p>
                  <p className="truncate text-[11px]" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {p.file_count} file{p.file_count !== 1 ? "s" : ""}
                    {p.description ? ` · ${p.description}` : ""}
                  </p>
                </div>
                {isActive && <Check size={14} className="shrink-0 text-violet-400" />}
              </button>
            );
          })
        )}
      </div>

      {/* Footer — quick link to create */}
      {!isLoading && projects.length > 0 && (
        <div className="border-t px-4 py-2.5" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <Link
            href="/projects"
            onClick={onClose}
            className="flex items-center gap-1.5 text-[12px] text-white/35 transition-colors hover:text-white/60"
          >
            <Plus size={12} />
            Manage projects
          </Link>
        </div>
      )}

      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
