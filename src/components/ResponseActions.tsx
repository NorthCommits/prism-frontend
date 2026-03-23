"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Code2,
  Lightbulb,
  List,
  Loader2,
  Maximize2,
  Minimize2,
  RefreshCw,
} from "lucide-react";
import { Haptics } from "@/lib/haptics";

export interface ResponseActionsProps {
  messageContent: string;
  onAction: (action: string, prompt: string) => void;
  isLastMessage: boolean;
  isStreaming: boolean;
}

type ActionItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  prompt: string;
};

const RESPONSE_ACTIONS: ActionItem[] = [
  {
    id: "continue",
    label: "Continue",
    icon: ArrowRight,
    prompt: "Please continue from where you left off.",
  },
  {
    id: "shorter",
    label: "Make shorter",
    icon: Minimize2,
    prompt:
      "Please rewrite your last response but make it more concise and shorter.",
  },
  {
    id: "longer",
    label: "Make longer",
    icon: Maximize2,
    prompt: "Please expand on your last response with more detail and depth.",
  },
  {
    id: "simpler",
    label: "Simplify",
    icon: Lightbulb,
    prompt:
      "Please rewrite your last response in simpler terms, easier to understand.",
  },
  {
    id: "different",
    label: "Try differently",
    icon: RefreshCw,
    prompt: "Please try a completely different approach to answer my question.",
  },
  {
    id: "examples",
    label: "Add examples",
    icon: Code2,
    prompt: "Please add practical examples to your last response.",
  },
  {
    id: "bullets",
    label: "Use bullets",
    icon: List,
    prompt: "Please rewrite your last response using bullet points and clear structure.",
  },
];

function getRelevantActions(content: string): string[] {
  const wordCount = content.split(/\s+/).filter(Boolean).length;
  const hasCode = content.includes("```");
  const hasBullets = content.includes("- ") || content.includes("• ");
  const actions: string[] = [];

  if (wordCount > 200 || content.trim().endsWith("...")) actions.push("continue");
  if (wordCount > 150) actions.push("shorter");
  if (wordCount < 200) actions.push("longer");
  actions.push("different");
  if (!hasCode) actions.push("examples");
  if (!hasBullets && wordCount > 80) actions.push("bullets");
  actions.push("simpler");
  return actions.slice(0, 5);
}

export function ResponseActions(props: ResponseActionsProps) {
  const { messageContent, onAction, isLastMessage, isStreaming } = props;
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const filtered = useMemo(() => {
    const relevant = new Set(getRelevantActions(messageContent));
    return RESPONSE_ACTIONS.filter((a) => relevant.has(a.id));
  }, [messageContent]);

  useEffect(() => {
    if (!isLastMessage || isStreaming) {
      setVisible(false);
      setActiveAction(null);
      return;
    }
    const t = window.setTimeout(() => setVisible(true), 300);
    return () => window.clearTimeout(t);
  }, [isLastMessage, isStreaming]);

  useEffect(() => {
    if (!visible || filtered.length === 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (isStreaming) return;
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      const n = Number(e.key);
      if (!Number.isInteger(n) || n < 1 || n > 5) return;
      const action = filtered[n - 1];
      if (!action) return;
      e.preventDefault();
      if (activeAction) return;
      Haptics.tap();
      setActiveAction(action.id);
      setVisible(false);
      window.setTimeout(() => onAction(action.id, action.prompt), 180);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, filtered, onAction, activeAction, isStreaming]);

  if (!isLastMessage || isStreaming || filtered.length === 0) return null;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="mt-2 mb-1 flex max-h-[76px] flex-wrap gap-1.5 overflow-hidden pl-1"
        >
          {filtered.map((action, index) => {
            const Icon = action.icon;
            const isActive = activeAction === action.id;
            const disabled = activeAction !== null && !isActive;
            return (
              <motion.button
                key={action.id}
                type="button"
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 2 }}
                transition={{ delay: index * 0.04, duration: 0.16 }}
                onClick={() => {
                  if (activeAction) return;
                  Haptics.tap();
                  setActiveAction(action.id);
                  setVisible(false);
                  window.setTimeout(() => onAction(action.id, action.prompt), 180);
                }}
                disabled={disabled}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-all duration-150 md:py-[5px] ${
                  disabled
                    ? "pointer-events-none opacity-30"
                    : "border-white/10 bg-white/[0.04] text-white/60 hover:-translate-y-[1px] hover:border-violet-500/30 hover:bg-violet-500/12 hover:text-white/95 hover:shadow-[0_2px_8px_rgba(139,92,246,0.15)] active:translate-y-0 active:scale-[0.97]"
                }`}
              >
                {isActive ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Icon className="size-[11px]" />
                )}
                <span>{action.label}</span>
                {filtered.length > 1 && (
                  <span className="ml-1 text-[9px] opacity-30">{index + 1}</span>
                )}
              </motion.button>
            );
          })}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

