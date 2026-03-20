"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { CheckCircle2, Info, XCircle } from "lucide-react";

export type ToastType = "success" | "error" | "info";

export type Toast = {
  id: string;
  message: string;
  type: ToastType;
  exiting?: boolean;
};

type ToastContextValue = {
  toasts: Toast[];
  addToast: (message: string, type: ToastType) => void;
  removeToast: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function makeId() {
  return `${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

export function ToastProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    // Animate out, then remove.
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, exiting: true } : t)));
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 200);
  }, []);

  const addToast = useCallback(
    (message: string, type: ToastType) => {
      const id = makeId();
      const toast: Toast = { id, message, type, exiting: false };
      setToasts((prev) => [...prev, toast]);

      // Auto-dismiss after 2500ms.
      window.setTimeout(() => {
        removeToast(id);
      }, 2500);
    },
    [removeToast]
  );

  // Allow toast triggers from anywhere (without passing callbacks).
  // This keeps API/UI changes minimal and avoids context plumbing.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail as {
        message: string;
        type: ToastType;
      };
      if (!detail) return;
      addToast(detail.message, detail.type);
    };
    window.addEventListener("prism-toast", handler as EventListener);
    return () => {
      window.removeEventListener("prism-toast", handler as EventListener);
    };
  }, [addToast]);

  const value = useMemo(
    () => ({ toasts, addToast, removeToast }),
    [toasts, addToast, removeToast]
  );

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>;
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return ctx;
}

export function pushToast(message: string, type: ToastType) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("prism-toast", {
      detail: { message, type },
    })
  );
}

function ToastIcon({ type }: { type: ToastType }) {
  const common = { className: "size-4 shrink-0", "aria-hidden": true as const };
  if (type === "success") return <CheckCircle2 {...common} className="size-4 text-emerald-500" />;
  if (type === "error") return <XCircle {...common} className="size-4 text-red-500" />;
  return <Info {...common} className="size-4 text-[#7c3aed]" />;
}

export function ToastContainer() {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex w-[280px] flex-col gap-3">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`prism-toast rounded-xl border px-4 py-3 shadow-lg backdrop-blur-xl ${
            t.type === "success"
              ? "border-emerald-500/30 bg-emerald-500/10 shadow-emerald-500/20"
              : t.type === "error"
              ? "border-red-500/30 bg-red-500/10 shadow-red-500/20"
              : "border-[#7c3aed]/30 bg-[#7c3aed]/10 shadow-[#7c3aed]/20"
          } ${t.exiting ? "prism-toast-exit" : "prism-toast-enter"}`}
          role="status"
          aria-live="polite"
        >
          <div className="flex items-start gap-3">
            <span
              className={`mt-1 inline-block size-2 rounded-full ${
                t.type === "success"
                  ? "bg-emerald-500"
                  : t.type === "error"
                  ? "bg-red-500"
                  : "bg-[#7c3aed]"
              }`}
              aria-hidden
            />
            <ToastIcon type={t.type} />
            <div className="min-w-0 flex-1">
              <div className="text-[14px] font-medium leading-relaxed text-foreground">
                {t.message}
              </div>
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="rounded p-1 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Dismiss toast"
            >
              <span aria-hidden className="text-sm leading-none">
                ×
              </span>
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

