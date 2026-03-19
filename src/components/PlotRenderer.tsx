"use client";

import { useEffect, useRef } from "react";

interface PlotRendererProps {
  plot_json: {
    data: object[];
    layout: object;
  };
}

export function PlotRenderer({ plot_json }: PlotRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let isCancelled = false;

    import("plotly.js-dist-min").then((Plotly) => {
      if (isCancelled || !containerRef.current) return;
      Plotly.newPlot(
        containerRef.current!,
        (plot_json.data || []) as any,
        {
          ...(plot_json.layout as any),
          template: "plotly_dark",
          paper_bgcolor: "transparent",
          plot_bgcolor: "transparent",
          font: { color: "#e5e7eb" },
          margin: { t: 50, r: 20, b: 50, l: 50 },
        },
        { responsive: true, displayModeBar: true }
      );
    });

    return () => {
      isCancelled = true;
      if (containerRef.current) {
        import("plotly.js-dist-min").then((Plotly) => {
          Plotly.purge(containerRef.current!);
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
    <div className="w-full overflow-hidden rounded-xl border border-border bg-background/80">
      <div ref={containerRef} style={{ width: "100%", height: "400px" }} />
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

