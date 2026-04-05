"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  Check,
  Copy,
  FileText,
  GitBranch,
  Loader2,
  Pencil,
  Quote,
  RefreshCw,
  ThumbsDown,
  ThumbsUp,
  Volume2,
} from "lucide-react";

const barBtnClass =
  "inline-flex size-7 shrink-0 items-center justify-center rounded-[6px] border-0 bg-transparent text-[rgba(255,255,255,0.5)] transition-all duration-150 hover:bg-[rgba(255,255,255,0.08)] hover:text-[rgba(255,255,255,0.9)] active:bg-[rgba(255,255,255,0.12)]";

const dividerClass =
  "mx-1 h-4 w-px shrink-0 bg-[rgba(255,255,255,0.08)]";

type MessageActionsBarProps = {
  visible: boolean;
  align: "left" | "right";
  variant: "user" | "assistant";
  markdownCopyText: string;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onCopyMessage: () => Promise<void>;
  onCopyMarkdown: () => Promise<void>;
  onRegenerate?: () => void;
  onEdit?: () => void;
  onQuote?: () => void;
  onSpeak?: () => void;
  isSpeaking?: boolean;
  showRegenerateSpinner?: boolean;
  conversationId: string | null;
  feedbackRating: 1 | -1 | null;
  onFeedbackRatingChange: (r: 1 | -1 | null) => void;
  feedbackInputOpen: boolean;
  onFeedbackInputOpenChange: (open: boolean) => void;
  feedbackDraft: string;
  onFeedbackDraftChange: (v: string) => void;
  onSubmitFeedback: (rating: 1 | -1, text: string) => Promise<void>;
  onBranch?: () => void;
  messageIndex?: number;
};

