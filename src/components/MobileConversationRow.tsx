"use client";

import { Trash2 } from "lucide-react";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

const DELETE_WIDTH = 80;
const MOVE_CANCEL_LONGPRESS = 12;

type MobileConversationRowProps = {
  conversationId: string;
  swipeOpenId: string | null;
  onSwipeOpenChange: (id: string | null) => void;
  onOpen: () => void;
  onDeletePress: () => void;
  onLongPress: (rect: DOMRect) => void;
  className?: string;
  children: React.ReactNode;
};

export function MobileConversationRow({
  conversationId,
  swipeOpenId,
  onSwipeOpenChange,
  onOpen,
  onDeletePress,
  onLongPress,
  className = "",
  children,
}: MobileConversationRowProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragX, setDragX] = useState(0);
  const startClientXRef = useRef(0);
  const startClientYRef = useRef(0);
  const baseXRef = useRef(0);
  const longPressTimerRef = useRef<number | null>(null);
  const movedRef = useRef(false);
  const rowRef = useRef<HTMLDivElement | null>(null);

  const revealed = swipeOpenId === conversationId;
  const translateX = isDragging
    ? dragX
    : revealed
      ? -DELETE_WIDTH
      : 0;

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearLongPress();
  }, [clearLongPress]);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (swipeOpenId && swipeOpenId !== conversationId) {
      onSwipeOpenChange(null);
    }

    const t = e.touches[0];
    startClientXRef.current = t.clientX;
    startClientYRef.current = t.clientY;
    baseXRef.current = revealed ? -DELETE_WIDTH : 0;
    movedRef.current = false;
    setIsDragging(false);
    setDragX(baseXRef.current);

    clearLongPress();
    longPressTimerRef.current = window.setTimeout(() => {
      if (!movedRef.current && rowRef.current) {
        onLongPress(rowRef.current.getBoundingClientRect());
        try {
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            navigator.vibrate(50);
          }
        } catch {
          /* ignore */
        }
      }
      longPressTimerRef.current = null;
    }, 500);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const t = e.touches[0];
    const dx = t.clientX - startClientXRef.current;
    const dy = t.clientY - startClientYRef.current;

    if (
      Math.abs(dx) > MOVE_CANCEL_LONGPRESS ||
      Math.abs(dy) > MOVE_CANCEL_LONGPRESS
    ) {
      movedRef.current = true;
      clearLongPress();
    }

    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 8) {
      setIsDragging(true);
      const next = Math.max(
        -DELETE_WIDTH,
        Math.min(0, baseXRef.current + dx)
      );
      setDragX(next);
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    clearLongPress();

    const t = e.changedTouches[0];
    const dx = t.clientX - startClientXRef.current;
    const dy = t.clientY - startClientYRef.current;

    if (!isDragging && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      if (revealed || translateX <= -DELETE_WIDTH / 2) {
        onSwipeOpenChange(null);
        setIsDragging(false);
        setDragX(0);
        return;
      }
      onOpen();
      setIsDragging(false);
      setDragX(0);
      return;
    }

    if (isDragging) {
      const x = dragX;
      if (x < -60) {
        onSwipeOpenChange(conversationId);
        setDragX(-DELETE_WIDTH);
      } else {
        onSwipeOpenChange(null);
        setDragX(0);
      }
    }

    setIsDragging(false);
  };

  return (
    <div
      ref={rowRef}
      className={`relative overflow-hidden rounded-lg touch-pan-y ${className}`}
    >
      <div
        className="absolute right-0 top-0 flex h-full w-20 flex-col items-center justify-center bg-[#ef4444] text-white"
        style={{ width: DELETE_WIDTH }}
      >
        <button
          type="button"
          className="flex flex-col items-center justify-center gap-0.5 px-2 py-1 text-[11px] font-medium"
          onClick={(ev) => {
            ev.stopPropagation();
            onDeletePress();
          }}
          aria-label="Delete conversation"
        >
          <Trash2 className="size-5 shrink-0" strokeWidth={2} />
          <span>Delete</span>
        </button>
      </div>

      <div
        role="presentation"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        className="relative z-10 flex min-h-[44px] w-full items-stretch"
        style={{
          transform: `translateX(${translateX}px)`,
          transition: isDragging ? "none" : "transform 0.2s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}
