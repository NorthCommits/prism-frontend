"use client";

import { useEffect, useRef, useState } from "react";

interface PlotRendererProps {
  plot_json: {
    data: object[];
    layout: object;
  };
}

export function PlotRenderer({ plot_json }: PlotRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldAnimateIn, setShouldAnimateIn] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;
    let isCancelled = false;

    import("plotly.js-dist-min").then((Plotly) => {
      if (isCancelled || !containerRef.current) return;

      setShouldAnimateIn(false);

      const palette = ["#7c3aed", "#2563eb", "#06b6d4", "#10b981"];
      const dataTraces = (plot_json.data || []).map((trace, idx) => {
        // Apply Prism gradient colors only to bar traces.
        const t = trace as Record<string, unknown>;
        const traceType = typeof t.type === "string" ? t.type : undefined;
        if (traceType !== "bar") return trace;

        const marker =
          t.marker && typeof t.marker === "object"
            ? (t.marker as Record<string, unknown>)
            : {};

        return {
          ...(t as Record<string, unknown>),
          marker: {
            ...marker,
            color: palette[idx % palette.length],
          },
        };
      });

      Plotly.newPlot(
        containerRef.current!,
        dataTraces,
        {
          ...(plot_json.layout as Record<string, unknown>),
          template: "plotly_dark",
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          font: { color: "#e5e7eb" },
          margin: { t: 60, r: 40, b: 80, l: 70 },
          autosize: true,
          height: 480,
          // Explicitly clear any inherited pixel width so Plotly fills the container.
          width: undefined,
        },
        { responsive: true, displayModeBar: "hover" }
      );
      window.setTimeout(() => {
        if (!isCancelled) setShouldAnimateIn(true);
      }, 0);
    });

    return () => {
      isCancelled = true;
      // Capture the element synchronously; containerRef.current may be null
      // by the time the async import resolves on unmount.
      const el = containerRef.current;
      if (el) {
        import("plotly.js-dist-min").then((Plotly) => {
          Plotly.purge(el);
        });
      }
    };
  }, [plot_json]);

  const handleDownload = () => {
    if (!containerRef.current) return;
    import("plotly.js-dist-min").then((Plotly) => {
      Plotly.downloadImage(containerRef.current!, {
        format: "png",
        filename: "prism-chart",
      });
    });
  };

  return (
    <div
      className={`w-full rounded-xl border border-border bg-background/80 ${
        shouldAnimateIn ? "prism-plot-appear" : ""
      }`}
    >
      <div className="w-full">
        <div
          ref={containerRef}
          style={{ width: "100%", height: "500px" }}
        />
      </div>
      <div className="border-t border-border px-4 py-2">
        <button
          type="button"
          onClick={handleDownload}
          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
        >
          Download Chart
        </button>
      </div>
    </div>
  );
}

