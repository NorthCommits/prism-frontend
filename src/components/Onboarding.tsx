"use client";

import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";

import { completeOnboarding, saveProfile } from "@/lib/profile";
import type { ResponseStyle } from "@/lib/profile";

export interface OnboardingProps {
  onComplete: (firstMessage?: string) => void;
  initialName?: string;
}

// ── Response style option definitions ────────────────────────────────────────

const STYLE_OPTIONS: { id: ResponseStyle; icon: string; title: string; desc: string }[] = [
  { id: "balanced",  icon: "⚖️",  title: "Balanced",  desc: "Clear and well-rounded"       },
  { id: "concise",   icon: "✂️",  title: "Concise",   desc: "Short and direct"              },
  { id: "detailed",  icon: "📚",  title: "Detailed",  desc: "Comprehensive explanations"    },
  { id: "friendly",  icon: "😊",  title: "Friendly",  desc: "Warm and casual"               },
  { id: "technical", icon: "⚙️",  title: "Technical", desc: "Expert-level depth"            },
];

const EXPERTISE_OPTIONS = [
  { id: "beginner",     icon: "🌱", title: "Beginner",      desc: "New to AI tools"      },
  { id: "intermediate", icon: "⚡", title: "Intermediate",  desc: "Use AI regularly"     },
  { id: "expert",       icon: "🚀", title: "Expert",        desc: "Build with AI"        },
];

const SUGGESTED_MESSAGES = [
  "Explain how Prism works",
  "Write me a Python function",
  "What's happening in AI today?",
];

// ── Animated SVG checkmark for step 4 ────────────────────────────────────────

function AnimatedCheckmark() {
  return (
    <div
      className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full"
      style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)", boxShadow: "0 0 40px rgba(34,197,94,0.35)" }}
    >
      <motion.svg
        width="40" height="40" viewBox="0 0 40 40" fill="none"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1 }}
      >
        <motion.path
          d="M8 20 L17 29 L32 12"
          stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round"
          fill="none"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 0.55, delay: 0.2, ease: "easeOut" }}
        />
      </motion.svg>
    </div>
  );
}

// ── Progress indicator ────────────────────────────────────────────────────────

