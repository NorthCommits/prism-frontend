"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";

type Particle = {
  id: number;
  x: number;
  y: number;
  color: string;
  size: number;
  angle: number;
  speed: number;
  opacity: number;
  rotation: number;
};

const COLORS = ["#8b5cf6", "#06b6d4", "#ec4899", "#22c55e", "#f59e0b", "#fff"];

function makeParticles(count: number): Particle[] {
  const cx = window.innerWidth / 2;
  const cy = window.innerHeight - 80;
  return Array.from({ length: count }, (_, i) => {
    const deg = 30 + Math.random() * 120;
    const angle = (deg * Math.PI) / 180;
    return {
      id: i + Date.now(),
      x: cx,
      y: cy,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 4 + Math.random() * 4,
      angle,
      speed: 3 + Math.random() * 5,
      opacity: 1,
      rotation: Math.random() * 360,
    };
  });
}

function ConfettiLayer({ count, onDone }: { count: number; onDone?: () => void }) {
  const [particles, setParticles] = useState<Particle[]>([]);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    setParticles(makeParticles(count));
  }, [count]);

  useEffect(() => {
    if (particles.length === 0) {
      onDone?.();
      return;
    }
    const tick = () => {
      setParticles((prev) => {
        const next = prev
          .map((p) => ({
            ...p,
            x: p.x + p.speed * Math.cos(p.angle),
            y: p.y - p.speed * Math.sin(p.angle),
            opacity: p.opacity - 0.015,
            rotation: p.rotation + 5,
          }))
          .filter((p) => p.opacity > 0);
        return next;
      });
      rafRef.current = window.requestAnimationFrame(tick);
    };
    rafRef.current = window.requestAnimationFrame(tick);
    return () => {
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    };
  }, [particles.length, onDone]);

  if (particles.length === 0) return null;
  return (
    <div className="pointer-events-none fixed inset-0 z-50">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
            borderRadius: 2,
            background: p.color,
            opacity: p.opacity,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
    </div>
  );
}

export function ReactionAnimation(props: {
  showConfetti: boolean;
  confettiCount?: number;
  showMilestone: boolean;
  onCloseMilestone: () => void;
}) {
  const { showConfetti, confettiCount = 60, showMilestone, onCloseMilestone } = props;

  return (
    <>
      <AnimatePresence>
        {showConfetti && (
          <motion.div
            key="confetti"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="pointer-events-none fixed inset-0 z-50"
          >
            <ConfettiLayer count={confettiCount} />
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showMilestone && (
          <motion.div
            key="milestone"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ type: "spring", stiffness: 220, damping: 20 }}
              className="w-full max-w-md rounded-2xl border border-[rgba(139,92,246,0.4)] bg-[rgba(8,8,14,0.8)] p-6 text-center shadow-[0_0_60px_rgba(139,92,246,0.3)] backdrop-blur-xl"
            >
              <div className="mb-3 text-5xl motion-safe:animate-bounce">🎉</div>
              <h3
                className="bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4] bg-clip-text text-3xl font-extrabold text-transparent"
              >
                100 Messages!
              </h3>
              <p className="mt-3 text-sm text-white/60">
                You&apos;re a Prism power user. Keep exploring!
              </p>
              <button
                type="button"
                onClick={onCloseMilestone}
                className="mt-5 inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#7c3aed] to-[#2563eb] px-5 py-2 text-sm font-medium text-white"
              >
                Continue Chatting
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

