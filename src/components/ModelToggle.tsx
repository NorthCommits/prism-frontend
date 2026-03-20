"use client";

import { useEffect, useRef, useState } from "react";
import { Code2, PenLine, Sparkles } from "lucide-react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ModelId } from "../lib/api";

type ModelToggleProps = {
  selectedModel: ModelId | null;
  onModelChange: (model: ModelId) => void;
};

export function ModelToggle({ selectedModel, onModelChange }: ModelToggleProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isContentMounted, setIsContentMounted] = useState(false);
  const [animKey, setAnimKey] = useState(0);
  const closeTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        window.clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  const handleOpenChange = (nextOpen: boolean) => {
    if (closeTimeoutRef.current) {
      window.clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }

    if (nextOpen) {
      setIsOpen(true);
      setIsContentMounted(true);
      setAnimKey((current) => current + 1);
      return;
    }

    setIsOpen(false);
    // Keep the dropdown mounted long enough to play the close animation.
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsContentMounted(false);
    }, 150);
  };

  return (
    <Select
      open={isOpen}
      onOpenChange={handleOpenChange}
      value={selectedModel ?? undefined}
      onValueChange={(value) => onModelChange(value as ModelId)}
    >
      <SelectTrigger className="w-[280px] bg-background/90 text-sm border border-[#e0ddff] dark:border-[#1f2937] focus-visible:ring-2 focus-visible:ring-[#7c3aed] transition-colors duration-200">
        <SelectValue
          placeholder={
            <span className="text-xs text-muted-foreground">
              Select a Prism model
            </span>
          }
        >
          {selectedModel === "auto" ? (
            <span className="flex flex-col items-start gap-0.5">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] text-[10px] text-white">
                  <Sparkles className="size-3" />
                </span>
                <span>Auto</span>
                <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Prism will decide
                </span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                Let Prism route requests to the best model.
              </span>
            </span>
          ) : selectedModel === "coding" ? (
            <span className="flex flex-col items-start gap-0.5">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <Code2 className="size-4 text-sky-500" />
                <span>Coding Assistant</span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                Great for code generation & debugging
              </span>
            </span>
          ) : selectedModel === "writing" ? (
            <span className="flex flex-col items-start gap-0.5">
              <span className="flex items-center gap-1.5 text-sm font-medium">
                <PenLine className="size-4 text-violet-500" />
                <span>Writing Assistant</span>
              </span>
              <span className="text-[11px] text-muted-foreground">
                Ideal for outlining, drafting, and editing
              </span>
            </span>
          ) : (
            <span className="text-xs text-muted-foreground">
              Select a Prism model
            </span>
          )}
        </SelectValue>
      </SelectTrigger>
      {isContentMounted && (
        <SelectContent key={animKey}>
          {[
            {
              value: "auto" as ModelId,
              icon: (
                <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] text-[10px] text-white">
                  <Sparkles className="size-3" />
                </span>
              ),
              title: "Auto",
              description: "Prism will decide which model to use.",
            },
            {
              value: "coding" as ModelId,
              icon: <Code2 className="size-4 text-sky-500" />,
              title: "Coding Assistant",
              description: "Great for code generation & debugging",
            },
            {
              value: "writing" as ModelId,
              icon: <PenLine className="size-4 text-violet-500" />,
              title: "Writing Assistant",
              description: "Ideal for outlining, drafting, and editing",
            },
          ].map((opt, idx) => (
            <SelectItem
              key={opt.value}
              value={opt.value}
              className="prism-model-option-enter"
              style={{ animationDelay: `${idx * 40}ms` }}
            >
              <div className="flex flex-col items-start gap-0.5">
                <span className="flex items-center gap-1.5 text-sm font-semibold">
                  {opt.icon}
                  <span>{opt.title}</span>
                </span>
                <span className="text-[11px] text-muted-foreground">
                  {opt.description}
                </span>
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      )}
    </Select>
  );
}

