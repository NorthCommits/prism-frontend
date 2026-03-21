"use client";

import React, { useEffect, useRef, useState } from "react";
import { motion, useInView } from "motion/react";
import { ReactLenis } from "lenis/react";
import Link from "next/link";
import { ArrowRight, ArrowUp, Check, ChevronDown, Play, X } from "lucide-react";

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
  @keyframes lp-travel {
    0%   { left: 0; }
    100% { left: calc(100% - 10px); }
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
  .lp-glow         { animation: lp-glow 2.5s ease-in-out infinite; }
  .lp-marquee      { animation: lp-marquee 32s linear infinite; }
  .lp-travel-dot   { animation: lp-travel 2.5s ease-in-out infinite alternate; position: absolute; top: 50%; transform: translateY(-50%); }
  @keyframes lp-bounce {
    0%, 80%, 100% { transform: scale(0.75); opacity: 0.35; }
    40%            { transform: scale(1);    opacity: 1;    }
  }
  .demo-scroll::-webkit-scrollbar       { width: 4px; }
  .demo-scroll::-webkit-scrollbar-track { background: transparent; }
  .demo-scroll::-webkit-scrollbar-thumb { background: rgba(139,92,246,0.3); border-radius: 999px; }
  .demo-scroll::-webkit-scrollbar-thumb:hover { background: rgba(139,92,246,0.55); }
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

/* Interactive live demo with SSE streaming */
function LiveDemoSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const inView = useInView(sectionRef as React.RefObject<HTMLElement>, { once: true, margin: "-80px 0px" });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* Accumulate streaming tokens outside React state to avoid stale closures */
  const streamingRef = useRef("");

  type DemoMessage = { role: "user" | "assistant"; content: string; isError?: boolean };

  const [demoMessages, setDemoMessages] = useState<DemoMessage[]>([
    { role: "user", content: "What can you help me with?" },
    {
      role: "assistant",
      content:
        "I'm Prism — your intelligent AI copilot. I can write code, search the web, analyze images, remember your preferences, and tackle complex multi-step tasks. What would you like to explore?",
    },
  ]);
  const [input, setInput]                       = useState("");
  const [isLoading, setIsLoading]               = useState(false);
  const [messagesRemaining, setMessagesRemaining] = useState(3);
  const [limitReached, setLimitReached]         = useState(false);
  const [streamingContent, setStreamingContent] = useState("");

  const API_URL =
    process.env.NEXT_PUBLIC_API_URL || "https://prism-backend-sjhg.onrender.com";

  /* Auto-scroll to bottom whenever messages or streaming content updates */
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [demoMessages, streamingContent]);

  const sendMessage = async (text?: string) => {
    const messageText = (text ?? input).trim();
    if (!messageText || isLoading || limitReached) return;

    const userMsg: DemoMessage = { role: "user", content: messageText };
    setDemoMessages((prev) => [...prev, userMsg]);
    setInput("");
    setIsLoading(true);
    streamingRef.current = "";

    try {
      const response = await fetch(`${API_URL}/api/v1/demo/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageText,
          /* Send last 4 messages as context, including the one just added */
          history: [...demoMessages, userMsg].slice(-4),
        }),
      });

      if (response.status === 429) {
        setLimitReached(true);
        setMessagesRemaining(0);
        setIsLoading(false);
        return;
      }

      if (!response.ok || !response.body) throw new Error("Request failed");

      const reader  = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const lines = decoder.decode(value, { stream: true }).split("\n");
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));

            if (data.type === "metadata") {
              setMessagesRemaining(data.messages_remaining);
              if (data.limit_reached) setLimitReached(true);
            }

            if (data.type === "token") {
              streamingRef.current += data.content;
              setStreamingContent(streamingRef.current);
            }

            if (data.type === "done") {
              setDemoMessages((prev) => [
                ...prev,
                { role: "assistant", content: streamingRef.current },
              ]);
              streamingRef.current = "";
              setStreamingContent("");
              setIsLoading(false);
            }
          } catch {
            /* Skip malformed SSE lines */
          }
        }
      }
    } catch {
      setDemoMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Something went wrong. Please try again.", isError: true },
      ]);
      setIsLoading(false);
    }
  };

  /* Counter badge color: green ≥ 2, amber = 1, red = 0 */
  const counterColor =
    messagesRemaining >= 2 ? "#22c55e" : messagesRemaining === 1 ? "#f59e0b" : "#ef4444";

  const suggestedPrompts = [
    "What makes Prism unique?",
    "How does smart routing work?",
    "What can you remember about me?",
    "Tell me about agent mode",
  ];

  /* Shared styles for Prism assistant bubbles */
  const assistantBubbleStyle: React.CSSProperties = {
    background: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "18px 18px 18px 4px",
    color: "rgba(255,255,255,0.85)",
  };

  return (
    <section
      className="relative overflow-hidden border-t border-white/[0.05]"
      style={{ background: "#000" }}
    >
      {/* Centered purple blob */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="lp-blob3 absolute left-1/2 top-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[150px]"
          style={{ background: "rgba(139,92,246,0.12)" }}
        />
      </div>

      <div ref={sectionRef} className="relative mx-auto max-w-3xl px-6 py-24">
        {/* Section header */}
        <div className="mb-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="mb-4 flex items-center justify-center gap-2"
          >
            {/* Pulsing green live indicator */}
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
            </span>
            <span
              className="text-[11px] font-bold uppercase text-violet-400"
              style={{ letterSpacing: "0.2em" }}
            >
              LIVE DEMO
            </span>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="mb-3 font-black leading-[0.93] tracking-[-0.04em] text-white"
            style={{ fontSize: "clamp(28px, 4.5vw, 52px)" }}
          >
            Try Prism. Right now.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0 }}
            animate={inView ? { opacity: 1 } : {}}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-[15px] text-white/40"
          >
            No signup required. Ask anything.
          </motion.p>
        </div>

        {/* Chat window — slides up + glows on entrance */}
        <motion.div
          initial={{ opacity: 0, y: 40, boxShadow: "0 0 0px rgba(139,92,246,0)" }}
          animate={
            inView
              ? {
                  opacity: 1,
                  y: 0,
                  boxShadow: [
                    "0 0 0px rgba(139,92,246,0)",
                    "0 0 80px rgba(139,92,246,0.25)",
                    "0 0 40px rgba(139,92,246,0.1)",
                  ],
                }
              : {}
          }
          transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden rounded-[20px]"
          style={{ border: "1px solid rgba(139,92,246,0.3)", background: "rgba(0,0,0,0.85)" }}
        >
          {/* macOS-style window header */}
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}
          >
            {/* Traffic lights */}
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-full" style={{ background: "#ff5f57" }} />
              <div className="h-3 w-3 rounded-full" style={{ background: "#ffbd2e" }} />
              <div className="h-3 w-3 rounded-full" style={{ background: "#28c840" }} />
            </div>

            <span className="text-[12px] font-medium text-white/30">Prism Demo</span>

            {/* Messages remaining counter */}
            <span className="text-[11px] font-semibold" style={{ color: counterColor }}>
              {limitReached
                ? "Limit reached"
                : `${messagesRemaining} message${messagesRemaining !== 1 ? "s" : ""} remaining`}
            </span>
          </div>

          {/* Scrollable messages area */}
          <div className="demo-scroll overflow-y-auto p-5" style={{ height: "320px" }}>
            {demoMessages.map((msg, i) => (
              <div
                key={i}
                className={`mb-4 flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {msg.role === "user" ? (
                  <div
                    className="max-w-[80%] px-4 py-2.5 text-[13px] leading-relaxed text-white"
                    style={{
                      background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
                      borderRadius: "18px 18px 4px 18px",
                    }}
                  >
                    {msg.content}
                  </div>
                ) : (
                  <div className="max-w-[80%]">
                    <div className="mb-1 flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                      <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/35">
                        PRISM
                      </span>
                    </div>
                    <div
                      className="px-4 py-2.5 text-[13px] leading-relaxed"
                      style={{
                        ...assistantBubbleStyle,
                        ...(msg.isError
                          ? { borderColor: "rgba(239,68,68,0.4)", color: "rgba(239,68,68,0.85)" }
                          : {}),
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Streaming bubble: typing dots → token stream → blinking cursor */}
            {isLoading && (
              <div className="mb-4 flex justify-start">
                <div className="max-w-[80%]">
                  <div className="mb-1 flex items-center gap-1">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-white/35">
                      PRISM
                    </span>
                  </div>
                  <div className="px-4 py-2.5 text-[13px] leading-relaxed" style={assistantBubbleStyle}>
                    {streamingContent ? (
                      <>
                        {streamingContent}
                        <span className="lp-cursor ml-0.5 inline-block h-3.5 w-px bg-violet-400" />
                      </>
                    ) : (
                      /* Bouncing typing dots while waiting for first token */
                      <div className="flex items-center gap-1 py-0.5">
                        {[0, 1, 2].map((j) => (
                          <div
                            key={j}
                            className="h-1.5 w-1.5 rounded-full bg-white/40"
                            style={{ animation: `lp-bounce 1s ease-in-out ${j * 0.2}s infinite` }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>

          {/* Input row OR rate-limit CTA */}
          {limitReached ? (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, type: "spring" }}
              className="p-6 text-center"
              style={{
                background: "rgba(139,92,246,0.07)",
                borderTop: "1px solid rgba(139,92,246,0.2)",
              }}
            >
              <p className="mb-1 text-[14px] font-semibold text-white">✦ You&apos;ve tried Prism!</p>
              <p className="mb-5 text-[13px] leading-relaxed text-white/50">
                Sign up free to unlock unlimited conversations,
                <br />
                memory, voice, and more.
              </p>
              <Link
                href="/login"
                className="inline-flex items-center gap-2 rounded-full px-6 py-2.5 text-[13px] font-semibold text-white transition-opacity hover:opacity-85"
                style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
              >
                Create Free Account
                <ArrowRight size={13} />
              </Link>
            </motion.div>
          ) : (
            <div
              className="flex items-center gap-3 px-4 py-3"
              style={{
                borderTop: "1px solid rgba(255,255,255,0.06)",
                background: "rgba(255,255,255,0.02)",
              }}
            >
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder="Ask Prism anything..."
                disabled={isLoading}
                className="flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-white/25 disabled:opacity-50"
              />
              <button
                onClick={() => sendMessage()}
                disabled={!input.trim() || isLoading || limitReached}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-white transition-all hover:scale-105 hover:shadow-[0_0_12px_rgba(139,92,246,0.5)] disabled:opacity-40 disabled:hover:scale-100"
                style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
              >
                {isLoading ? (
                  /* CSS spinner — uses lp-spin keyframe via inline style to avoid display:inline-block override */
                  <div
                    className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white"
                    style={{ animation: "lp-spin 0.8s linear infinite" }}
                  />
                ) : (
                  <ArrowUp size={15} />
                )}
              </button>
            </div>
          )}
        </motion.div>

        {/* Suggested prompt chips */}
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {suggestedPrompts.map((prompt, i) => (
            <motion.button
              key={prompt}
              initial={{ opacity: 0, y: 8 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.4 + i * 0.08 }}
              onClick={() => sendMessage(prompt)}
              disabled={isLoading || limitReached}
              className="cursor-pointer rounded-full border px-4 py-2 text-[13px] text-white/60 transition-all hover:border-violet-500/50 hover:text-white disabled:opacity-40"
              style={{ borderColor: "rgba(255,255,255,0.1)", background: "rgba(255,255,255,0.02)" }}
            >
              ✦ {prompt}
            </motion.button>
          ))}
        </div>
      </div>
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

/* Preference evolution / feedback learning section */
function EvolvesWithYouSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<HTMLElement>, { once: true, margin: "-80px 0px" });

  const pills = [
    { text: "Concise answers", bg: "rgba(139,92,246,0.15)", border: "rgba(139,92,246,0.4)",  color: "#a78bfa" },
    { text: "Code over theory",  bg: "rgba(6,182,212,0.15)",   border: "rgba(6,182,212,0.4)",    color: "#22d3ee" },
    { text: "Bullet points",     bg: "rgba(236,72,153,0.15)",  border: "rgba(236,72,153,0.4)",   color: "#f472b6" },
  ];

  return (
    <section
      className="relative overflow-hidden border-t border-white/[0.05]"
      style={{ minHeight: "100vh", background: "linear-gradient(to bottom, #000 0%, #080010 50%, #000 100%)" }}
    >
      {/* Drifting blobs */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="lp-blob1 absolute -left-32 top-0 h-[500px] w-[500px] rounded-full blur-[140px]"
          style={{ background: "rgba(139,92,246,0.13)" }}
        />
        <div
          className="lp-blob2 absolute -right-32 bottom-0 h-[420px] w-[420px] rounded-full blur-[130px]"
          style={{ background: "rgba(236,72,153,0.10)" }}
        />
      </div>

      <div ref={ref} className="relative flex min-h-screen flex-col items-center justify-center px-6 py-24">
        {/* ── Text block ── */}
        <div className="mb-14 text-center">
          {/* Label */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="mb-5 text-[11px] font-bold uppercase"
            style={{
              letterSpacing: "0.2em",
              background: "linear-gradient(135deg, #a78bfa, #ec4899)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            ADAPTIVE INTELLIGENCE
          </motion.p>

          {/* Headline — staggered word reveal */}
          <h2
            className="mb-5 font-black leading-[0.93] tracking-[-0.04em] text-white"
            style={{ fontSize: "clamp(36px, 5.5vw, 64px)" }}
          >
            <WordReveal text="Gets better." baseDelay={0.1} />
            <br />
            <WordReveal text="Every conversation." baseDelay={0.25} />
          </h2>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 14 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="mx-auto max-w-md text-[15px] leading-[1.82] text-white/45"
          >
            Prism watches what you love and what you don&apos;t.
            Then silently evolves to match you perfectly.
          </motion.p>
        </div>

        {/* ── Evolution timeline ── */}
        <div className="w-full max-w-4xl">
          <div className="relative">
            {/* Connecting line — desktop only, sits behind the cards */}
            <div
              className="absolute hidden md:block"
              style={{ top: "52px", left: "calc(16.67% + 20px)", right: "calc(16.67% + 20px)", height: "1px", zIndex: 0 }}
            >
              {/* Line draws itself left-to-right */}
              <motion.div
                initial={{ scaleX: 0 }}
                animate={inView ? { scaleX: 1 } : {}}
                transition={{ duration: 0.9, delay: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="h-full"
                style={{
                  transformOrigin: "left center",
                  background: "linear-gradient(to right, rgba(255,255,255,0.1), rgba(139,92,246,0.65), rgba(6,182,212,0.65))",
                }}
              />
              {/* Dot that travels along the line */}
              <div
                className="lp-travel-dot h-2.5 w-2.5 rounded-full"
                style={{
                  background: "radial-gradient(circle, #a78bfa, #06b6d4)",
                  boxShadow: "0 0 10px rgba(139,92,246,0.9)",
                  animationPlayState: inView ? "running" : "paused",
                  animationDelay: "1.8s",
                }}
              />
            </div>

            {/* Three evolution cards */}
            <div className="relative grid grid-cols-1 gap-5 md:grid-cols-3 md:gap-6" style={{ zIndex: 1 }}>

              {/* Card 1 — Day 1 */}
              <motion.div
                initial={{ opacity: 0, x: -40 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.7, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
              >
                <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/30">
                  Day 1
                </p>
                <div
                  className="rounded-xl p-4"
                  style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.07)" }}
                >
                  <div className="mb-3 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    <span className="text-[11px] text-white/40">Prism</span>
                  </div>
                  <div className="space-y-1 text-[12px] leading-relaxed text-white/45">
                    <p>Here is a comprehensive</p>
                    <p>explanation of decorators</p>
                    <p>in Python. A decorator is</p>
                    <p>a design pattern that...</p>
                    <p className="text-white/20">[paragraph continues...]</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm">👎</span>
                  <span className="text-[11px] text-white/30">Too verbose</span>
                </div>
              </motion.div>

              {/* Card 2 — Day 7, slightly elevated */}
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.7, delay: 0.8, ease: [0.16, 1, 0.3, 1] }}
                className="md:-mt-5"
              >
                <p
                  className="mb-3 text-[11px] font-semibold uppercase tracking-widest"
                  style={{ color: "#a78bfa" }}
                >
                  Day 7
                </p>
                <div
                  className="rounded-xl p-4"
                  style={{ background: "rgba(139,92,246,0.04)", border: "1px solid rgba(139,92,246,0.18)" }}
                >
                  <div className="mb-3 flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                    <span className="text-[11px] text-white/40">Prism</span>
                  </div>
                  <div className="space-y-1 text-[12px] leading-relaxed text-white/55">
                    <p>Python decorator = wrapper</p>
                    <p>function. Example:</p>
                    <p className="mt-2 font-mono text-violet-400">@my_decorator</p>
                    <p className="font-mono text-violet-400">def hello(): ...</p>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm">👍</span>
                  <span className="text-[11px] text-white/40">Better!</span>
                </div>
              </motion.div>

              {/* Card 3 — Day 30, most elevated + glowing */}
              <motion.div
                initial={{ opacity: 0, x: 40 }}
                animate={inView ? { opacity: 1, x: 0 } : {}}
                transition={{ duration: 0.7, delay: 1.0, ease: [0.16, 1, 0.3, 1] }}
                className="md:-mt-10"
              >
                <p
                  className="mb-3 text-[11px] font-semibold uppercase tracking-widest"
                  style={{
                    background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    backgroundClip: "text",
                  }}
                >
                  Day 30
                </p>
                <div
                  className="lp-glow rounded-xl p-4"
                  style={{
                    background: "rgba(139,92,246,0.07)",
                    border: "1px solid rgba(139,92,246,0.38)",
                    boxShadow: "0 0 32px rgba(139,92,246,0.14)",
                  }}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-violet-400" />
                      <span className="text-[11px] text-white/40">Prism</span>
                    </div>
                    {/* Shimmer star signals the "evolved" state */}
                    <span className="text-[11px]" style={{ color: "#06b6d4" }}>✦</span>
                  </div>
                  <div className="space-y-1 text-[12px] leading-relaxed text-white/65">
                    <p>• Wraps a function</p>
                    <p>• Adds behavior</p>
                    <p>• @syntax is sugar</p>
                    <div className="mt-2 font-mono">
                      <p className="text-emerald-400">def decorator(func):</p>
                      <p className="text-emerald-400">&nbsp; return wrapper</p>
                    </div>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-base">👍</span>
                  <span className="text-[11px] font-medium text-white/55">Perfect for me</span>
                </div>
              </motion.div>
            </div>
          </div>

          {/* ── What Prism learned ── */}
          <div className="mt-14 text-center">
            <motion.p
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 1.1 }}
              className="mb-5 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/30"
            >
              Prism learned:
            </motion.p>

            <div className="mb-5 flex flex-wrap items-center justify-center gap-3">
              {pills.map((pill, i) => (
                <motion.span
                  key={pill.text}
                  initial={{ opacity: 0, scale: 0.8, y: 8 }}
                  animate={inView ? { opacity: 1, scale: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: 1.2 + i * 0.18, ease: [0.16, 1, 0.3, 1] }}
                  className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[12px] font-semibold"
                  style={{ background: pill.bg, border: `1px solid ${pill.border}`, color: pill.color }}
                >
                  <span style={{ fontSize: "9px" }}>✦</span>
                  {pill.text}
                </motion.span>
              ))}
            </div>

            <motion.p
              initial={{ opacity: 0 }}
              animate={inView ? { opacity: 1 } : {}}
              transition={{ duration: 0.5, delay: 1.85 }}
              className="text-[12px] text-white/25"
            >
              Automatically. From your feedback.
            </motion.p>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Competitor comparison table */
function ComparisonSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref as React.RefObject<HTMLElement>, { once: true, margin: "-60px 0px" });

  type CellValue = "check" | "cross" | "paid" | "limited";
  type DataRow   = { kind: "row";   feature: string; prism: CellValue; chatgpt: CellValue; claude: CellValue; copilot: CellValue };
  type LabelRow  = { kind: "label"; text: string };
  type TableItem = DataRow | LabelRow;

  const tableItems: TableItem[] = [
    { kind: "label", text: "Core AI Features" },
    { kind: "row", feature: "Smart Model Routing",            prism: "check", chatgpt: "cross",   claude: "cross",   copilot: "cross"   },
    { kind: "row", feature: "Live Web Search",                prism: "check", chatgpt: "paid",    claude: "paid",    copilot: "check"   },
    { kind: "row", feature: "Code Execution / Interpreter",   prism: "check", chatgpt: "paid",    claude: "paid",    copilot: "check"   },
    { kind: "row", feature: "Image Vision (Upload & Analyze)",prism: "check", chatgpt: "paid",    claude: "paid",    copilot: "check"   },
    { kind: "row", feature: "Image Generation",               prism: "check", chatgpt: "paid",    claude: "cross",   copilot: "check"   },
    { kind: "row", feature: "Cross-Session Memory",           prism: "check", chatgpt: "paid",    claude: "cross",   copilot: "cross"   },
    { kind: "row", feature: "Preference Evolution (Auto)",    prism: "check", chatgpt: "cross",   claude: "cross",   copilot: "cross"   },
    { kind: "row", feature: "Custom Instructions",            prism: "check", chatgpt: "check",   claude: "check",   copilot: "check"   },
    { kind: "row", feature: "Prompt Templates",               prism: "check", chatgpt: "cross",   claude: "cross",   copilot: "check"   },
    { kind: "row", feature: "Multi-Step Agent Mode",          prism: "check", chatgpt: "paid",    claude: "paid",    copilot: "check"   },
    { kind: "row", feature: "File Upload & Analysis",         prism: "check", chatgpt: "paid",    claude: "paid",    copilot: "check"   },
    { kind: "row", feature: "Data Visualization (Charts)",    prism: "check", chatgpt: "paid",    claude: "cross",   copilot: "cross"   },
    { kind: "row", feature: "Conversation Search",            prism: "check", chatgpt: "cross",   claude: "cross",   copilot: "cross"   },
    { kind: "label", text: "Platform & Ecosystem" },
    { kind: "row", feature: "Mobile App",                     prism: "cross", chatgpt: "check",   claude: "check",   copilot: "check"   },
    { kind: "row", feature: "API Access",                     prism: "cross", chatgpt: "paid",    claude: "paid",    copilot: "paid"    },
    { kind: "row", feature: "Plugins / Extensions",           prism: "cross", chatgpt: "paid",    claude: "cross",   copilot: "check"   },
    { kind: "row", feature: "Team Collaboration",             prism: "cross", chatgpt: "paid",    claude: "paid",    copilot: "paid"    },
    { kind: "label", text: "Prism Unique" },
    { kind: "row", feature: "Open Source",                    prism: "check", chatgpt: "cross",   claude: "cross",   copilot: "cross"   },
    { kind: "row", feature: "Free to Use",                    prism: "check", chatgpt: "limited", claude: "limited", copilot: "limited" },
    { kind: "row", feature: "Feedback-Based Learning",        prism: "check", chatgpt: "cross",   claude: "cross",   copilot: "cross"   },
  ];

  /* Renders a single table cell based on its value */
  function Cell({ value, isPrism }: { value: CellValue; isPrism?: boolean }) {
    if (value === "check") {
      return (
        <div
          className="flex h-[22px] w-[22px] items-center justify-center rounded-full"
          style={{
            background: isPrism ? "rgba(34,197,94,0.22)" : "rgba(34,197,94,0.15)",
            border: "1px solid rgba(34,197,94,0.3)",
          }}
        >
          <Check size={12} color="#22c55e" />
        </div>
      );
    }

    if (value === "paid" || value === "limited") {
      return (
        <div className="flex flex-col items-center gap-0.5">
          <div
            className="flex h-[22px] w-[22px] items-center justify-center rounded-full"
            style={{ background: "rgba(245,158,11,0.15)", border: "1px solid rgba(245,158,11,0.3)" }}
          >
            <Check size={12} color="#f59e0b" />
          </div>
          <span style={{ fontSize: "9px", color: "#f59e0b", lineHeight: 1 }}>
            {value === "paid" ? "(paid)" : "(limited)"}
          </span>
        </div>
      );
    }

    /* Cross */
    return (
      <div
        className="flex h-[22px] w-[22px] items-center justify-center rounded-full"
        style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
      >
        <X size={12} color="rgba(255,255,255,0.25)" />
      </div>
    );
  }

  /* Shared cell styles for the highlighted Prism column */
  const prismCellStyle: React.CSSProperties = {
    borderLeft: "1px solid rgba(139,92,246,0.3)",
    borderRight: "1px solid rgba(139,92,246,0.3)",
    background: "rgba(139,92,246,0.08)",
  };

  return (
    <section
      className="relative overflow-hidden border-t border-white/[0.05]"
      style={{ background: "#000" }}
    >
      {/* Subtle blob top-right */}
      <div className="pointer-events-none absolute inset-0">
        <div
          className="lp-blob2 absolute -right-32 -top-24 h-[380px] w-[380px] rounded-full blur-[130px]"
          style={{ background: "rgba(88,28,220,0.10)" }}
        />
      </div>

      <div ref={ref} className="relative mx-auto max-w-5xl px-6 py-24">
        {/* Section header */}
        <div className="mb-14 text-center">
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="mb-4 text-[11px] font-bold uppercase text-violet-400"
            style={{ letterSpacing: "0.2em" }}
          >
            COMPARISON
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.65, delay: 0.1 }}
            className="mb-4 font-black leading-[0.93] tracking-[-0.04em] text-white"
            style={{ fontSize: "clamp(32px, 5vw, 58px)" }}
          >
            Why Prism?
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mx-auto max-w-[500px] text-[15px] leading-relaxed text-white/40"
          >
            Everything you need. Nothing you don&apos;t.
          </motion.p>
        </div>

        {/* Table card — slides up on scroll */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.65, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
          className="overflow-hidden rounded-2xl"
          style={{ border: "1px solid rgba(255,255,255,0.08)", background: "rgba(255,255,255,0.02)" }}
        >
          {/* Horizontal scroll wrapper (mobile) */}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[540px] border-collapse">
              <thead>
                <tr style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
                  <th className="py-5 pl-5 pr-4 text-left text-[12px] font-medium text-white/30">
                    Feature
                  </th>

                  {/* Prism — highlighted header */}
                  <th className="px-4 py-5 text-center" style={prismCellStyle}>
                    <div className="flex flex-col items-center gap-1">
                      <span
                        className="text-[14px] font-black"
                        style={{
                          background: "linear-gradient(135deg, #a78bfa, #06b6d4)",
                          WebkitBackgroundClip: "text",
                          WebkitTextFillColor: "transparent",
                          backgroundClip: "text",
                        }}
                      >
                        PRISM
                      </span>
                      <span className="text-[10px] font-medium" style={{ color: "#a78bfa" }}>
                        ✦ Recommended
                      </span>
                    </div>
                  </th>

                  <th className="px-4 py-5 text-center text-[13px] font-semibold text-white/50">
                    ChatGPT
                  </th>
                  {/* Claude and Copilot hidden on mobile */}
                  <th className="hidden px-4 py-5 text-center text-[13px] font-semibold text-white/50 md:table-cell">
                    Claude
                  </th>
                  <th className="hidden px-4 py-5 text-center text-[13px] font-semibold text-white/50 md:table-cell">
                    Copilot
                  </th>
                </tr>
              </thead>

              <tbody>
                {(() => {
                  /* Track only data-row index for staggered animation delays */
                  let rowIdx = 0;
                  return tableItems.map((item) => {
                    if (item.kind === "label") {
                      return (
                        <tr
                          key={`label-${item.text}`}
                          style={{ borderTop: "1px solid rgba(255,255,255,0.07)" }}
                        >
                          {/* Section label spanning all columns */}
                          <td
                            colSpan={5}
                            className="py-2.5 pl-5 text-[11px] font-semibold uppercase text-white/30"
                            style={{ letterSpacing: "0.15em", background: "rgba(255,255,255,0.015)" }}
                          >
                            {item.text}
                          </td>
                        </tr>
                      );
                    }

                    const ri = rowIdx++;
                    return (
                      <motion.tr
                        key={item.feature}
                        initial={{ opacity: 0, y: 10 }}
                        animate={inView ? { opacity: 1, y: 0 } : {}}
                        transition={{ duration: 0.38, delay: 0.3 + ri * 0.04, ease: [0.16, 1, 0.3, 1] }}
                        className="transition-colors hover:bg-white/[0.02]"
                        style={{
                          background: ri % 2 !== 0 ? "rgba(255,255,255,0.01)" : "transparent",
                          borderBottom: "1px solid rgba(255,255,255,0.05)",
                        }}
                      >
                        {/* Feature name */}
                        <td className="py-4 pl-5 pr-4 text-[13px] text-white/65">
                          {item.feature}
                        </td>

                        {/* Prism cell — only green checkmarks get a scale pop */}
                        <td className="px-4 py-4 text-center" style={prismCellStyle}>
                          <div className="flex justify-center">
                            {item.prism === "check" ? (
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={inView ? { scale: [0, 1.2, 1] } : {}}
                                transition={{ duration: 0.4, delay: 0.35 + ri * 0.04 }}
                              >
                                <Cell value={item.prism} isPrism />
                              </motion.div>
                            ) : (
                              <Cell value={item.prism} isPrism />
                            )}
                          </div>
                        </td>

                        <td className="px-4 py-4 text-center">
                          <div className="flex justify-center">
                            <Cell value={item.chatgpt} />
                          </div>
                        </td>

                        {/* Hidden on mobile */}
                        <td className="hidden px-4 py-4 text-center md:table-cell">
                          <div className="flex justify-center">
                            <Cell value={item.claude} />
                          </div>
                        </td>
                        <td className="hidden px-4 py-4 text-center md:table-cell">
                          <div className="flex justify-center">
                            <Cell value={item.copilot} />
                          </div>
                        </td>
                      </motion.tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Mobile note — only shown when Claude/Copilot columns are hidden */}
        <p className="mt-3 text-center text-[11px] text-white/20 md:hidden">
          Showing key comparison · scroll right to see more
        </p>

        {/* Disclaimer */}
        <p
          className="mt-6 text-center text-[11px] leading-relaxed"
          style={{ color: "rgba(255,255,255,0.25)" }}
        >
          * Honest comparison based on publicly available free and paid tier features as of 2026.
          Prism is open source and continuously improving.
        </p>

        {/* CTA button */}
        <div className="mt-8 flex justify-center">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 rounded-full px-8 py-3 text-[14px] font-semibold text-white transition-opacity hover:opacity-85"
            style={{ background: "linear-gradient(135deg, #7c3aed, #06b6d4)" }}
          >
            Try Prism Free
            <ArrowRight size={15} />
          </Link>
        </div>
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
        <LiveDemoSection />
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
        <EvolvesWithYouSection />
        <ComparisonSection />
        <StatsSection />
        <TestimonialSection />
        <FinalCTASection />
        <Footer />
      </div>
    </ReactLenis>
  );
}