export function MessageActionsBar(props: MessageActionsBarProps) {
  const {
    visible,
    align,
    variant,
    markdownCopyText,
    onPointerEnter,
    onPointerLeave,
    onCopyMessage,
    onCopyMarkdown,
    onRegenerate,
    onEdit,
    onQuote,
    onSpeak,
    isSpeaking,
    showRegenerateSpinner,
    conversationId,
    feedbackRating,
    onFeedbackRatingChange,
    feedbackInputOpen,
    onFeedbackInputOpenChange,
    feedbackDraft,
    onFeedbackDraftChange,
    onSubmitFeedback,
    onBranch,
    messageIndex,
  } = props;

  const [copyMsgDone, setCopyMsgDone] = useState(false);
  const [copyMdDone, setCopyMdDone] = useState(false);
  const [branchPopupOpen, setBranchPopupOpen] = useState(false);
  const branchPopupRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!branchPopupOpen) return;
    const onDown = (e: MouseEvent) => {
      if (branchPopupRef.current && !branchPopupRef.current.contains(e.target as Node)) {
        setBranchPopupOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBranchPopupOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [branchPopupOpen]);

  useEffect(() => {
    if (!feedbackInputOpen) return;
    const t = window.setTimeout(() => inputRef.current?.focus(), 50);
    return () => window.clearTimeout(t);
  }, [feedbackInputOpen]);

  const handleCopyMsg = async () => {
    try {
      await onCopyMessage();
      setCopyMsgDone(true);
      window.setTimeout(() => setCopyMsgDone(false), 1500);
    } catch {
      // Clipboard errors ignored.
    }
  };

  const handleCopyMd = async () => {
    try {
      await onCopyMarkdown();
      setCopyMdDone(true);
      window.setTimeout(() => setCopyMdDone(false), 1500);
    } catch {
      // Clipboard errors ignored.
    }
  };

  const toggleThumbUp = async () => {
    if (!conversationId) return;
    if (feedbackRating === 1) {
      onFeedbackRatingChange(null);
      return;
    }
    onFeedbackRatingChange(1);
    onFeedbackInputOpenChange(false);
    try {
      await onSubmitFeedback(1, "");
    } catch {
      onFeedbackRatingChange(null);
    }
  };

  const toggleThumbDown = () => {
    if (!conversationId) return;
    if (feedbackRating === -1) {
      onFeedbackRatingChange(null);
      onFeedbackInputOpenChange(false);
      return;
    }
    onFeedbackRatingChange(-1);
    onFeedbackInputOpenChange(true);
  };

  const sendDownFeedback = async () => {
    if (feedbackRating !== -1) return;
    try {
      await onSubmitFeedback(-1, feedbackDraft.trim());
      onFeedbackInputOpenChange(false);
      onFeedbackDraftChange("");
    } catch {
      onFeedbackRatingChange(null);
      onFeedbackInputOpenChange(false);
    }
  };

  const onFeedbackKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      void sendDownFeedback();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      onFeedbackInputOpenChange(false);
    }
  };

  return (
    <div
      className={`absolute bottom-0 z-30 flex flex-col gap-1 ${align === "right" ? "right-0 items-end" : "left-0 items-start"}`}
      style={{ paddingTop: 4 }}
      onMouseEnter={onPointerEnter}
      onMouseLeave={onPointerLeave}
    >
      <AnimatePresence>
        {visible && (
          <motion.div
            key="bar"
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 600, damping: 35, mass: 0.4 }}
            className="flex flex-col gap-1"
          >
            <div
              className="flex items-center gap-0.5 rounded-[10px] border border-[rgba(255,255,255,0.08)] p-1 shadow-[0_4px_20px_rgba(0,0,0,0.4)] backdrop-blur-[8px]"
              style={{ backgroundColor: "rgba(15,15,20,0.95)" }}
            >
              <button
                type="button"
                title="Copy message"
                className={barBtnClass}
                onClick={() => void handleCopyMsg()}
              >
                {copyMsgDone ? (
                  <Check className="size-3.5 text-emerald-400" aria-hidden />
                ) : (
                  <Copy className="size-3.5" aria-hidden />
                )}
              </button>

              {variant === "user" && onEdit && (
                <>
                  <span className={dividerClass} aria-hidden />
                  <button
                    type="button"
                    title="Edit message"
                    className={barBtnClass}
                    onClick={onEdit}
                  >
                    <Pencil className="size-3.5" aria-hidden />
                  </button>
                </>
              )}

              {variant === "assistant" && (
                <>
                  {onRegenerate && (
                    <>
                      <span className={dividerClass} aria-hidden />
                      <button
                        type="button"
                        title="Regenerate response"
                        className={barBtnClass}
                        onClick={onRegenerate}
                      >
                        {showRegenerateSpinner ? (
                          <Loader2 className="size-3.5 animate-spin" aria-hidden />
                        ) : (
                          <RefreshCw className="size-3.5" aria-hidden />
                        )}
                      </button>
                    </>
                  )}
                  <span className={dividerClass} aria-hidden />
                  <button
                    type="button"
                    title="Good response"
                    className={`${barBtnClass} ${feedbackRating === 1 ? "text-emerald-400 hover:text-emerald-300" : ""}`}
                    disabled={!conversationId}
                    onClick={() => void toggleThumbUp()}
                  >
                    <ThumbsUp
                      className={`size-3.5 ${feedbackRating === 1 ? "fill-current" : ""}`}
                      aria-hidden
                    />
                  </button>
                  <button
                    type="button"
                    title="Bad response"
                    className={`${barBtnClass} ${feedbackRating === -1 ? "text-red-400 hover:text-red-300" : ""}`}
                    disabled={!conversationId}
                    onClick={toggleThumbDown}
                  >
                    <ThumbsDown
                      className={`size-3.5 ${feedbackRating === -1 ? "fill-current" : ""}`}
                      aria-hidden
                    />
                  </button>
                  <span className={dividerClass} aria-hidden />
                  <button
                    type="button"
                    title="Copy as markdown"
                    className={barBtnClass}
                    onClick={() => void handleCopyMd()}
                  >
                    {copyMdDone ? (
                      <Check className="size-3.5 text-emerald-400" aria-hidden />
                    ) : (
                      <FileText className="size-3.5" aria-hidden />
                    )}
                  </button>
                  {onQuote && (
                    <>
                      <span className={dividerClass} aria-hidden />
                      <button
                        type="button"
                        title="Reply with quote"
                        className={barBtnClass}
                        onClick={onQuote}
                      >
                        <Quote className="size-3.5" aria-hidden />
                      </button>
                    </>
                  )}
                  {onSpeak && (
                    <>
                      <span className={dividerClass} aria-hidden />
                      <button
                        type="button"
                        title={isSpeaking ? "Stop speaking" : "Read aloud"}
                        className={`${barBtnClass} ${isSpeaking ? "text-purple-400 hover:text-purple-300" : ""}`}
                        onClick={onSpeak}
                      >
                        {isSpeaking ? (
                          <div className="flex h-3.5 items-end gap-[2px]">
                            {[0, 1, 2].map((i) => (
                              <motion.div
                                key={i}
                                className="w-[2px] rounded-full bg-purple-400"
                                animate={{ height: ["3px", "10px", "3px"] }}
                                transition={{
                                  duration: 0.8,
                                  repeat: Infinity,
                                  delay: i * 0.15,
                                }}
                              />
                            ))}
                          </div>
                        ) : (
                          <Volume2 className="size-3.5" aria-hidden />
                        )}
                      </button>
                    </>
                  )}
                </>
              )}

              {onBranch && (
                <>
                  <span className={dividerClass} aria-hidden />
                  <div className="relative">
                    <button
                      type="button"
                      title="Branch from here"
                      className={`${barBtnClass} hover:bg-purple-500/10 hover:text-purple-400`}
                      onClick={() => setBranchPopupOpen((v) => !v)}
                    >
                      <GitBranch className="size-3.5" aria-hidden />
                    </button>

                    <AnimatePresence>
                      {branchPopupOpen && (
                        <motion.div
                          ref={branchPopupRef}
                          key="branch-popup"
                          initial={{ opacity: 0, scale: 0.95, y: -4 }}
                          animate={{ opacity: 1, scale: 1, y: 0 }}
                          exit={{ opacity: 0, scale: 0.95, y: -4 }}
                          transition={{ duration: 0.15, ease: "easeOut" }}
                          className={`absolute z-[100] w-[260px] rounded-xl border border-[rgba(139,92,246,0.3)] p-4 shadow-xl ${align === "right" ? "right-0" : "left-0"}`}
                          style={{
                            bottom: "calc(100% + 8px)",
                            background: "rgba(12,10,20,0.97)",
                            backdropFilter: "blur(12px)",
                          }}
                        >
                          <div className="mb-3 flex items-center gap-2.5">
                            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-purple-500/20">
                              <GitBranch className="size-3.5 text-purple-400" aria-hidden />
                            </span>
                            <span className="text-[14px] font-semibold text-white">Branch from here?</span>
                          </div>
                          <p className="mb-2 text-[12px] leading-relaxed text-white/50">
                            Creates a new conversation with all messages up to this point. You can take it in a different direction.
                          </p>
                          {messageIndex !== undefined && (
                            <p className="mb-3 text-[11px] font-medium" style={{ color: "#a78bfa" }}>
                              {messageIndex + 1} message{messageIndex + 1 !== 1 ? "s" : ""} will be copied
                            </p>
                          )}
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setBranchPopupOpen(false)}
                              className="rounded-lg px-3 py-1.5 text-[12px] text-white/50 transition-colors hover:bg-white/[0.06] hover:text-white/80"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setBranchPopupOpen(false);
                                onBranch();
                              }}
                              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-semibold text-white transition-opacity hover:opacity-90"
                              style={{ background: "linear-gradient(135deg, #8b5cf6, #06b6d4)" }}
                            >
                              Branch
                              <ArrowRight className="size-3" aria-hidden />
                            </button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              )}
            </div>

            {variant === "assistant" && (
              <AnimatePresence>
                {feedbackInputOpen && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div
                      className="flex items-center gap-1 rounded-lg border border-[rgba(255,255,255,0.1)] p-1"
                      style={{ background: "rgba(15,15,20,0.95)" }}
                    >
                      <input
                        ref={inputRef}
                        type="text"
                        value={feedbackDraft}
                        onChange={(e) => onFeedbackDraftChange(e.target.value)}
                        onKeyDown={onFeedbackKeyDown}
                        placeholder="What could be better? (optional)"
                        className="h-8 w-[240px] rounded-md border border-[rgba(255,255,255,0.12)] bg-black/40 px-2 text-xs text-white/90 outline-none placeholder:text-white/35 focus:border-violet-500/60"
                      />
                      <button
                        type="button"
                        title="Send feedback"
                        className={barBtnClass}
                        onClick={() => void sendDownFeedback()}
                      >
                        <ArrowRight className="size-3.5" aria-hidden />
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
