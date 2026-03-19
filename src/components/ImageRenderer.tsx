"use client";

import { useState } from "react";

type ImageRendererProps = {
  image_url: string;
};

export function ImageRenderer({ image_url }: ImageRendererProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const handleDownload = () => {
    if (!image_url) return;
    window.open(image_url, "_blank", "noopener,noreferrer");
  };

  if (hasError) {
    return (
      <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-[12px] text-destructive">
        Image could not be loaded.
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="relative w-full max-h-[512px] overflow-hidden rounded-xl border border-border bg-muted/40">
        {!isLoaded && (
          <div className="flex h-[280px] w-full items-center justify-center bg-muted/40 text-[11px] text-muted-foreground">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-border border-t-transparent" />
          </div>
        )}
        <img
          src={image_url}
          alt="Prism generated"
          className={`h-auto w-full object-contain transition-opacity duration-200 ${
            isLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setIsLoaded(true)}
          onError={() => setHasError(true)}
        />
      </div>
      <div className="mt-2 flex justify-end">
        <button
          type="button"
          onClick={handleDownload}
          className="inline-flex items-center gap-1 rounded-full border border-border bg-background/80 px-3 py-1 text-[11px] text-muted-foreground hover:bg-muted"
        >
          <span>Download image</span>
        </button>
      </div>
    </div>
  );
}

