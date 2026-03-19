"use client";

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
  return (
    <Select
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
      <SelectContent>
        <SelectItem value="auto">
          <div className="flex flex-col items-start gap-0.5">
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-gradient-to-r from-[#7c3aed] to-[#06b6d4] text-[10px] text-white">
                <Sparkles className="size-3" />
              </span>
              <span>Auto</span>
            </span>
            <span className="text-[11px] text-muted-foreground">
              Prism will decide which model to use.
            </span>
          </div>
        </SelectItem>
        <SelectItem value="coding">
          <div className="flex flex-col items-start gap-0.5">
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <Code2 className="size-4 text-sky-500" />
              <span>Coding Assistant</span>
            </span>
            <span className="text-[11px] text-muted-foreground">
              Great for code generation & debugging
            </span>
          </div>
        </SelectItem>
        <SelectItem value="writing">
          <div className="flex flex-col items-start gap-0.5">
            <span className="flex items-center gap-1.5 text-sm font-semibold">
              <PenLine className="size-4 text-violet-500" />
              <span>Writing Assistant</span>
            </span>
            <span className="text-[11px] text-muted-foreground">
              Ideal for outlining, drafting, and editing
            </span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

