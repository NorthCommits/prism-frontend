"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<"logo" | "tagline" | "exit">("logo");

  useEffect(() => {
    // phase 1: logo appears (0ms)
    // phase 2: tagline appears (600ms)
    // phase 3: exit begins (1600ms)
    // phase 4: onComplete (2100ms)

    const t1 = setTimeout(() => setPhase("tagline"), 600);
    const t2 = setTimeout(() => setPhase("exit"), 1600);
    const t3 = setTimeout(() => onComplete(), 2100);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== "exit" ? (
        <motion.div
          key="splash"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-black"
        >
          {/* Subtle background glow — static, not animated */}
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(139,92,246,0.08) 0%, transparent 70%)",
            }}
          />

          {/* Logo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.92 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
            className="relative z-10 flex flex-col items-center gap-5"
          >
            {/* Prism icon */}
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{
                background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
                boxShadow:
                  "0 0 40px rgba(139,92,246,0.25), 0 0 80px rgba(6,182,212,0.1)",
              }}
            >
              <span
                className="font-black text-white"
                style={{ fontSize: "28px", letterSpacing: "-1px" }}
              >
                P
              </span>
            </div>

            {/* Prism wordmark */}
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: 0.2 }}
              className="font-bold tracking-wide text-white"
              style={{ fontSize: "28px", letterSpacing: "0.05em" }}
            >
              PRISM
            </motion.span>
          </motion.div>

          {/* Tagline — appears after logo settles */}
          <motion.p
            initial={{ opacity: 0, y: 6 }}
            animate={{
              opacity: phase === "tagline" ? 1 : 0,
              y: phase === "tagline" ? 0 : 6,
            }}
            transition={{ duration: 0.5, ease: "easeOut" }}
            className="absolute bottom-0 left-0 right-0 pb-16 text-center text-sm uppercase text-white/30"
            style={{ letterSpacing: "0.2em" }}
          >
            The right model. Every time.
          </motion.p>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
