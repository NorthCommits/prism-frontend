"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowRight, ThumbsDown, ThumbsUp } from "lucide-react";
import { submitFeedback } from "@/lib/feedback";

type Rating = 1 | -1;

type Props = {
  messageContent: string;
  conversationId: string;
};

export function MessageFeedback({ messageContent, conversationId }: Props) {
  const [rating, setRating] = useState<Rating | null>(null);
  const [showInput, setShowInput] = useState(false);
  const [feedbackText, setFeedbackText] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [success, setSuccess] = useState(false);

  // Ref-backed submitted flag avoids stale closures inside timer callbacks.
  const submittedRef = useRef(false);

  // 5-second timer — only active while input is not yet open.
  // Fires a silent submit (no text) if user rates but never opens the input.
  const ratingTimerRef = useRef<number | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  if (!conversationId) return null;

  const clearRatingTimer = () => {
    if (ratingTimerRef.current !== null) {
      window.clearTimeout(ratingTimerRef.current);
      ratingTimerRef.current = null;
    }
  };

  // Schedules a silent auto-submit (no text) after 5 s of inactivity.
  const startRatingTimer = (r: Rating) => {
    clearRatingTimer();
    ratingTimerRef.current = window.setTimeout(
      () => doSubmit(r, ""),
      5000
    ) as unknown as number;
  };

  const handleRate = (r: Rating) => {
    setRating(r);
    setShowInput(false);
    startRatingTimer(r);
  };

  // Opens the text input and cancels the pending silent auto-submit.
  const openInput = () => {
    clearRatingTimer();
    setShowInput(true);
    window.setTimeout(() => inputRef.current?.focus(), 220);
  };

  const doSubmit = async (r: Rating, text: string) => {
    // Guard against double-submit via ref (avoids stale closure issue).
    if (submittedRef.current) return;
    submittedRef.current = true;
    clearRatingTimer();
    setSubmitted(true);
    setShowInput(false);
    setSuccess(true);

    try {
      await submitFeedback({
        conversation_id: conversationId,
        message_content: messageContent,
        rating: r,
        feedback_text: text || undefined,
      });
    } catch {
      // Swallow silently — feedback is best-effort.
    }

    window.setTimeout(() => setSuccess(false), 2000);
  };

  // Only explicit user actions submit: Enter key or the send button.
  const handleSubmit = () => {
    if (rating !== null) doSubmit(rating, feedbackText);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSubmit();
  };

  // Close the input on blur when no text has been typed, and restart the
  // 5-second silent timer so the rating is still eventually captured.
  const handleInputBlur = () => {
    if (!feedbackText.trim()) {
      setShowInput(false);
      if (rating !== null) startRatingTimer(rating);
    }
  };

  useEffect(() => {
    return () => clearRatingTimer();
  }, []);

  if (submitted && !success) return null;

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      {/* Success banner */}
      {success && (
        <p
          className={`text-[11px] font-medium transition-opacity duration-500 ${
            rating === 1 ? "text-emerald-500" : "text-[#7c3aed]"
          }`}
        >
          {rating === 1 ? "✓ Thanks for the feedback!" : "✓ We'll improve this!"}
        </p>
      )}

      {/* Thumb buttons — hidden once submitted */}
      {!submitted && (
        <div className="flex items-center gap-1">
          {/* Thumbs up */}
          <button
            type="button"
            onClick={() => handleRate(1)}
            aria-label="Helpful"
            className={`group inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition-all duration-150 hover:scale-110 ${
              rating === 1
                ? "text-emerald-500"
                : rating === -1
                ? "text-muted-foreground/30"
                : "text-muted-foreground/50 hover:text-emerald-500"
            }`}
          >
            <ThumbsUp
              className="size-3.5"
              fill={rating === 1 ? "currentColor" : "none"}
            />
          </button>

          {/* Thumbs down */}
          <button
            type="button"
            onClick={() => handleRate(-1)}
            aria-label="Not helpful"
            className={`group inline-flex h-6 w-6 cursor-pointer items-center justify-center rounded-full transition-all duration-150 hover:scale-110 ${
              rating === -1
                ? "text-red-500"
                : rating === 1
                ? "text-muted-foreground/30"
                : "text-muted-foreground/50 hover:text-red-500"
            }`}
          >
            <ThumbsDown
              className="size-3.5"
              fill={rating === -1 ? "currentColor" : "none"}
            />
          </button>

          {/* Subtle hint — visible after rating, before the input is opened */}
          {rating !== null && !showInput && (
            <button
              type="button"
              onClick={openInput}
              className="ml-1 cursor-pointer text-[10px] text-muted-foreground/45 underline-offset-2 transition-colors hover:text-muted-foreground hover:underline"
            >
              Add feedback
            </button>
          )}
        </div>
      )}

      {/* Feedback text — slides down only after openInput() is called.
          Input stays open until the user submits (Enter / send) or blurs
          with no text typed. No auto-submit while the input is open. */}
      <div
        className="overflow-hidden transition-[max-height,opacity] duration-200 ease-out"
        style={{
          maxHeight: showInput ? "56px" : "0px",
          opacity: showInput ? 1 : 0,
        }}
      >
        <div className="flex max-w-xs items-center gap-1 rounded-xl border bg-background/60 px-2 py-1 shadow-sm">
          <input
            ref={inputRef}
            type="text"
            value={feedbackText}
            onChange={(e) => setFeedbackText(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleInputBlur}
            placeholder={
              rating === 1
                ? "What did you like? (optional)"
                : "How can we improve? (optional)"
            }
            className="min-w-0 flex-1 bg-transparent text-[11px] text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
          />
          <button
            type="button"
            onClick={handleSubmit}
            aria-label="Send feedback"
            className="inline-flex h-5 w-5 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowRight className="size-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
