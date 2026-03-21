"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { ReactLenis } from "lenis/react";
import Link from "next/link";
import { ArrowRight, ChevronDown, Play } from "lucide-react";

// ── Data ───────────────────────────────────────────────────────────────────

const AGENT_STEPS = [
  { label: "Design API schema" },
  { label: "Write data models" },
  { label: "Implement endpoints" },
  { label: "Write test suite" },
];

const CODE_LINES: { text: string; type: "import" | "code" | "print" | "empty" }[] = [
  { text: "import pandas as pd", type: "import" },
  { text: "import numpy as np", type: "import" },
  { text: "", type: "empty" },
  { text: 'df = pd.read_csv("data.csv")', type: "code" },
  { text: "result = df.describe()", type: "code" },
  { text: "print(result)", type: "print" },
];

const OUTPUT_LINES = [
  "count    100.000",
  "mean      42.340",
  "std       12.100",
  "min       18.200",
];

const SEARCH_CARDS = [
  { title: "OpenAI releases o4 reasoning model", snippet: "The latest model demonstrates unprecedented...", source: "techcrunch.com", time: "2h ago" },
  { title: "AI benchmark results 2026", snippet: "New evaluation shows significant improvements...", source: "arxiv.org", time: "5h ago" },
  { title: "AI industry weekly digest", snippet: "Multiple major announcements this week...", source: "venturebeat.com", time: "1d ago" },
];

const MEMORY_NODES = [
  { label: "Name", x: 150, y: 55,  color: "#8b5cf6" },
  { label: "Location", x: 265, y: 115, color: "#06b6d4" },
  { label: "Expertise", x: 280, y: 220, color: "#ec4899" },
  { label: "Projects", x: 170, y: 295, color: "#10b981" },
  { label: "Prefs",    x: 45,  y: 220, color: "#f59e0b" },
  { label: "Goals",    x: 35,  y: 115, color: "#a78bfa" },
];

const VOICE_BARS = [
  { h: "35%", d: "0s" },
  { h: "68%", d: "0.13s" },
  { h: "92%", d: "0.06s" },
  { h: "55%", d: "0.26s" },
  { h: "82%", d: "0.19s" },
  { h: "44%", d: "0.09s" },
  { h: "96%", d: "0.03s" },
  { h: "62%", d: "0.32s" },
  { h: "78%", d: "0.16s" },
  { h: "50%", d: "0.22s" },
  { h: "87%", d: "0.28s" },
];

const STATS = [
  { value: "10+", label: "Specialist AI Models" },
  { value: "∞",   label: "Conversations Remembered" },
  { value: "6",   label: "Premium Voice Options" },
  { value: "1",   label: "Interface. All You Need." },
];

const MARQUEE_ITEMS = [
  "SMART ROUTING", "WEB SEARCH", "CODE EXECUTION", "IMAGE VISION",
  "VOICE I/O", "AGENT MODE", "PERSONAL MEMORY", "DATA ANALYSIS",
  "PROMPT TEMPLATES", "STREAMING RESPONSES",
];

// ── CSS (inline, prefixed lp- to avoid conflicts) ──────────────────────────

const LANDING_CSS = `
  @keyframes lp-blob1 {
    0%,100% { transform: translate(0,0) scale(1); }
    25%     { transform: translate(65px,-85px) scale(1.13); }
    50%     { transform: translate(-42px,55px) scale(0.92); }
    75%     { transform: translate(80px,28px) scale(1.07); }
  }
  @keyframes lp-blob2 {
    0%,100% { transform: translate(0,0) scale(1); }
    30%     { transform: translate(-72px,58px) scale(1.09); }
    60%     { transform: translate(55px,-44px) scale(0.94); }
  }
  @keyframes lp-blob3 {
    0%,100% { transform: translate(0,0) scale(1); }
    40%     { transform: translate(50px,72px) scale(1.11); }
    70%     { transform: translate(-58px,-32px) scale(0.91); }
  }
  @keyframes lp-blob4 {
    0%,100% { transform: translate(0,0) scale(1); }
    35%     { transform: translate(-54px,-68px) scale(1.08); }
    65%     { transform: translate(64px,46px) scale(0.93); }
  }
  @keyframes lp-marquee {
    from { transform: translateX(0); }
    to   { transform: translateX(-33.333%); }
  }
  @keyframes lp-float {
    0%,100% { transform: translateY(0); }
    50%     { transform: translateY(-12px); }
  }
  @keyframes lp-blink {
    0%,100% { opacity: 1; }
    50%     { opacity: 0; }
  }
  @keyframes lp-voicebar {
    to { transform: scaleY(0.15); }
  }
  @keyframes lp-drawline {
    to { stroke-dashoffset: 0; }
  }
  @keyframes lp-spin {
    to { transform: rotate(360deg); }
  }
  @keyframes lp-glow {
    0%,100% { box-shadow: 0 0 20px rgba(139,92,246,0.25); }
    50%     { box-shadow: 0 0 55px rgba(139,92,246,0.6); }
  }
  @keyframes lp-fadescale {
    from { opacity:0; transform:scale(0.5); }
    to   { opacity:1; transform:scale(1); }
  }
  .lp-blob1   { animation: lp-blob1 18s ease-in-out infinite; }
  .lp-blob2   { animation: lp-blob2 23s ease-in-out infinite; }
  .lp-blob3   { animation: lp-blob3 16s ease-in-out infinite; }
  .lp-blob4   { animation: lp-blob4 21s ease-in-out infinite; }
  .lp-float   { animation: lp-float 3s ease-in-out infinite; }
  .lp-cursor  { animation: lp-blink 1s step-end infinite; }
  .lp-spin    { animation: lp-spin 1.2s linear infinite; display:inline-block; }
  .lp-glow    { animation: lp-glow 2.5s ease-in-out infinite; }
  .lp-marquee { animation: lp-marquee 32s linear infinite; }
  .lp-vbar    { animation: lp-voicebar 0.55s ease-in-out infinite alternate; transform-origin: bottom; }
`;