function ProgressBar({ step }: { step: number }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-0">
      {[1, 2, 3, 4].map((s, i) => (
        <React.Fragment key={s}>
          {/* Step dot */}
          <div className="relative flex h-8 w-8 items-center justify-center">
            {step > s ? (
              /* Completed */
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="flex h-7 w-7 items-center justify-center rounded-full"
                style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
              >
                <Check size={13} color="white" strokeWidth={3} />
              </motion.div>
            ) : step === s ? (
              /* Active */
              <motion.div
                layoutId="active-dot"
                className="h-7 w-7 rounded-full"
                style={{ background: "linear-gradient(135deg, #8b5cf6, #06b6d4)", boxShadow: "0 0 16px rgba(139,92,246,0.5)" }}
              />
            ) : (
              /* Pending */
              <div className="h-5 w-5 rounded-full border-2" style={{ borderColor: "rgba(255,255,255,0.15)", background: "rgba(255,255,255,0.05)" }} />
            )}
          </div>

          {/* Connector line between dots */}
          {i < 3 && (
            <div className="h-px w-10 overflow-hidden" style={{ background: "rgba(255,255,255,0.1)" }}>
              <motion.div
                className="h-full"
                style={{ background: "linear-gradient(to right, #8b5cf6, #06b6d4)" }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: step > s ? 1 : 0 }}
                transition={{ duration: 0.4 }}
                style2={{ transformOrigin: "left center" }}
              />
            </div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function Onboarding({ onComplete, initialName = "" }: OnboardingProps) {
  const [step, setStep]                         = useState(1);
  const [direction, setDirection]               = useState<1 | -1>(1);
  const [name, setName]                         = useState(initialName);
  const [aboutYou, setAboutYou]                 = useState("");
  const [expertise, setExpertise]               = useState("");
  const [responseStyle, setResponseStyle]       = useState<ResponseStyle>("balanced");
  const [customInstructions, setCustomInstructions] = useState("");
  const [showCustomInstr, setShowCustomInstr]   = useState(false);
  const [isSaving, setIsSaving]                 = useState(false);

  // Navigate forward and save as needed
  const goNext = async () => {
    if (step === 2) {
      try {
        /* Build about_you from the textarea + expertise choice */
        const expertiseLabel = EXPERTISE_OPTIONS.find((e) => e.id === expertise)?.title ?? "";
        const combinedAbout = [aboutYou, expertiseLabel ? `Expertise: ${expertiseLabel}` : ""]
          .filter(Boolean)
          .join("\n");
        await saveProfile({ display_name: name, about_you: combinedAbout });
      } catch {
        /* Non-fatal — continue onboarding even if save fails */
      }
    }
    if (step === 3) {
      try {
        await saveProfile({
          response_style: responseStyle,
          custom_instructions: customInstructions || undefined,
        });
      } catch {
        /* Non-fatal */
      }
    }
    setDirection(1);
    setStep((s) => s + 1);
  };

  const goBack = () => {
    setDirection(-1);
    setStep((s) => s - 1);
  };

  const handleSkip = async () => {
    try { await completeOnboarding(); } catch { /* ignore */ }
    onComplete();
  };

  const handleFinish = async (firstMessage?: string) => {
    setIsSaving(true);
    try { await completeOnboarding(); } catch { /* ignore */ }
    setIsSaving(false);
    onComplete(firstMessage);
  };

  /* Motion variants that react to navigation direction */
  const variants = {
    enter:  (d: number) => ({ opacity: 0, x: d * 24 }),
    center: { opacity: 1, x: 0 },
    exit:   (d: number) => ({ opacity: 0, x: d * -24 }),
  };

  return (
    /* Full-screen overlay — cannot be dismissed by clicking outside */
    <div
      className="fixed inset-0 z-[9000] flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(8px)" }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: "spring", duration: 0.5, bounce: 0.15 }}
        className="relative w-full overflow-hidden"
        style={{
          maxWidth: "560px",
          background: "rgba(10,10,15,0.97)",
          border: "1px solid rgba(139,92,246,0.3)",
          borderRadius: "24px",
          padding: "48px",
          backdropFilter: "blur(24px)",
        }}
      >
        {/* Skip button */}
        {step < 4 && (
          <button
            onClick={handleSkip}
            className="absolute right-6 top-6 cursor-pointer text-[12px] text-white/30 transition-colors hover:text-white/60"
          >
            Skip for now
          </button>
        )}

        {/* Progress dots */}
        <ProgressBar step={step} />

        {/* Animated step content */}
        <AnimatePresence mode="wait" custom={direction}>
          <motion.div
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === 1 && <Step1 onNext={goNext} />}
            {step === 2 && (
              <Step2
                name={name} setName={setName}
                aboutYou={aboutYou} setAboutYou={setAboutYou}
                expertise={expertise} setExpertise={setExpertise}
                onBack={goBack} onNext={goNext}
              />
            )}
            {step === 3 && (
              <Step3
                responseStyle={responseStyle} setResponseStyle={setResponseStyle}
                customInstructions={customInstructions} setCustomInstructions={setCustomInstructions}
                showCustomInstr={showCustomInstr} setShowCustomInstr={setShowCustomInstr}
                onBack={goBack} onNext={goNext}
              />
            )}
            {step === 4 && (
              <Step4
                name={name} responseStyle={responseStyle}
                isSaving={isSaving}
                onFinish={handleFinish}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ── Step 1: Welcome ───────────────────────────────────────────────────────────

function Step1({ onNext }: { onNext: () => void }) {
  return (
    <div className="text-center">
      {/* Animated prism logo */}
      <motion.div
        animate={{ y: [0, -8, 0] }}
        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ background: "linear-gradient(135deg, #8b5cf6, #06b6d4)", boxShadow: "0 0 40px rgba(139,92,246,0.4)" }}
      >
        <span className="text-2xl font-black text-white">P</span>
      </motion.div>

      <h1 className="mb-1 text-[26px] font-black tracking-tight text-white">Welcome to Prism</h1>
      <p className="mb-3 text-[14px]" style={{ color: "rgba(139,92,246,0.9)" }}>Your intelligent AI copilot</p>

      <p className="mb-8 text-[14px] leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
        Prism routes every message to the perfect AI model automatically.
        Let&apos;s take 2 minutes to set up your experience.
      </p>

      {/* Feature pills */}
      <div className="mb-8 flex justify-center gap-3 flex-wrap">
        {[
          { icon: "🧠", label: "Smart Routing" },
          { icon: "🔍", label: "Web Search"    },
          { icon: "⚡", label: "Agent Mode"    },
        ].map((f) => (
          <div
            key={f.label}
            className="flex items-center gap-2 rounded-full px-4 py-2 text-[13px] font-medium"
            style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.25)", color: "rgba(255,255,255,0.75)" }}
          >
            <span>{f.icon}</span>
            <span>{f.label}</span>
          </div>
        ))}
      </div>

      <GradientButton onClick={onNext} icon={<ChevronRight size={16} />}>
        Let&apos;s Get Started
      </GradientButton>
    </div>
  );
}

// ── Step 2: Personal Info ─────────────────────────────────────────────────────

function Step2({
  name, setName, aboutYou, setAboutYou,
  expertise, setExpertise, onBack, onNext,
}: {
  name: string; setName: (v: string) => void;
  aboutYou: string; setAboutYou: (v: string) => void;
  expertise: string; setExpertise: (v: string) => void;
  onBack: () => void; onNext: () => void;
}) {
  return (
    <div>
      <h2 className="mb-1 text-[22px] font-black tracking-tight text-white">Tell us about yourself</h2>
      <p className="mb-6 text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }}>
        Help Prism personalise your experience
      </p>

      {/* Name */}
      <div className="mb-4">
        <label className="mb-1.5 block text-[12px] font-semibold uppercase tracking-widest text-white/40">
          Your Name
        </label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="How should Prism address you?"
          className="w-full rounded-xl px-4 py-3 text-[14px] text-white outline-none transition-all placeholder:text-white/25"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)")}
          onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
        />
      </div>

      {/* About you */}
      <div className="mb-5">
        <label className="mb-1.5 flex items-center justify-between text-[12px] font-semibold uppercase tracking-widest text-white/40">
          <span>What do you do?</span>
          <span className="normal-case tracking-normal">{aboutYou.length}/300</span>
        </label>
        <textarea
          value={aboutYou}
          onChange={(e) => setAboutYou(e.target.value.slice(0, 300))}
          placeholder={"e.g. I'm a software engineer working on AI products at a healthcare company."}
          rows={3}
          className="w-full resize-none rounded-xl px-4 py-3 text-[14px] text-white outline-none transition-all placeholder:text-white/25"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
          onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)")}
          onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
        />
      </div>

      {/* Expertise level */}
      <div className="mb-7">
        <label className="mb-2 block text-[12px] font-semibold uppercase tracking-widest text-white/40">
          Your expertise level with AI
        </label>
        <div className="grid grid-cols-3 gap-3">
          {EXPERTISE_OPTIONS.map((opt) => {
            const selected = expertise === opt.id;
            return (
              <button
                key={opt.id}
                onClick={() => setExpertise(opt.id)}
                className="cursor-pointer rounded-xl p-3 text-center transition-all hover:scale-[1.02]"
                style={{
                  background: selected ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.03)",
                  border: selected ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(255,255,255,0.08)",
                }}
              >
                <div className="mb-1 text-xl">{opt.icon}</div>
                <div className="text-[12px] font-semibold text-white">{opt.title}</div>
                <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.4)" }}>{opt.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <StepNav onBack={onBack} onNext={onNext} />
    </div>
  );
}

// ── Step 3: Response Style ────────────────────────────────────────────────────

function Step3({
  responseStyle, setResponseStyle,
  customInstructions, setCustomInstructions,
  showCustomInstr, setShowCustomInstr,
  onBack, onNext,
}: {
  responseStyle: ResponseStyle; setResponseStyle: (v: ResponseStyle) => void;
  customInstructions: string; setCustomInstructions: (v: string) => void;
  showCustomInstr: boolean; setShowCustomInstr: (v: boolean) => void;
  onBack: () => void; onNext: () => void;
}) {
  return (
    <div>
      <h2 className="mb-1 text-[22px] font-black tracking-tight text-white">How should Prism respond?</h2>
      <p className="mb-6 text-[13px]" style={{ color: "rgba(255,255,255,0.4)" }}>
        You can always change this later in settings
      </p>

      {/* 2 + 2 + 1 grid */}
      <div className="mb-5 grid grid-cols-2 gap-3">
        {STYLE_OPTIONS.map((opt) => {
          const selected = responseStyle === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setResponseStyle(opt.id)}
              className="cursor-pointer rounded-xl p-4 text-left transition-all hover:scale-[1.02]"
              style={{
                background: selected ? "rgba(139,92,246,0.12)" : "rgba(255,255,255,0.03)",
                border: selected ? "1px solid rgba(139,92,246,0.5)" : "1px solid rgba(255,255,255,0.08)",
              }}
            >
              <div className="mb-1 text-lg">{opt.icon}</div>
              <div className="text-[13px] font-semibold text-white">{opt.title}</div>
              <div className="text-[12px]" style={{ color: "rgba(255,255,255,0.4)" }}>{opt.desc}</div>
            </button>
          );
        })}
      </div>

      {/* Custom instructions — expandable */}
      <div className="mb-7">
        <button
          onClick={() => setShowCustomInstr(!showCustomInstr)}
          className="mb-2 flex cursor-pointer items-center gap-1.5 text-[12px] font-semibold uppercase tracking-widest text-white/40 transition-colors hover:text-white/60"
        >
          <span>{showCustomInstr ? "▾" : "▸"}</span>
          Anything else? (optional)
        </button>
        <AnimatePresence>
          {showCustomInstr && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.22 }}
              style={{ overflow: "hidden" }}
            >
              <div className="flex justify-end mb-1">
                <span className="text-[11px] text-white/30">{customInstructions.length}/500</span>
              </div>
              <textarea
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value.slice(0, 500))}
                placeholder={"e.g. Always give code examples.\nAssume I know Python basics."}
                rows={3}
                className="w-full resize-none rounded-xl px-4 py-3 text-[14px] text-white outline-none transition-all placeholder:text-white/25"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.1)" }}
                onFocus={(e) => (e.currentTarget.style.borderColor = "rgba(139,92,246,0.5)")}
                onBlur={(e)  => (e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)")}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <StepNav onBack={onBack} onNext={onNext} />
    </div>
  );
}

