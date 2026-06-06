"use client";

import { DemoChat } from "@/components/DemoChat";

/**
 * Standalone /demo route — no auth, no navbar, no sidebar.
 * Embeddable in an iframe via CSP frame-ancestors (see next.config.ts).
 * CTA links open in a new tab so they escape any embedding iframe.
 */
export default function DemoPage() {
  return (
    <div
      className="dark"
      style={{
        height: "100dvh",
        overflow: "hidden",
        background: "#000",
        position: "relative",
      }}
    >
      {/* Ambient violet blob */}
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            width: 600,
            height: 600,
            transform: "translate(-50%, -50%)",
            borderRadius: "50%",
            background: "rgba(139,92,246,0.10)",
            filter: "blur(140px)",
          }}
        />
      </div>

      {/* Main layout — centered column, full viewport height */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100dvh",
          maxWidth: 680,
          margin: "0 auto",
          padding: "12px 16px 16px",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {/* ── Header ────────────────────────────────────────────────────── */}
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            flexShrink: 0,
          }}
        >
          {/* Prism brand */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 30,
                height: 30,
                borderRadius: 8,
                background: "linear-gradient(135deg, #8b5cf6, #06b6d4)",
                color: "#fff",
                fontSize: 14,
                fontWeight: 900,
                letterSpacing: "-0.02em",
              }}
              aria-hidden="true"
            >
              P
            </div>
            <div>
              <p
                style={{
                  margin: 0,
                  fontSize: 14,
                  fontWeight: 900,
                  letterSpacing: "0.1em",
                  background: "linear-gradient(135deg, #a78bfa, #06b6d4)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                  lineHeight: 1.1,
                }}
              >
                PRISM
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: 10,
                  color: "rgba(255,255,255,0.35)",
                  letterSpacing: "0.04em",
                }}
              >
                The right model. Every time.
              </p>
            </div>
          </div>

          {/* Badge */}
          <div
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              borderRadius: 999,
              border: "1px solid rgba(139,92,246,0.35)",
              background: "rgba(139,92,246,0.08)",
              padding: "3px 10px",
              color: "#a78bfa",
              fontSize: 10,
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
            }}
          >
            <span
              style={{
                width: 5,
                height: 5,
                borderRadius: "50%",
                background: "#22c55e",
                display: "inline-block",
                animation: "ping 1.5s ease-in-out infinite",
              }}
              aria-hidden="true"
            />
            Live Demo — No signup required
          </div>
        </header>

        {/* ── Chat card — fills remaining height ────────────────────────── */}
        <div style={{ flex: 1, minHeight: 0 }}>
          <DemoChat compact={false} />
        </div>
      </div>
    </div>
  );
}