// ── Primitive helpers ──────────────────────────────────────────────────────

function WordReveal({
  text,
  className = "",
  baseDelay = 0,
}: {
  text: string;
  className?: string;
  baseDelay?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref as React.RefObject<HTMLElement>, { once: true, margin: "-80px 0px" });

  return (
    <span ref={ref} className={`inline ${className}`}>
      {text.split(" ").map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 28, filter: "blur(6px)" }}
          animate={inView ? { opacity: 1, y: 0, filter: "blur(0px)" } : {}}
          transition={{
            duration: 0.65,
            delay: baseDelay + i * 0.07,
            ease: [0.16, 1, 0.3, 1],
          }}
          className="inline-block"
          style={{ marginRight: "0.28em", willChange: "transform" }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}

function FadeIn({
  children,
  delay = 0,
  y = 24,
  x = 0,
  className = "",
}: {
  children: React.ReactNode;
  delay?: number;
  y?: number;
  x?: number;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<HTMLElement>, { once: true, margin: "-80px 0px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y, x }}
      animate={inView ? { opacity: 1, y: 0, x: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.16, 1, 0.3, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

function SectionLabel({ text, color = "text-violet-400" }: { text: string; color?: string }) {
  return (
    <p className={`mb-5 text-[11px] font-bold uppercase tracking-[0.25em] ${color}`}>
      {text}
    </p>
  );
}

// ── Visual components ──────────────────────────────────────────────────────

function RoutingDiagram() {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref as unknown as React.RefObject<HTMLElement>, { once: true, margin: "-80px 0px" });

  const outputNodes = [
    { cx: 65,  cy: 55,  label: "CODE",   sub: "GPT-4o",  color: "#8b5cf6", delay: "0.55s" },
    { cx: 235, cy: 55,  label: "WRITE",  sub: "Claude",  color: "#06b6d4", delay: "0.75s" },
    { cx: 65,  cy: 245, label: "SEARCH", sub: "Tavily",  color: "#ec4899", delay: "0.95s" },
    { cx: 235, cy: 245, label: "VISION", sub: "GPT-4V",  color: "#10b981", delay: "1.15s" },
  ];

  return (
    <svg
      ref={ref}
      viewBox="0 0 300 300"
      className="mx-auto w-full max-w-[340px]"
    >
      <defs>
        <linearGradient id="rdG1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8b5cf6" />
          <stop offset="100%" stopColor="#06b6d4" />
        </linearGradient>
        <filter id="rdGlow">
          <feGaussianBlur stdDeviation="5" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Animated connector lines */}
      {inView && [
        { x1: 150, y1: 112, x2: 65,  y2: 75,  len: 105, c: "rgba(139,92,246,0.55)", d: "0.4s" },
        { x1: 150, y1: 112, x2: 235, y2: 75,  len: 105, c: "rgba(6,182,212,0.55)",  d: "0.6s" },
        { x1: 150, y1: 188, x2: 65,  y2: 225, len: 100, c: "rgba(236,72,153,0.5)",  d: "0.8s" },
        { x1: 150, y1: 188, x2: 235, y2: 225, len: 100, c: "rgba(16,185,129,0.5)",  d: "1.0s" },
      ].map((l, i) => (
        <line
          key={i}
          x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
          stroke={l.c}
          strokeWidth="1.5"
          strokeDasharray={l.len}
          strokeDashoffset={l.len}
          style={{ animation: `lp-drawline 0.7s ease forwards ${l.d}` }}
        />
      ))}

      {/* Central node */}
      <circle cx="150" cy="150" r="54" fill="rgba(139,92,246,0.08)" stroke="url(#rdG1)" strokeWidth="1.5" filter="url(#rdGlow)" />
      <circle cx="150" cy="150" r="40" fill="rgba(139,92,246,0.05)" />
      <text x="150" y="146" textAnchor="middle" fill="white" fontSize="10" fontWeight="800" letterSpacing="3">PRISM</text>
      <text x="150" y="161" textAnchor="middle" fill="rgba(139,92,246,0.75)" fontSize="8" fontWeight="500">ROUTING</text>

      {/* Output nodes */}
      {inView && outputNodes.map((n) => (
        <g
          key={n.label}
          style={{
            opacity: 0,
            animation: `lp-fadescale 0.45s ease forwards ${n.delay}`,
          }}
        >
          <circle cx={n.cx} cy={n.cy} r="28" fill={`${n.color}18`} stroke={`${n.color}55`} strokeWidth="1.5" />
          <text x={n.cx} y={n.cy - 4} textAnchor="middle" fill="white" fontSize="8.5" fontWeight="700">{n.label}</text>
          <text x={n.cx} y={n.cy + 8} textAnchor="middle" fill={`${n.color}99`} fontSize="7.5">{n.sub}</text>
        </g>
      ))}
    </svg>
  );
}

function SearchCards() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<HTMLElement>, { once: true, margin: "-60px 0px" });

  return (
    <div ref={ref} className="relative mx-auto max-w-sm" style={{ height: "280px" }}>
      {SEARCH_CARDS.map((card, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 50, rotate: (i - 1) * 4 }}
          animate={inView ? { opacity: 1 - i * 0.18, y: i * 15, rotate: (i - 1) * 2.5 } : {}}
          transition={{ duration: 0.7, delay: i * 0.12, ease: [0.16, 1, 0.3, 1] }}
          className="absolute inset-x-0 rounded-2xl border border-white/[0.08] p-4 backdrop-blur-md"
          style={{ background: "rgba(10,10,10,0.92)", top: `${i * 15}px`, zIndex: SEARCH_CARDS.length - i }}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="text-[11px] font-medium text-white/35">{card.source}</span>
            <div className="flex items-center gap-1.5">
              <div className="h-1.5 w-1.5 rounded-full bg-red-500" style={{ animation: "lp-blink 1.4s ease-in-out infinite" }} />
              <span className="text-[10px] font-bold text-red-400">LIVE</span>
            </div>
          </div>
          <p className="mb-1 text-sm font-semibold leading-snug text-white">{card.title}</p>
          <p className="text-xs leading-relaxed text-white/38">{card.snippet}</p>
          <p className="mt-2 text-[10px] text-white/20">{card.time}</p>
        </motion.div>
      ))}
    </div>
  );
}

