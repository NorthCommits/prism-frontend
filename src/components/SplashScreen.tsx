"use client";

import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

const SPLASH_STORAGE_KEY = "prism_splash_shown";
const SPLASH_TOTAL_VISIBLE_MS = 4000;
const SPLASH_FADE_MS = 500;

type SplashScreenProps = {
  onEnter?: () => void;
};

export function SplashScreen({ onEnter }: SplashScreenProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showTitle, setShowTitle] = useState(false);
  const [showTagline, setShowTagline] = useState(false);
  const [taglineLeaving, setTaglineLeaving] = useState(false);
  const [showButton, setShowButton] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const hasShown = window.sessionStorage.getItem(SPLASH_STORAGE_KEY) === "1";
    if (hasShown) {
      return;
    }

    setIsVisible(true);
    setShowTitle(true);

    const taglineInTimer = window.setTimeout(() => {
      setShowTagline(true);
    }, 500);

    const taglineOutTimer = window.setTimeout(() => {
      setTaglineLeaving(true);
    }, 2000);

    const buttonInTimer = window.setTimeout(() => {
      setShowButton(true);
    }, 2400);

    return () => {
      window.clearTimeout(taglineInTimer);
      window.clearTimeout(taglineOutTimer);
      window.clearTimeout(buttonInTimer);
    };
  }, []);

  const handleDismissNow = () => {
    if (typeof window === "undefined") return;
    onEnter?.();
    window.sessionStorage.setItem(SPLASH_STORAGE_KEY, "1");
    setIsFadingOut(true);
    window.setTimeout(() => {
      setIsVisible(false);
    }, 300);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      className={`fixed inset-0 z-[9999] flex h-screen w-screen items-center justify-center bg-[#0a0a0f] bg-[radial-gradient(circle_at_center,_#7c3aed,_#2563eb,_#06b6d4_60%)] transition-opacity duration-500 ${
        isFadingOut ? "opacity-0" : "opacity-100"
      }`}
    >
      <div className="flex w-full max-w-xl flex-col items-center gap-8 px-6 text-center text-white">
        <div className="space-y-4">
          <h1
            className={`bg-gradient-to-r from-violet-300 via-sky-200 to-cyan-200 bg-clip-text text-5xl font-bold tracking-tight text-transparent sm:text-6xl transition-all duration-600 ease-out ${
              showTitle ? "translate-y-0 scale-100 opacity-100" : "translate-y-2 scale-95 opacity-0"
            } animate-[prism-shimmer_2.4s_linear_infinite]`}
          >
            Prism
          </h1>
          <p
            className={`text-base text-white/70 sm:text-lg transition-all duration-400 ease-out ${
              showTagline && !taglineLeaving
                ? "translate-x-0 opacity-100"
                : taglineLeaving
                ? "-translate-x-full opacity-0"
                : "translate-x-2 opacity-0"
            }`}
          >
            The right model. Every time.
          </p>
        </div>

        {showButton && (
          <button
            type="button"
            onClick={handleDismissNow}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/70 bg-white/90 px-8 py-3 text-lg font-medium text-slate-900 shadow-md transition-transform transition-shadow duration-200 hover:scale-[1.03] hover:shadow-[0_0_25px_rgba(248,250,252,0.55)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70"
          >
            <span>Let&apos;s Chat</span>
            <ArrowRight className="size-5" />
          </button>
        )}
      </div>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 h-1.5 bg-white/10">
        <div className="h-full w-0 bg-gradient-to-r from-violet-400 via-sky-400 to-cyan-300 transition-[width] duration-[2500ms] ease-out [animation:prism-progress_2.5s_forwards]" />
      </div>
    </div>
  );
}

