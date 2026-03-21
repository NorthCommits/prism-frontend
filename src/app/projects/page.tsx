"use client";

import React, { useCallback, useEffect, useState } from "react";
import { FolderOpen, FolderPlus, MoreHorizontal, Plus, Trash2, Pencil } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  deleteProject,
  formatFileSize,
  getProjects,
} from "@/lib/projects";
import type { Project } from "@/lib/projects";
import { CreateProjectModal } from "@/components/CreateProjectModal";

export default function ProjectsPage() {
  const router = useRouter();
  const [projects, setProjects]       = useState<Project[]>([]);
  const [isLoading, setIsLoading]     = useState(true);
  const [showCreate, setShowCreate]   = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);
  const [menuOpenId, setMenuOpenId]   = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try { setProjects(await getProjects()); } catch { /* ignore */ }
    finally { setIsLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  /* Close any open menu when clicking elsewhere. */
  useEffect(() => {
    const handler = () => setMenuOpenId(null);
    window.addEventListener("click", handler);
    return () => window.removeEventListener("click", handler);
  }, []);

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this project and all its files? This cannot be undone.")) return;
    try {
      await deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch { /* ignore */ }
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-border bg-background/80 px-6 py-4 backdrop-blur">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="text-[13px] text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Back to Chat
          </Link>
          <span className="text-border">/</span>
          <h1 className="text-[16px] font-bold text-foreground">Projects</h1>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
          style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
        >
          <Plus size={14} />
          New Project
        </button>
      </header>

      <main className="mx-auto max-w-6xl px-6 py-8">
        {isLoading ? (
          /* Skeleton grid */
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-44 animate-pulse rounded-2xl border border-border bg-muted/30"
              />
            ))}
          </div>
        ) : projects.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <FolderPlus size={56} className="mb-4 text-muted-foreground/30" />
            <h2 className="mb-2 text-[18px] font-bold text-foreground">No projects yet</h2>
            <p className="mb-6 max-w-sm text-[14px] text-muted-foreground">
              Create a project to organise your conversations and upload reference files.
            </p>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex cursor-pointer items-center gap-2 rounded-full px-6 py-2.5 text-[14px] font-semibold text-white transition-opacity hover:opacity-85"
              style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
            >
              <Plus size={15} />
              Create Your First Project
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-shadow hover:shadow-lg dark:bg-[#0d0b1a]"
              >
                {/* Color bar */}
                <div className="h-1 w-full" style={{ background: project.color }} />

                <div className="flex flex-1 flex-col p-5">
                  {/* Icon + three-dot menu */}
                  <div className="mb-3 flex items-start justify-between">
                    <FolderOpen
                      size={28}
                      style={{ color: project.color }}
                      className="shrink-0"
                    />
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === project.id ? null : project.id);
                        }}
                        className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 hover:bg-muted"
                      >
                        <MoreHorizontal size={15} />
                      </button>
                      {menuOpenId === project.id && (
                        <div
                          className="absolute right-0 top-full z-20 mt-1 w-36 overflow-hidden rounded-xl border border-border bg-popover shadow-xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => { setEditProject(project); setMenuOpenId(null); }}
                            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-[13px] text-foreground transition-colors hover:bg-muted"
                          >
                            <Pencil size={13} /> Edit
                          </button>
                          <button
                            onClick={() => handleDelete(project.id)}
                            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2.5 text-[13px] text-red-500 transition-colors hover:bg-red-500/10"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Name + description */}
                  <h3 className="mb-1 text-[15px] font-bold text-foreground">{project.name}</h3>
                  {project.description && (
                    <p className="mb-3 line-clamp-2 text-[13px] text-muted-foreground">
                      {project.description}
                    </p>
                  )}

                  {/* Stats */}
                  <p className="mt-auto text-[12px] text-muted-foreground">
                    {project.file_count} file{project.file_count !== 1 ? "s" : ""} ·{" "}
                    {formatFileSize(project.total_size)}
                  </p>

                  {/* Open button */}
                  <button
                    onClick={() => router.push(`/projects/${project.id}`)}
                    className="mt-3 w-full cursor-pointer rounded-xl py-2 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
                    style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
                  >
                    Open
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Create modal */}
      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onSaved={(p) => {
            setShowCreate(false);
            router.push(`/projects/${p.id}`);
          }}
        />
      )}

      {/* Edit modal */}
      {editProject && (
        <CreateProjectModal
          project={editProject}
          onClose={() => setEditProject(null)}
          onSaved={(updated) => {
            setProjects((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
            setEditProject(null);
          }}
        />
      )}
    </div>
  );
}