function CodeTerminal() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<HTMLElement>, { once: true, margin: "-60px 0px" });
  const [visible, setVisible] = useState(0);
  const [showOutput, setShowOutput] = useState(false);

  useEffect(() => {
    if (!inView) return;
    let i = 0;
    const tick = () => {
      i++;
      setVisible(i);
      if (i < CODE_LINES.length) {
        window.setTimeout(tick, i === 2 ? 120 : 480);
      } else {
        window.setTimeout(() => setShowOutput(true), 500);
      }
    };
    window.setTimeout(tick, 400);
  }, [inView]);

  const lineColor = (type: string) =>
    type === "import" ? "text-violet-400" :
    type === "code"   ? "text-emerald-400" :
    type === "print"  ? "text-cyan-400" :
    "";

  return (
    <div
      ref={ref}
      className="overflow-hidden rounded-2xl border border-white/[0.07]"
      style={{ background: "#080808" }}
    >
      {/* Title bar */}
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-4 py-3">
        <div className="h-3 w-3 rounded-full bg-red-500/70" />
        <div className="h-3 w-3 rounded-full bg-yellow-500/70" />
        <div className="h-3 w-3 rounded-full bg-emerald-500/70" />
        <span className="ml-3 text-[11px] text-white/25">prism_sandbox.py</span>
        <span className="ml-auto text-[10px] font-semibold text-emerald-400/60">● running</span>
      </div>

      {/* Code body */}
      <div className="min-h-[240px] p-5 font-mono text-[13px]">
        {CODE_LINES.slice(0, visible).map((line, i) => (
          <div key={i} className={`leading-7 ${lineColor(line.type)}`}>
            {line.text || <>&nbsp;</>}
          </div>
        ))}
        {visible < CODE_LINES.length && visible > 0 && (
          <span className="lp-cursor inline-block h-[18px] w-[2px] align-middle bg-emerald-400" />
        )}

        {showOutput && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-5 border-t border-white/[0.06] pt-4"
          >
            <p className="mb-2 font-mono text-[11px] text-white/25">— output ──────────────────</p>
            {OUTPUT_LINES.map((line, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.08, duration: 0.3 }}
                className="font-mono text-xs leading-6 text-emerald-300/80"
              >
                {line}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}

function AgentDemo() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<HTMLElement>, { once: false, margin: "-100px 0px" });
  const [active, setActive] = useState(0);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!inView) return;
    setActive(0);
    let step = 0;

    const advance = () => {
      step++;
      if (step > AGENT_STEPS.length) {
        step = 0;
        setActive(0);
        timerRef.current = window.setTimeout(advance, 900);
      } else {
        setActive(step);
        timerRef.current = window.setTimeout(advance, step === AGENT_STEPS.length ? 2200 : 1100);
      }
    };

    timerRef.current = window.setTimeout(advance, 1000);
    return () => { if (timerRef.current !== null) window.clearTimeout(timerRef.current); };
  }, [inView]);

  const progress = (active / AGENT_STEPS.length) * 100;

  return (
    <div ref={ref} className="mx-auto w-full max-w-md">
      {/* Progress bar */}
      <div className="mb-1 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-white/30">Progress</span>
        <span className="text-[10px] text-white/30">{Math.round(progress)}%</span>
      </div>
      <div className="mb-6 h-0.5 overflow-hidden rounded-full bg-white/[0.07]">
        <motion.div
          className="h-full rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.35 }}
          style={{ background: "linear-gradient(to right, #8b5cf6, #06b6d4)" }}
        />
      </div>

      <p className="mb-5 text-center text-[11px] font-medium uppercase tracking-widest text-white/25">
        Task — Build a REST API
      </p>

      <div className="space-y-2.5">
        {AGENT_STEPS.map((step, i) => {
          const isDone    = i < active - 1 || active > AGENT_STEPS.length;
          const isRunning = i === active - 1 && active <= AGENT_STEPS.length;
          const isPending = !isDone && !isRunning;
          return (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: 24 }}
              animate={{ opacity: isPending ? 0.38 : 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.05 * i }}
              className={`flex items-center gap-3 rounded-xl border px-4 py-3 transition-colors duration-300 ${
                isRunning ? "border-violet-500/40 bg-violet-500/[0.08]" :
                isDone    ? "border-emerald-500/25 bg-emerald-500/[0.05]" :
                            "border-white/[0.05] bg-white/[0.02]"
              }`}
            >
              <div
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold transition-colors duration-300 ${
                  isDone    ? "bg-emerald-500/20 text-emerald-400" :
                  isRunning ? "bg-violet-500/20 text-violet-400" :
                              "bg-white/[0.05] text-white/25"
                }`}
              >
                {isDone ? "✓" : isRunning
                  ? <span className="lp-spin text-[8px]">◉</span>
                  : String(i + 1)}
              </div>
              <span
                className={`flex-1 text-sm font-medium transition-colors duration-300 ${
                  isDone ? "text-white/50" : isRunning ? "text-white" : "text-white/25"
                }`}
              >
                {step.label}
              </span>
              {isDone    && <motion.span initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} className="text-[10px] font-semibold text-emerald-400">done</motion.span>}
              {isRunning && <span className="text-[10px] font-semibold text-violet-400/70">running</span>}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function VoiceWaveform() {
  return (
    <div className="flex items-end justify-center gap-1.5" style={{ height: "80px" }}>
      {VOICE_BARS.map((bar, i) => (
        <div
          key={i}
          className="lp-vbar w-1.5 rounded-full"
          style={{
            height: bar.h,
            background: "linear-gradient(to top, #8b5cf6, #06b6d4)",
            animationDelay: bar.d,
            willChange: "transform",
          }}
        />
      ))}
    </div>
  );
}

function MemoryMap() {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref as unknown as React.RefObject<HTMLElement>, { once: true, margin: "-60px 0px" });
  const cx = 160, cy = 160;

  return (
    <svg ref={ref} viewBox="0 0 320 320" className="mx-auto w-full max-w-[300px]">
      <defs>
        <radialGradient id="mmRad">
          <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.35" />
          <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx={cx} cy={cy} r="55" fill="url(#mmRad)" />
      <circle cx={cx} cy={cy} r="36" fill="rgba(139,92,246,0.1)" stroke="rgba(139,92,246,0.5)" strokeWidth="1.5" />
      <text x={cx} y={cy - 4} textAnchor="middle" fill="white" fontSize="10" fontWeight="800" letterSpacing="2">PRISM</text>
      <text x={cx} y={cy + 9} textAnchor="middle" fill="rgba(139,92,246,0.7)" fontSize="8">memory</text>

      {MEMORY_NODES.map((node, i) => (
        <g key={node.label}>
          {inView && (
            <line
              x1={cx} y1={cy} x2={node.x} y2={node.y}
              stroke={`${node.color}40`}
              strokeWidth="1"
              strokeDasharray="95"
              strokeDashoffset="95"
              style={{ animation: `lp-drawline 0.6s ease forwards ${0.08 + i * 0.12}s` }}
            />
          )}
          <motion.g
            initial={{ opacity: 0, scale: 0 }}
            animate={inView ? { opacity: 1, scale: 1 } : {}}
            transition={{ delay: 0.18 + i * 0.12, duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          >
            <circle cx={node.x} cy={node.y} r="22" fill={`${node.color}15`} stroke={`${node.color}50`} strokeWidth="1.5" />
            <text x={node.x} y={node.y + 4} textAnchor="middle" fill="white" fontSize="8.5" fontWeight="600">
              {node.label}
            </text>
          </motion.g>
        </g>
      ))}
    </svg>
  );
}

function StatItem({ value, label, index }: { value: string; label: string; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<HTMLElement>, { once: true, margin: "-60px 0px" });

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6, delay: index * 0.1, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col items-center gap-2 px-8 py-10"
    >
      <span
        className="text-5xl font-black tracking-tight"
        style={{
          background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        {value}
      </span>
      <span className="max-w-[130px] text-center text-xs leading-relaxed text-white/40">{label}</span>
    </motion.div>
  );
}

// ── Feature section (reusable layout) ─────────────────────────────────────

type FeatureSectionProps = {
  id?: string;
  side: "left" | "right";
  accentColor: string;
  label: string;
  labelColor: string;
  headline: string;
  body: string;
  bullets: string[];
  visual: React.ReactNode;
  blobColor: string;
};

function FeatureSection({
  id, side, accentColor, label, labelColor, headline, body, bullets, visual, blobColor,
}: FeatureSectionProps) {
  const textRef = useRef<HTMLDivElement>(null);
  const inView = useInView(textRef as React.RefObject<HTMLElement>, { once: true, margin: "-100px 0px" });

  const blobPos = side === "left"
    ? { top: "-80px", right: "-130px" }
    : { top: "-80px", left: "-130px" };

  const textBlock = (
    <motion.div
      ref={textRef}
      initial={{ opacity: 0, x: side === "left" ? -32 : 32 }}
      animate={inView ? { opacity: 1, x: 0 } : {}}
      transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-col justify-center"
    >
      <SectionLabel text={label} color={labelColor} />
      <h2
        className="mb-5 font-black leading-[1.08] tracking-[-0.04em] text-white"
        style={{ fontSize: "clamp(30px, 3.2vw, 46px)" }}
      >
        <WordReveal text={headline} />
      </h2>
      <p className="mb-7 max-w-[440px] text-[15px] leading-[1.85] text-white/45">{body}</p>
      <div className="space-y-3">
        {bullets.map((b, i) => (
          <FadeIn key={i} delay={0.14 + i * 0.08} y={12} className="flex items-start gap-3">
            <span
              className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[9px] font-bold"
              style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}40` }}
            >
              ✦
            </span>
            <span className="text-sm leading-relaxed text-white/55">{b}</span>
          </FadeIn>
        ))}
      </div>
    </motion.div>
  );

  const visualBlock = (
    <FadeIn delay={0.18} y={44} className="flex items-center justify-center">
      {visual}
    </FadeIn>
  );

  return (
    <section
      id={id}
      className="relative overflow-hidden border-t border-white/[0.05]"
      style={{ minHeight: "100vh" }}
    >
      <div
        className="pointer-events-none absolute h-[600px] w-[600px] rounded-full blur-[150px]"
        style={{ background: blobColor, ...blobPos }}
      />
      <div className="relative mx-auto flex min-h-screen max-w-7xl flex-col gap-16 px-8 py-28 lg:flex-row lg:items-center lg:gap-20">
        {side === "left" ? (
          <>
            <div className="flex-1">{textBlock}</div>
            <div className="flex-1">{visualBlock}</div>
          </>
        ) : (
          <>
            {/* On mobile: text first, visual second. On desktop: visual on left. */}
            <div className="flex-1 lg:order-last">{textBlock}</div>
            <div className="flex-1 lg:order-first">{visualBlock}</div>
          </>
        )}
      </div>
    </section>
  );
}

