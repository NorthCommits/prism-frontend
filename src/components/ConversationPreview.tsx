"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { getConversationMessages } from "@/lib/history";

interface ConversationPreviewProps {
  conversation: {
    id: string;
    title: string;
    updated_at: string;
  };
  anchorRect: DOMRect;
  onClose: () => void;
}

const messageCache = new Map<string, string>();

function stripMarkdown(text: string): string {
  return text
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/`(.*?)`/g, "$1")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/^\s*[-*+]\s/gm, "• ")
    .trim();
}

function formatDateLabel(input: string): string {
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const now = new Date();
  const isToday = d.toDateString() === now.toDateString();
  if (isToday) {
    return `Today at ${d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  }
  return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

export function ConversationPreview(props: ConversationPreviewProps) {
  const { conversation, anchorRect, onClose } = props;
  const [content, setContent] = useState<string>("");
  const [loading, setLoading] = useState(true);

  const pos = useMemo(() => {
    if (typeof window === "undefined") {
      return { left: 0, top: 0 };
    }
    const width = 280;
    const maxHeight = 240;
    const left = anchorRect.right + 8;
    const unclampedTop = anchorRect.top;
    const top = Math.max(0, Math.min(unclampedTop, window.innerHeight - maxHeight));
    const finalLeft = Math.min(left, window.innerWidth - width - 8);
    return { left: finalLeft, top };
  }, [anchorRect]);

  useEffect(() => {
    let cancelled = false;
    const cached = messageCache.get(conversation.id);
    if (cached != null) {
      setContent(cached);
      setLoading(false);
      return;
    }
    setLoading(true);
    void (async () => {
      try {
        const msgs = await getConversationMessages(conversation.id);
        if (cancelled) return;
        const lastAssistant = [...msgs].reverse().find((m) => m.role === "assistant");
        const clean = stripMarkdown(lastAssistant?.content ?? "").slice(0, 300);
        messageCache.set(conversation.id, clean);
        setContent(clean);
      } catch {
        if (!cancelled) setContent("");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [conversation.id]);

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8, scale: 0.97 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: -8, scale: 0.97 }}
      transition={{ type: "spring", duration: 0.15 }}
      className="fixed z-[200] w-[280px] overflow-hidden rounded-xl border p-4 shadow-[0_8px_32px_rgba(0,0,0,0.5),0_0_0_1px_rgba(139,92,246,0.1)] backdrop-blur-[20px]"
      style={{
        left: pos.left,
        top: pos.top,
        maxHeight: 240,
        background: "rgba(10,10,15,0.97)",
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div
        className="pointer-events-none absolute left-[-6px] top-5 h-0 w-0 border-[6px] border-transparent"
        style={{ borderRightColor: "rgba(255,255,255,0.08)" }}
      />

      <p className="truncate text-[13px] font-semibold text-white">{conversation.title}</p>
      <p className="mt-0.5 text-[11px] text-white/35">{formatDateLabel(conversation.updated_at)}</p>
      <div className="my-2 h-px bg-white/10" />

      {loading ? (
        <div className="space-y-1.5">
          <div className="h-3 animate-pulse rounded bg-white/10" />
          <div className="h-3 animate-pulse rounded bg-white/10" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-white/10" />
        </div>
      ) : content ? (
        <p className="line-clamp-5 text-[12px] leading-6 text-white/60">{content}</p>
      ) : (
        <p className="text-[12px] italic text-white/35">No messages yet</p>
      )}

      <p className="mt-3 text-[10px] text-white/40">Click to open</p>
    </motion.div>
  );
}

