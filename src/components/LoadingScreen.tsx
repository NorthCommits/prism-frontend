"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import { CheckCircle } from "lucide-react";

const NEW_USER_STEPS = [
  "Setting up your workspace",
  "Loading your conversations",
  "Preparing smart suggestions",
  "Personalizing your experience",
  "Almost ready!",
];

export interface LoadingScreenProps {
  isNewUser?: boolean;
  userName?: string;
  onComplete: () => void;
  progress?: number;
}

export function LoadingScreen({
  isNewUser = false,
  userName = "",
  onComplete,
  progress = 0,
}: LoadingScreenProps) {
  const [barFlash, setBarFlash] = useState(false);
  const [exiting, setExiting] = useState(false);
  const [visibleSteps, setVisibleSteps] = useState(1);
  const completedRef = useRef(false);
  const p = Math.min(100, Math.max(0, progress));

  useEffect(() => {
    if (!isNewUser) return;
    const timers: number[] = [];
    for (let i = 2; i <= NEW_USER_STEPS.length; i++) {
      timers.push(
        window.setTimeout(() => setVisibleSteps(i), 400 * (i - 1))
      );
    }
    return () => timers.forEach(clearTimeout);
  }, [isNewUser]);

  useEffect(() => {
    if (p < 100 || exiting || completedRef.current) return;
    setBarFlash(true);
    const t = window.setTimeout(() => setBarFlash(false), 200);
    const t2 = window.setTimeout(() => setExiting(true), 500);
    return () => {
      window.clearTimeout(t);
      window.clearTimeout(t2);
    };
  }, [p, exiting]);

  useEffect(() => {
    if (!exiting || completedRef.current) return;
    const t = window.setTimeout(() => {
      if (!completedRef.current) {
        completedRef.current = true;
        onComplete();
      }
    }, 500);
    return () => window.clearTimeout(t);
  }, [exiting, onComplete]);

  const stepBucket = Math.min(
    NEW_USER_STEPS.length,
    Math.floor(p / 20)
  );

  return (
    <>
      <style>{`
        @keyframes ls-blob-drift-1 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        @keyframes ls-blob-drift-2 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(-25px, 35px) scale(0.95); }
          66% { transform: translate(20px, -30px) scale(1.08); }
        }
        @keyframes ls-blob-drift-3 {
          0%, 100% { transform: translate(0, 0) scale(1); }
          50% { transform: translate(15px, 25px) scale(1.05); }
        }
        @keyframes ls-step-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.8); }
        }
        @keyframes ls-dot-bounce {
          0%, 80%, 100% { transform: scale(0.75); opacity: 0.35; }
          40% { transform: scale(1); opacity: 1; }
        }
        .ls-blob-1 { animation: ls-blob-drift-1 20s ease-in-out infinite; }
        .ls-blob-2 { animation: ls-blob-drift-2 25s ease-in-out infinite; }
        .ls-blob-3 { animation: ls-blob-drift-3 15s ease-in-out infinite; }
        .ls-step-pulse { animation: ls-step-pulse 1.2s ease-in-out infinite; }
        .ls-dot { animation: ls-dot-bounce 1s ease-in-out infinite; }
      `}</style>
      <motion.div
        className="fixed inset-0 flex flex-col bg-black text-white"
        style={{ zIndex: 10000 }}
        initial={false}
        animate={
          exiting
            ? {
                opacity: 0,
                scale: 1.05,
                filter: "blur(8px)",
              }
            : { opacity: 1, scale: 1, filter: "blur(0px)" }
        }
        transition={{ duration: 0.5, ease: "easeIn" }}
      >
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div
            className="ls-blob-1 absolute -left-32 -top-32 h-[420px] w-[420px] rounded-full blur-3xl"
            style={{ background: "#8b5cf6", opacity: 0.15 }}
          />
          <div
            className="ls-blob-2 absolute -bottom-24 -right-24 h-[380px] w-[380px] rounded-full blur-3xl"
            style={{ background: "#06b6d4", opacity: 0.15 }}
          />
          <div
            className="ls-blob-3 absolute left-1/2 top-1/2 h-[360px] w-[360px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
            style={{ background: "#ec4899", opacity: 0.12 }}
          />
        </div>

        <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
          <motion.h1
            className="mb-10 text-center font-black tracking-[0.1em]"
            style={{
              fontSize: 48,
              background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 200,
              damping: 20,
              duration: 0.6,
            }}
          >
            PRISM
          </motion.h1>

          {isNewUser ? (
            <ul className="w-full max-w-sm space-y-3">
              {NEW_USER_STEPS.map((label, index) => {
                const revealed = index < visibleSteps;
                const done = p >= 100 || index < stepBucket;
                const active =
                  p < 100 && index === stepBucket && index < NEW_USER_STEPS.length;
                const pending = !done && !active;

                if (!revealed) return null;

                return (
                  <motion.li
                    key={label}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: index * 0.05 }}
                    className="flex items-center gap-3"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center">
                      {done ? (
                        <motion.span
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{
                            type: "spring",
                            stiffness: 400,
                            damping: 18,
                          }}
                        >
                          <CheckCircle
                            className="size-5 text-[#22c55e]"
                            strokeWidth={2}
                          />
                        </motion.span>
                      ) : active ? (
                        <span className="ls-step-pulse h-2.5 w-2.5 rounded-full bg-violet-500" />
                      ) : (
                        <span className="h-2.5 w-2.5 rounded-full bg-white/20" />
                      )}
                    </span>
                    <span
                      className="text-sm"
                      style={{
                        opacity: done ? 0.7 : active ? 1 : pending ? 0.3 : 0.3,
                      }}
                    >
                      {label}
                    </span>
                  </motion.li>
                );
              })}
            </ul>
          ) : (
            <div className="flex max-w-md flex-col items-center text-center">
              <p className="text-lg font-medium text-white/90">
                Welcome back
                {userName ? `, ${userName}` : ""}!
              </p>
              <p className="mt-2 text-sm text-white/45">
                Loading your workspace...
              </p>
              <div className="mt-6 flex items-center gap-1.5">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="ls-dot h-2 w-2 rounded-full bg-violet-500"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        <div
          className="relative z-10 h-0.5 w-full shrink-0 bg-white/[0.06]"
          style={{
            boxShadow:
              p >= 90
                ? "0 0 12px rgba(139,92,246,0.45)"
                : "0 0 6px rgba(139,92,246,0.2)",
            transition: "box-shadow 0.3s ease",
          }}
        >
          <motion.div
            className="h-full"
            style={{
              background: "linear-gradient(90deg, #8b5cf6, #06b6d4)",
              width: `${p}%`,
              opacity: barFlash ? 0.5 : 1,
              transition: "width 0.3s ease, opacity 0.15s ease",
            }}
          />
        </div>

        <p
          className="relative z-10 pb-6 pt-4 text-center text-[11px]"
          style={{ color: "rgba(255,255,255,0.2)" }}
        >
          Prism v1.0
        </p>
      </motion.div>
    </>
  );
}
