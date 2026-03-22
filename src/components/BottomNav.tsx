"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FolderOpen, MessageSquare, Search, User } from "lucide-react";
import { motion } from "motion/react";

type BottomNavProps = {
  keyboardOpen: boolean;
};

function shouldHideForPath(pathname: string) {
  return (
    pathname === "/landing" ||
    pathname === "/login" ||
    pathname.startsWith("/reset-password")
  );
}

export function BottomNav({ keyboardOpen }: BottomNavProps) {
  const pathname = usePathname();
  const router = useRouter();

  if (keyboardOpen || shouldHideForPath(pathname)) {
    return null;
  }

  const chatActive = pathname === "/";
  const projectsActive =
    pathname === "/projects" || pathname.startsWith("/projects/");
  const profileActive = pathname === "/profile";

  const activeIconClass = "text-[#c4b5fd]";

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 hidden h-16 max-md:flex max-md:flex-row items-stretch justify-around border-t border-white/[0.06] bg-black/95 pb-[env(safe-area-inset-bottom)] backdrop-blur-xl"
      aria-label="Primary"
    >
      <motion.div className="flex min-w-0 flex-1" whileTap={{ scale: 0.9 }}>
        <Link
          href="/"
          className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5"
          aria-current={chatActive ? "page" : undefined}
        >
          {chatActive && (
            <span className="absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4]" />
          )}
          <MessageSquare
            className={`size-5 ${chatActive ? activeIconClass : "text-white/40"}`}
            strokeWidth={2}
          />
          <span
            className={`text-xs font-medium ${chatActive ? "text-[#c4b5fd]" : "text-white/40"}`}
          >
            Chat
          </span>
        </Link>
      </motion.div>

      <motion.div className="flex min-w-0 flex-1" whileTap={{ scale: 0.9 }}>
        <Link
          href="/projects"
          className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5"
          aria-current={projectsActive ? "page" : undefined}
        >
          {projectsActive && (
            <span className="absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4]" />
          )}
          <FolderOpen
            className={`size-5 ${projectsActive ? activeIconClass : "text-white/40"}`}
            strokeWidth={2}
          />
          <span
            className={`text-xs font-medium ${projectsActive ? "text-[#c4b5fd]" : "text-white/40"}`}
          >
            Projects
          </span>
        </Link>
      </motion.div>

      <motion.button
        type="button"
        className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5"
        onClick={() => router.push("/?search=true")}
        whileTap={{ scale: 0.9 }}
      >
        <Search className="size-5 text-white/40" strokeWidth={2} />
        <span className="text-xs font-medium text-white/40">
          Search
        </span>
      </motion.button>

      <motion.div className="flex min-w-0 flex-1" whileTap={{ scale: 0.9 }}>
        <Link
          href="/profile"
          className="relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5"
          aria-current={profileActive ? "page" : undefined}
        >
          {profileActive && (
            <span className="absolute -top-0.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full bg-gradient-to-r from-[#8b5cf6] to-[#06b6d4]" />
          )}
          <User
            className={`size-5 ${profileActive ? activeIconClass : "text-white/40"}`}
            strokeWidth={2}
          />
          <span
            className={`text-xs font-medium ${profileActive ? "text-[#c4b5fd]" : "text-white/40"}`}
          >
            Profile
          </span>
        </Link>
      </motion.div>
    </nav>
  );
}
