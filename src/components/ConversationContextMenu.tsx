"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  ChevronRight,
  Link2,
  Pin,
  Pencil,
  Trash2,
  Upload,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Conversation } from "@/lib/history";
import type { Project } from "@/lib/projects";

export type ConversationContextMenuProps = {
  open: boolean;
  conversation: Conversation | null;
  anchor: DOMRect | null;
  projects: Project[];
  isPinned: boolean;
  onClose: () => void;
  onPin: () => void;
  onRename: () => void;
  onExport: () => void;
  onLinkProject: (projectId: string | null) => void;
  onDelete: () => void;
};

export function ConversationContextMenu({
  open,
  conversation,
  anchor,
  projects,
  isPinned,
  onClose,
  onPin,
  onRename,
  onExport,
  onLinkProject,
  onDelete,
}: ConversationContextMenuProps) {
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [projectsOpen, setProjectsOpen] = useState(false);

  const dismiss = useCallback(() => {
    setProjectsOpen(false);
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") dismiss();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, dismiss]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent | TouchEvent) => {
      const el = menuRef.current;
      const target = e.target as Node;
      if (el && !el.contains(target)) {
        dismiss();
      }
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("touchstart", onDown);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("touchstart", onDown);
    };
  }, [open, dismiss]);

  const positionStyle: React.CSSProperties = {};
  if (anchor) {
    const menuWidth = 240;
    const estHeight = 280;
    let top = anchor.bottom + 8;
    let left = anchor.left;
    if (left + menuWidth > window.innerWidth - 8) {
      left = Math.max(8, window.innerWidth - menuWidth - 8);
    }
    if (top + estHeight > window.innerHeight - 8) {
      top = Math.max(8, anchor.top - estHeight - 8);
    }
    positionStyle.top = top;
    positionStyle.left = left;
  }

  const itemClass =
    "flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm text-white/90 transition-colors hover:bg-violet-500/15";

  return (
    <AnimatePresence>
      {open && conversation && anchor && (
        <motion.div
          ref={menuRef}
          role="menu"
          aria-label="Conversation actions"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 420, damping: 30 }}
          className="fixed z-[80] min-w-[220px] max-w-[min(280px,calc(100vw-16px))] overflow-hidden rounded-xl border border-white/10 bg-zinc-950/95 shadow-xl backdrop-blur-xl"
          style={positionStyle}
        >
          <button type="button" role="menuitem" className={itemClass} onClick={onPin}>
            <Pin className="size-4 shrink-0 text-violet-300" />
            {isPinned ? "Unpin conversation" : "Pin conversation"}
          </button>
          <button type="button" role="menuitem" className={itemClass} onClick={onRename}>
            <Pencil className="size-4 shrink-0 text-violet-300" />
            Rename
          </button>
          <div className="border-t border-white/5">
            <button
              type="button"
              className={`${itemClass} justify-between`}
              onClick={() => setProjectsOpen((v) => !v)}
            >
              <span className="flex items-center gap-3">
                <Link2 className="size-4 shrink-0 text-violet-300" />
                Link to Project
              </span>
              <ChevronRight
                className={`size-4 shrink-0 transition-transform ${projectsOpen ? "rotate-90" : ""}`}
              />
            </button>
            {projectsOpen && (
              <div className="max-h-40 overflow-y-auto border-t border-white/5 bg-black/30 py-1">
                <button
                  type="button"
                  className="w-full px-4 py-2 text-left text-xs text-white/60 hover:bg-violet-500/15"
                  onClick={() => {
                    onLinkProject(null);
                    dismiss();
                  }}
                >
                  None (unlink)
                </button>
                {projects.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="w-full px-4 py-2 text-left text-xs text-white/90 hover:bg-violet-500/15"
                    onClick={() => {
                      onLinkProject(p.id);
                      dismiss();
                    }}
                  >
                    {p.name}
                  </button>
                ))}
              </div>
            )}
          </div>
          <button type="button" role="menuitem" className={itemClass} onClick={onExport}>
            <Upload className="size-4 shrink-0 text-violet-300" />
            Export chat
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${itemClass} text-red-400 hover:bg-red-500/10`}
            onClick={onDelete}
          >
            <Trash2 className="size-4 shrink-0" />
            Delete
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
