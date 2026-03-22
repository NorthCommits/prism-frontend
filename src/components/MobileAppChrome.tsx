"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { BottomNav } from "@/components/BottomNav";
import { useMobileKeyboardOpen } from "@/hooks/useMobileKeyboardOpen";

function shouldHideNav(pathname: string) {
  return (
    pathname === "/landing" ||
    pathname === "/login" ||
    pathname.startsWith("/reset-password")
  );
}

export function MobileAppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const keyboardOpen = useMobileKeyboardOpen();
  const [narrow, setNarrow] = useState(false);

  useEffect(() => {
    const q = () => setNarrow(window.innerWidth < 768);
    q();
    window.addEventListener("resize", q);
    return () => window.removeEventListener("resize", q);
  }, []);

  const hideNav = shouldHideNav(pathname) || keyboardOpen;
  const bottomPad = narrow && !hideNav;

  return (
    <>
      <div
        className={
          bottomPad
            ? "flex min-h-0 flex-1 flex-col max-md:pb-[calc(4rem+env(safe-area-inset-bottom))]"
            : "flex min-h-0 flex-1 flex-col"
        }
      >
        {children}
      </div>
      <BottomNav keyboardOpen={keyboardOpen} />
    </>
  );
}
