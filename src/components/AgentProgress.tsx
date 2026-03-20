"use client";

import { Check, Zap } from "lucide-react";

type AgentProgressProps = {
  steps: string[];
  currentStep: number;
  completedSteps: number[];
  isComplete: boolean;
};

// Returns the display state for a given step index (1-indexed).
function stepStatus(
  stepIndex: number,
  currentStep: number,
  completedSteps: number[],
  isComplete: boolean
): "done" | "active" | "pending" {
  if (isComplete || completedSteps.includes(stepIndex)) return "done";
  if (stepIndex === currentStep) return "active";
  return "pending";
}

export function AgentProgress({
  steps,
  currentStep,
  completedSteps,
  isComplete,
}: AgentProgressProps) {
  const total = steps.length;
  const doneCount = isComplete ? total : completedSteps.length;

  return (
    <div
      className={`mx-auto w-full max-w-2xl animate-[spring-in_300ms_cubic-bezier(0.16,1,0.3,1)_forwards] px-4 pb-2 pt-3`}
    >
      <div
        className={`rounded-2xl border bg-background/80 px-4 py-3 shadow-sm backdrop-blur-sm transition-colors duration-500 ${
          isComplete
            ? "border-emerald-500/40 bg-emerald-500/5"
            : "border-[#7c3aed]/20"
        }`}
      >
        {/* Header row */}
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <div
              className={`flex h-5 w-5 items-center justify-center rounded-full ${
                isComplete
                  ? "bg-emerald-500"
                  : "bg-gradient-to-br from-[#7c3aed] to-[#2563eb]"
              }`}
            >
              {isComplete ? (
                <Check className="size-3 text-white" />
              ) : (
                <Zap className="size-3 text-white" />
              )}
            </div>
            <span className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground/70">
              Agent Mode
            </span>
          </div>

          <span
            className={`text-[10px] font-medium tabular-nums ${
              isComplete ? "text-emerald-600 dark:text-emerald-400" : "text-[#7c3aed]"
            }`}
          >
            {isComplete
              ? `All ${total} steps complete`
              : currentStep > 0
              ? `Step ${currentStep} of ${total}`
              : `${total} steps planned`}
          </span>
        </div>

        {/* Step list */}
        <div className="space-y-0">
          {steps.map((title, idx) => {
            const num = idx + 1;
            const status = stepStatus(num, currentStep, completedSteps, isComplete);

            return (
              <div
                key={num}
                className="flex items-start gap-2.5"
                style={{
                  animationDelay: `${idx * 100}ms`,
                  animation: "spring-in 250ms cubic-bezier(0.16,1,0.3,1) both",
                }}
              >
                {/* Left column: circle + connector line */}
                <div className="flex flex-col items-center">
                  {/* Status circle */}
                  <div
                    className={`relative flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold transition-all duration-300 ${
                      status === "done"
                        ? "bg-emerald-500 text-white"
                        : status === "active"
                        ? "bg-gradient-to-br from-[#7c3aed] to-[#2563eb] text-white shadow-[0_0_8px_rgba(124,58,237,0.5)]"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {/* Pulse ring on active step */}
                    {status === "active" && (
                      <span
                        className="absolute inset-0 rounded-full bg-[#7c3aed]/30 animate-ping"
                        aria-hidden
                      />
                    )}
                    {status === "done" ? (
                      <Check className="size-2.5" />
                    ) : (
                      <span>{num}</span>
                    )}
                  </div>

                  {/* Connector line (hidden for last step) */}
                  {idx < steps.length - 1 && (
                    <div
                      className={`mt-0.5 h-4 w-px transition-colors duration-300 ${
                        completedSteps.includes(num) || isComplete
                          ? "bg-emerald-500/50"
                          : "bg-border/60"
                      }`}
                    />
                  )}
                </div>

                {/* Step title */}
                <p
                  className={`pb-2 pt-0.5 text-xs leading-snug transition-colors duration-200 ${
                    status === "active"
                      ? "font-medium text-[#7c3aed]"
                      : status === "done"
                      ? "text-muted-foreground/60 line-through decoration-muted-foreground/30"
                      : "text-muted-foreground"
                  }`}
                >
                  {title}
                </p>
              </div>
            );
          })}
        </div>

        {/* Active step sub-label */}
        {!isComplete && currentStep > 0 && currentStep <= total && (
          <div className="mt-1 flex items-center gap-1.5 border-t border-border/40 pt-2">
            <span
              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#7c3aed]"
              aria-hidden
            />
            <p className="text-[11px] text-[#7c3aed]">
              Working on:{" "}
              <span className="font-medium">{steps[currentStep - 1]}</span>
            </p>
          </div>
        )}

        {/* Completion summary */}
        {isComplete && (
          <div className="mt-1 flex items-center gap-1.5 border-t border-emerald-500/20 pt-2">
            <Check className="size-3 text-emerald-500" />
            <p className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
              Agent completed all {total} steps
            </p>
          </div>
        )}

        {/* Progress bar */}
        <div className="mt-2 h-0.5 w-full overflow-hidden rounded-full bg-muted/60">
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out ${
              isComplete
                ? "bg-emerald-500"
                : "bg-gradient-to-r from-[#7c3aed] to-[#2563eb]"
            }`}
            style={{ width: `${total > 0 ? (doneCount / total) * 100 : 0}%` }}
          />
        </div>
      </div>
    </div>
  );
}