// ── Sections ───────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const h = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <motion.nav
      initial={{ y: -24, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
      className="fixed left-0 right-0 top-0 z-50 flex items-center justify-between px-6 py-4 transition-all duration-500 md:px-10"
      style={
        scrolled
          ? { background: "rgba(0,0,0,0.85)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }
          : {}
      }
    >
      <div className="flex items-center gap-2.5">
        <div
          className="flex h-8 w-8 items-center justify-center rounded-lg text-sm font-black shadow-lg"
          style={{ background: "linear-gradient(135deg, #8b5cf6, #06b6d4)" }}
        >
          P
        </div>
        <span
          className="text-base font-black tracking-[0.1em]"
          style={{
            background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          PRISM
        </span>
      </div>

      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-full px-4 py-1.5 text-sm text-white/50 transition-colors hover:text-violet-400"
        >
          Sign In
        </Link>
        <Link
          href="/login"
          className="group flex items-center gap-1.5 rounded-full px-5 py-1.5 text-sm font-semibold text-white transition-all hover:scale-[1.03]"
          style={{
            background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
            boxShadow: "0 0 22px rgba(139,92,246,0.38)",
          }}
        >
          Get Started
          <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </motion.nav>
  );
}

function HeroSection() {
  const [hideScroll, setHideScroll] = useState(false);

  useEffect(() => {
    const h = () => setHideScroll(window.scrollY > 100);
    window.addEventListener("scroll", h, { passive: true });
    return () => window.removeEventListener("scroll", h);
  }, []);

  return (
    <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 pb-20 pt-24">
      {/* Animated gradient blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div className="lp-blob1 absolute -left-64 -top-64 h-[720px] w-[720px] rounded-full blur-[160px]" style={{ background: "rgba(139,92,246,0.22)" }} />
        <div className="lp-blob2 absolute -right-48 -top-48 h-[620px] w-[620px] rounded-full blur-[145px]" style={{ background: "rgba(6,182,212,0.14)" }} />
        <div className="lp-blob3 absolute bottom-0 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-[135px]" style={{ background: "rgba(236,72,153,0.11)" }} />
        <div className="lp-blob4 absolute -right-32 bottom-0 h-[420px] w-[420px] rounded-full blur-[125px]" style={{ background: "rgba(37,99,235,0.12)" }} />
      </div>

      {/* Dot grid overlay */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.08]"
        style={{
          backgroundImage: "radial-gradient(circle, rgba(255,255,255,0.65) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Bottom fade to black */}
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-black to-transparent" />

      {/* Content */}
      <div className="relative z-10 flex max-w-5xl flex-col items-center text-center">
        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium backdrop-blur-sm"
          style={{ borderColor: "rgba(139,92,246,0.38)", background: "rgba(139,92,246,0.1)", color: "#a78bfa" }}
        >
          <span>✦</span>
          Intelligent AI Routing
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
          className="mb-6"
        >
          <h1 className="font-black leading-[0.91] tracking-[-0.045em]" style={{ fontSize: "clamp(54px, 8.5vw, 96px)" }}>
            <span className="block text-white">The Right Model.</span>
            <span
              className="block"
              style={{
                background: "linear-gradient(135deg, #a78bfa 0%, #06b6d4 55%, #ec4899 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Every Time.
            </span>
          </h1>
        </motion.div>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.5 }}
          className="mb-10 max-w-[540px] text-[17px] leading-[1.8] text-white/50"
        >
          Prism is an AI copilot that intelligently routes every conversation to the
          perfect specialist model. Web search. Code execution. Vision. Voice. Memory.
        </motion.p>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.65 }}
          className="flex flex-col items-center gap-4 sm:flex-row"
        >
          <Link
            href="/login"
            className="group inline-flex items-center gap-2 rounded-full px-8 py-3.5 text-[15px] font-semibold text-white transition-all hover:scale-[1.03]"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #06b6d4)", boxShadow: "0 0 40px rgba(139,92,246,0.44)" }}
          >
            Start for Free
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
          <button
            type="button"
            onClick={() => document.getElementById("lp-features")?.scrollIntoView({ behavior: "smooth" })}
            className="inline-flex cursor-pointer items-center gap-2.5 rounded-full border border-white/10 px-8 py-3.5 text-[15px] text-white/55 backdrop-blur-sm transition-all hover:border-white/20 hover:bg-white/[0.04] hover:text-white"
          >
            <Play className="size-3.5" />
            Watch How It Works
          </button>
        </motion.div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        animate={{ opacity: hideScroll ? 0 : 1 }}
        transition={{ duration: 0.4 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 lp-float pointer-events-none"
      >
        <div className="flex flex-col items-center gap-1.5">
          <span className="text-[11px] tracking-[0.22em] text-white/28">SCROLL</span>
          <ChevronDown className="size-4 text-white/22" />
        </div>
      </motion.div>
    </section>
  );
}

function MarqueeSection() {
  return (
    <div
      className="relative overflow-hidden border-y"
      style={{ height: "52px", borderColor: "rgba(255,255,255,0.06)", background: "#000" }}
    >
      <div className="lp-marquee flex h-full items-center whitespace-nowrap">
        {[0, 1, 2].map((rep) => (
          <div key={rep} className="flex shrink-0 items-center">
            {MARQUEE_ITEMS.map((item, i) => (
              <React.Fragment key={i}>
                <span className="text-[12px] font-semibold tracking-[0.22em] text-white/30">{item}</span>
                <span className="mx-5 text-violet-500">·</span>
              </React.Fragment>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function AgentSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<HTMLElement>, { once: true, margin: "-80px 0px" });

  return (
    <section className="relative overflow-hidden border-t border-white/[0.05]" style={{ minHeight: "100vh" }}>
      <div className="pointer-events-none absolute inset-0">
        <div className="lp-blob1 absolute left-1/4 top-0 h-[520px] w-[520px] -translate-x-1/2 rounded-full blur-[145px]" style={{ background: "rgba(139,92,246,0.18)" }} />
        <div className="lp-blob2 absolute right-1/4 top-1/2 h-[420px] w-[420px] translate-x-1/2 rounded-full blur-[125px]" style={{ background: "rgba(236,72,153,0.12)" }} />
      </div>

      <div ref={ref} className="relative mx-auto flex min-h-screen max-w-5xl flex-col items-center justify-center px-8 py-28 text-center">
        <FadeIn>
          <SectionLabel text="AGENT MODE" color="text-violet-400" />
        </FadeIn>
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          className="mb-3 font-black leading-[0.93] tracking-[-0.04em] text-white"
          style={{ fontSize: "clamp(40px, 6.5vw, 72px)" }}
        >
          Give it a mission.
        </motion.h2>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.15 }}
          className="mb-4 text-2xl font-light text-white/30"
        >
          Watch it execute.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.28 }}
          className="mb-16 max-w-lg text-[15px] leading-[1.82] text-white/45"
        >
          Complex multi-step tasks, executed automatically. Prism plans, executes,
          and delivers — step by step, like a senior engineer.
        </motion.p>
        <FadeIn delay={0.38} className="w-full">
          <AgentDemo />
        </FadeIn>
      </div>
    </section>
  );
}

function VoiceSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<HTMLElement>, { once: true, margin: "-80px 0px" });
  const voices = ["Nova", "Alloy", "Echo", "Fable", "Onyx", "Shimmer"];

  return (
    <section
      className="relative overflow-hidden border-t border-white/[0.05]"
      style={{ minHeight: "100vh", background: "linear-gradient(to bottom, #000 0%, #0a0012 50%, #000 100%)" }}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="lp-blob3 absolute left-1/2 top-1/2 h-[620px] w-[620px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[160px]" style={{ background: "rgba(139,92,246,0.15)" }} />
      </div>

      <div ref={ref} className="relative flex min-h-screen flex-col items-center justify-center px-6 py-28 text-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={inView ? { opacity: 1, scale: 1 } : {}}
          transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
          className="mb-10 lp-glow"
          style={{ padding: "24px 52px", borderRadius: "24px", border: "1px solid rgba(139,92,246,0.22)", background: "rgba(139,92,246,0.07)" }}
        >
          <VoiceWaveform />
        </motion.div>

        <SectionLabel text="VOICE INTERFACE" color="text-violet-400" />

        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.75, delay: 0.12 }}
          className="mb-5 font-black leading-[0.93] tracking-[-0.04em] text-white"
          style={{ fontSize: "clamp(36px, 5.5vw, 64px)" }}
        >
          Speak. Listen. Converse.
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 14 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, delay: 0.24 }}
          className="mb-9 max-w-md text-[15px] leading-[1.82] text-white/45"
        >
          Voice input powered by OpenAI Whisper. Voice output with 6 premium voices.
          Choose your assistant&apos;s voice in settings.
        </motion.p>

        <FadeIn delay={0.35} className="flex flex-wrap justify-center gap-2">
          {voices.map((name) => (
            <span
              key={name}
              className="rounded-full border px-4 py-1.5 text-sm font-medium text-white/55 transition-colors hover:border-violet-500/45 hover:text-violet-300"
              style={{ borderColor: "rgba(255,255,255,0.1)" }}
            >
              {name}
            </span>
          ))}
        </FadeIn>
      </div>
    </section>
  );
}

function StatsSection() {
  return (
    <section
      className="border-y"
      style={{
        borderColor: "rgba(255,255,255,0.06)",
        background: "linear-gradient(135deg, rgba(139,92,246,0.05) 0%, rgba(6,182,212,0.03) 50%, rgba(236,72,153,0.04) 100%)",
      }}
    >
      <div className="mx-auto max-w-4xl px-6">
        <div className="flex flex-wrap items-center justify-center divide-y divide-white/[0.05] md:divide-x md:divide-y-0">
          {STATS.map((s, i) => (
            <StatItem key={s.label} value={s.value} label={s.label} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<HTMLElement>, { once: true, margin: "-80px 0px" });

  return (
    <section className="relative border-t border-white/[0.05] px-6" style={{ minHeight: "60vh", display: "flex", alignItems: "center" }}>
      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 32 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        className="mx-auto max-w-3xl py-24 text-center"
      >
        <div
          className="mb-6 font-black leading-[0.45]"
          style={{
            fontSize: "130px",
            background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
          }}
        >
          &ldquo;
        </div>
        <blockquote className="mb-8 text-[22px] font-light leading-[1.65] text-white/80">
          Prism feels like having a senior engineer, researcher, and creative director
          available 24/7. The routing is genuinely magical.
        </blockquote>
        <cite className="text-sm font-semibold not-italic text-white/30">
          — AI Engineer, Pharma Industry
        </cite>
      </motion.div>
    </section>
  );
}

function FinalCTASection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<HTMLElement>, { once: true, margin: "-80px 0px" });

  return (
    <section className="relative overflow-hidden border-t border-white/[0.05]" style={{ minHeight: "80vh" }}>
      {/* All blobs converge */}
      <div className="pointer-events-none absolute inset-0">
        <div className="lp-blob1 absolute -left-32 top-0 h-[520px] w-[520px] rounded-full blur-[140px]" style={{ background: "rgba(139,92,246,0.3)" }} />
        <div className="lp-blob2 absolute -right-32 top-0 h-[440px] w-[440px] rounded-full blur-[130px]" style={{ background: "rgba(6,182,212,0.2)" }} />
        <div className="lp-blob3 absolute bottom-0 left-1/2 h-[420px] w-[420px] -translate-x-1/2 rounded-full blur-[125px]" style={{ background: "rgba(236,72,153,0.2)" }} />
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-black to-transparent" />

      <motion.div
        ref={ref}
        initial={{ opacity: 0, y: 44 }}
        animate={inView ? { opacity: 1, y: 0 } : {}}
        transition={{ duration: 0.85, ease: [0.16, 1, 0.3, 1] }}
        className="relative flex min-h-[80vh] flex-col items-center justify-center px-6 py-24 text-center"
      >
        <div
          className="mb-6 inline-flex items-center gap-2 rounded-full border px-4 py-1.5 text-sm font-medium backdrop-blur-sm"
          style={{ borderColor: "rgba(139,92,246,0.38)", background: "rgba(139,92,246,0.1)", color: "#a78bfa" }}
        >
          <span>✦</span>
          Free. Open. Powerful.
        </div>

        <h2
          className="mb-5 font-black leading-[0.91] tracking-[-0.045em] text-white"
          style={{ fontSize: "clamp(46px, 8vw, 90px)" }}
        >
          Your AI Copilot
          <br />
          <span
            style={{
              background: "linear-gradient(135deg, #a78bfa, #06b6d4, #ec4899)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Awaits.
          </span>
        </h2>

        <p className="mb-12 max-w-md text-lg text-white/45">
          Join and experience the future of human-AI collaboration.
          No credit card required.
        </p>

        <Link
          href="/login"
          className="group mb-5 inline-flex items-center gap-3 rounded-full px-12 py-5 text-lg font-bold text-white transition-all hover:scale-[1.04]"
          style={{
            background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
            boxShadow: "0 0 65px rgba(139,92,246,0.52)",
          }}
        >
          Start Using Prism
          <ArrowRight className="size-5 transition-transform group-hover:translate-x-0.5" />
        </Link>

        <p className="text-sm text-white/28">Takes 30 seconds to sign up</p>
      </motion.div>
    </section>
  );
}

function Footer() {
  return (
    <footer className="relative border-t px-6 py-8" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
      {/* Gradient top line */}
      <div
        className="absolute left-0 right-0 top-0 h-px"
        style={{ background: "linear-gradient(to right, transparent, #8b5cf6 30%, transparent 50%, #06b6d4 70%, transparent)" }}
      />
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-7 w-7 items-center justify-center rounded-md text-xs font-black"
            style={{ background: "linear-gradient(135deg, #8b5cf6, #06b6d4)" }}
          >
            P
          </div>
          <span className="text-sm text-white/30">© 2026 Prism</span>
        </div>
        <p className="text-sm text-white/20">Built with ♥ by Swapnil Bhattacharya</p>
      </div>
    </footer>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <ReactLenis root>
      <style>{LANDING_CSS}</style>

      <div className="min-h-screen overflow-x-hidden bg-black text-white selection:bg-violet-500/30">
        <Navbar />
        <HeroSection />
        <MarqueeSection />

        <div id="lp-features">
          <FeatureSection
            side="left"
            accentColor="#8b5cf6"
            label="INTELLIGENCE"
            labelColor="text-violet-400"
            headline="Routes every message to the perfect model."
            body="Not all AI tasks are equal. A coding question needs a different model than a creative writing prompt. Prism's intelligent router analyzes your intent in milliseconds and dispatches to the perfect specialist — automatically."
            bullets={[
              "GPT-4o for complex reasoning",
              "Specialist models for coding",
              "Writing optimized for creativity",
              "Zero configuration needed",
            ]}
            visual={<RoutingDiagram />}
            blobColor="rgba(139,92,246,0.2)"
          />

          <FeatureSection
            side="right"
            accentColor="#06b6d4"
            label="REAL-TIME"
            labelColor="text-cyan-400"
            headline="Always connected to the world."
            body="When your question needs current information, Prism searches the web automatically. No more outdated answers. No more manual searching. Sources cited. Facts verified."
            bullets={[
              "Automatic search detection",
              "Source citations included",
              "Real-time data and news",
              "Powered by Tavily Search",
            ]}
            visual={<SearchCards />}
            blobColor="rgba(6,182,212,0.18)"
          />

          <FeatureSection
            side="left"
            accentColor="#10b981"
            label="SANDBOX"
            labelColor="text-emerald-400"
            headline="Run code. See results. Instantly."
            body="Prism doesn't just write code — it runs it. Python with numpy, pandas, matplotlib. JavaScript, TypeScript, Bash. Execute and verify in a secure cloud sandbox."
            bullets={[
              "Python with data science stack",
              "Real output, not simulated",
              "Secure isolated execution",
              "matplotlib charts rendered",
            ]}
            visual={<CodeTerminal />}
            blobColor="rgba(16,185,129,0.15)"
          />

          <FeatureSection
            side="right"
            accentColor="#ec4899"
            label="SEES & REMEMBERS"
            labelColor="text-pink-400"
            headline="Sees. Remembers. Understands you."
            body="Upload any image for instant analysis. Prism also builds a persistent memory of you across conversations — your name, preferences, projects, and expertise — so every interaction gets smarter."
            bullets={[
              "Image analysis with GPT-4 Vision",
              "Persistent cross-session memory",
              "Learns your preferences over time",
              "Private memory per user account",
            ]}
            visual={<MemoryMap />}
            blobColor="rgba(236,72,153,0.15)"
          />
        </div>

        <AgentSection />
        <VoiceSection />
        <StatsSection />
        <TestimonialSection />
        <FinalCTASection />
        <Footer />
      </div>
    </ReactLenis>
  );
}
