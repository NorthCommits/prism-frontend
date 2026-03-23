"use client";

export type HapticPattern =
  | "light"
  | "medium"
  | "heavy"
  | "success"
  | "error"
  | "warning"
  | "selection"
  | "send"
  | "milestone";

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 20,
  heavy: 40,
  success: [10, 50, 10],
  error: [50, 30, 50],
  warning: [30, 20, 30],
  selection: 8,
  send: [15, 10, 15],
  milestone: [50, 30, 80, 30, 120],
};

export function haptic(type: HapticPattern = "light"): void {
  try {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;
    if (!navigator.vibrate) return;
    if (window.matchMedia("(hover: hover)").matches) return;
    navigator.vibrate(PATTERNS[type]);
  } catch {
    // Silently ignore unsupported environments.
  }
}

export const Haptics = {
  tap: () => haptic("light"),
  press: () => haptic("medium"),
  send: () => haptic("send"),
  responseComplete: () => haptic("success"),
  error: () => haptic("error"),
  sidebarOpen: () => haptic("medium"),
  sidebarClose: () => haptic("light"),
  tabSwitch: () => haptic("selection"),
  milestone: () => haptic("milestone"),
  thumbsUp: () => haptic("success"),
  thumbsDown: () => haptic("medium"),
};

