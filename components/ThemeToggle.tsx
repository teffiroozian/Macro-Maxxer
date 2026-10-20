"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { getTheme, setTheme, subscribeToTheme } from "@/lib/theme";

export default function ThemeToggle() {
  const theme = useSyncExternalStore(subscribeToTheme, getTheme, () => "light");

  return (
    <div role="group" aria-label="Color theme" className="inline-flex shrink-0 items-center gap-0.5 rounded-full border border-control bg-surface-subtle p-0.5">
      <button
        type="button"
        aria-label="Light mode"
        aria-pressed={theme === "light"}
        onClick={() => setTheme("light")}
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full bg-surface-card text-slate-900 shadow-elev-1 transition-colors focus-ring dark:bg-transparent dark:text-slate-400 dark:shadow-none dark:hover:bg-surface-hover dark:hover:text-slate-50"
      >
        <Sun className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        aria-label="Dark mode"
        aria-pressed={theme === "dark"}
        onClick={() => setTheme("dark")}
        className="inline-flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-slate-500 transition-colors hover:bg-surface-hover hover:text-slate-900 focus-ring dark:bg-surface-hover dark:text-slate-50 dark:shadow-elev-1"
      >
        <Moon className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
