"use client";

import { useEffect, useState } from "react";

// True when visual viewport shrinks (e.g. virtual keyboard) on narrow screens.
export function useMobileKeyboardOpen(): boolean {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    const check = () => {
      if (window.innerWidth >= 768) {
        setOpen(false);
        return;
      }
      setOpen(vv.height < window.innerHeight * 0.72);
    };

    vv.addEventListener("resize", check);
    window.addEventListener("resize", check);
    check();

    return () => {
      vv.removeEventListener("resize", check);
      window.removeEventListener("resize", check);
    };
  }, []);

  return open;
}
