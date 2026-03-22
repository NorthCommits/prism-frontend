"use client";

import { useCallback, useRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2 } from "lucide-react";

type SortableDesktopConversationRowProps = {
  id: string;
  animClass: string;
  rowSurface: string;
  /** Topic icon — hidden in bulk mode (checkbox replaces it). */
  topicIcon: React.ReactNode;
  textBlock: React.ReactNode;
  onOpen: () => void;
  onDelete: () => void;
  bulkSelectMode: boolean;
  isSelected: boolean;
  onToggleSelected: () => void;
  onBulkLongPress: () => void;
};

export function SortableDesktopConversationRow(
  props: SortableDesktopConversationRowProps
) {
  const longPressTimerRef = useRef<number | null>(null);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: props.id });

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1 : 0,
  } as const;

  const showCheckbox = props.bulkSelectMode;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group/convo relative flex items-stretch gap-0 overflow-hidden rounded-lg transition-colors duration-200 ${props.animClass}`}
    >
      <button
        type="button"
        className="relative z-20 flex h-auto w-5 shrink-0 cursor-grab items-center justify-center rounded-l-lg text-[rgba(255,255,255,0.2)] opacity-0 transition-opacity group-hover/convo:opacity-100 active:cursor-grabbing touch-none"
        aria-label="Reorder conversation"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-3.5" aria-hidden />
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <label
          className={`flex shrink-0 cursor-pointer items-center justify-center transition-all duration-150 ${
            showCheckbox
              ? "w-4 opacity-100"
              : "w-0 max-w-0 overflow-hidden opacity-0 group-hover/convo:max-w-[16px] group-hover/convo:w-4 group-hover/convo:opacity-100"
          }`}
        >
          <input
            type="checkbox"
            checked={props.isSelected}
            onChange={(e) => {
              e.stopPropagation();
              props.onToggleSelected();
            }}
            className="sr-only"
          />
          <span
            className={`flex size-4 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-transform duration-150 ease-out ${
              props.isSelected
                ? "scale-110 border-transparent bg-gradient-to-br from-[#7c3aed] to-[#06b6d4]"
                : "scale-100 border-[rgba(255,255,255,0.3)] bg-transparent"
            }`}
          >
            {props.isSelected ? (
              <svg
                className="size-2.5 text-white"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden
              >
                <path
                  d="M2.5 6L5 8.5L9.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </span>
        </label>

        <button
          type="button"
          onClick={props.onOpen}
          onMouseDown={() => {
            clearLongPress();
            longPressTimerRef.current = window.setTimeout(() => {
              props.onBulkLongPress();
              longPressTimerRef.current = null;
            }, 500);
          }}
          onMouseUp={clearLongPress}
          onMouseLeave={clearLongPress}
          className={`relative z-20 flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-lg px-2 py-1.5 text-left transition-colors duration-200 ${props.rowSurface}`}
        >
          {!props.bulkSelectMode ? (
            <span className="shrink-0">{props.topicIcon}</span>
          ) : null}
          {props.textBlock}
        </button>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          props.onDelete();
        }}
        className="relative z-20 px-1 opacity-0 transition-opacity group-hover/convo:opacity-100"
        aria-label="Delete conversation"
      >
        <Trash2 className="size-3.5 text-muted-foreground hover:text-foreground" />
      </button>
    </div>
  );
}

export function ConversationRowDragGhost(props: {
  title: string;
  topicIcon: React.ReactNode;
}) {
  return (
    <div
      className="flex max-w-[240px] cursor-grabbing items-center gap-2 overflow-hidden rounded-lg border border-[rgba(139,92,246,0.4)] bg-[#f5f3ff] px-2 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] opacity-90 dark:bg-[#0d0b1a]"
    >
      {props.topicIcon}
      <p className="line-clamp-1 flex-1 text-left text-xs text-foreground/90">
        {props.title}
      </p>
    </div>
  );
}

type PinnedDesktopConversationRowProps = Omit<
  SortableDesktopConversationRowProps,
  "id"
>;

/** Same layout as sortable row but without drag-and-drop (pinned section). */
export function PinnedDesktopConversationRow(
  props: PinnedDesktopConversationRowProps
) {
  const longPressTimerRef = useRef<number | null>(null);

  const clearLongPress = useCallback(() => {
    if (longPressTimerRef.current != null) {
      window.clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
  }, []);

  const showCheckbox = props.bulkSelectMode;

  return (
    <div
      className={`group/convo relative flex items-stretch gap-0 overflow-hidden rounded-lg transition-colors duration-200 ${props.animClass}`}
    >
      <div
        className="relative z-10 w-5 shrink-0"
        aria-hidden
      />

      <div className="flex min-w-0 flex-1 items-center gap-1.5">
        <label
          className={`flex shrink-0 cursor-pointer items-center justify-center transition-all duration-150 ${
            showCheckbox
              ? "w-4 opacity-100"
              : "w-0 max-w-0 overflow-hidden opacity-0 group-hover/convo:max-w-[16px] group-hover/convo:w-4 group-hover/convo:opacity-100"
          }`}
        >
          <input
            type="checkbox"
            checked={props.isSelected}
            onChange={(e) => {
              e.stopPropagation();
              props.onToggleSelected();
            }}
            className="sr-only"
          />
          <span
            className={`flex size-4 shrink-0 items-center justify-center rounded-[4px] border-[1.5px] transition-transform duration-150 ease-out ${
              props.isSelected
                ? "scale-110 border-transparent bg-gradient-to-br from-[#7c3aed] to-[#06b6d4]"
                : "scale-100 border-[rgba(255,255,255,0.3)] bg-transparent"
            }`}
          >
            {props.isSelected ? (
              <svg
                className="size-2.5 text-white"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden
              >
                <path
                  d="M2.5 6L5 8.5L9.5 3.5"
                  stroke="currentColor"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            ) : null}
          </span>
        </label>

        <button
          type="button"
          onClick={props.onOpen}
          onMouseDown={() => {
            clearLongPress();
            longPressTimerRef.current = window.setTimeout(() => {
              props.onBulkLongPress();
              longPressTimerRef.current = null;
            }, 500);
          }}
          onMouseUp={clearLongPress}
          onMouseLeave={clearLongPress}
          className={`relative z-20 flex min-w-0 flex-1 items-center gap-2 overflow-hidden rounded-lg px-2 py-1.5 text-left transition-colors duration-200 ${props.rowSurface}`}
        >
          {!props.bulkSelectMode ? (
            <span className="shrink-0">{props.topicIcon}</span>
          ) : null}
          {props.textBlock}
        </button>
      </div>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          props.onDelete();
        }}
        className="relative z-20 px-1 opacity-0 transition-opacity group-hover/convo:opacity-100"
        aria-label="Delete conversation"
      >
        <Trash2 className="size-3.5 text-muted-foreground hover:text-foreground" />
      </button>
    </div>
  );
}