// ── Step 4: All Set ───────────────────────────────────────────────────────────

function Step4({
  name, responseStyle, isSaving, onFinish,
}: {
  name: string; responseStyle: ResponseStyle;
  isSaving: boolean; onFinish: (firstMessage?: string) => void;
}) {
  const displayName = name.trim() || "there";
  const styleLabel  = STYLE_OPTIONS.find((s) => s.id === responseStyle)?.title ?? "Balanced";

  return (
    <div className="text-center">
      <AnimatedCheckmark />

      <h2 className="mb-1 text-[24px] font-black tracking-tight text-white">
        You&apos;re all set, {displayName}! 🎉
      </h2>
      <p className="mb-6 text-[14px]" style={{ color: "rgba(255,255,255,0.45)" }}>
        Prism is ready to work with you.
      </p>

      {/* Summary pills */}
      <div className="mb-6 flex flex-wrap justify-center gap-2">
        {[name.trim() || "You", `${styleLabel} style`, "Personalised for you"].map((label) => (
          <span
            key={label}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-semibold"
            style={{ background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", color: "#22c55e" }}
          >
            <Check size={11} strokeWidth={3} />
            {label}
          </span>
        ))}
      </div>

      <p className="mb-6 text-[13px] leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
        Your first conversation is waiting. Try asking Prism anything — it&apos;ll automatically route to the best AI model for your request.
      </p>

      {/* Suggested first messages */}
      <div className="mb-7 flex flex-wrap justify-center gap-2">
        {SUGGESTED_MESSAGES.map((msg) => (
          <button
            key={msg}
            onClick={() => onFinish(msg)}
            className="cursor-pointer rounded-full px-4 py-2 text-[12px] transition-all hover:border-violet-500/50 hover:text-white"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}
          >
            ✦ {msg}
          </button>
        ))}
      </div>

      <GradientButton onClick={() => onFinish()} disabled={isSaving} icon={<ChevronRight size={16} />}>
        {isSaving ? "Saving…" : "Start Using Prism"}
      </GradientButton>
    </div>
  );
}

// ── Shared primitives ─────────────────────────────────────────────────────────

function GradientButton({
  children, onClick, disabled, icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl py-3.5 text-[15px] font-semibold text-white transition-all hover:opacity-90 hover:shadow-[0_0_24px_rgba(139,92,246,0.4)] disabled:opacity-50"
      style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
    >
      {children}
      {icon}
    </button>
  );
}

function StepNav({ onBack, onNext }: { onBack: () => void; onNext: () => void }) {
  return (
    <div className="flex gap-3">
      <button
        onClick={onBack}
        className="flex cursor-pointer items-center gap-1.5 rounded-xl px-5 py-3.5 text-[14px] font-semibold transition-all hover:bg-white/[0.06]"
        style={{ color: "rgba(255,255,255,0.5)", border: "1px solid rgba(255,255,255,0.1)" }}
      >
        <ChevronLeft size={15} />
        Back
      </button>
      <button
        onClick={onNext}
        className="flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl py-3.5 text-[14px] font-semibold text-white transition-all hover:opacity-90 hover:shadow-[0_0_20px_rgba(139,92,246,0.35)]"
        style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
      >
        Continue
        <ChevronRight size={15} />
      </button>
    </div>
  );
}
