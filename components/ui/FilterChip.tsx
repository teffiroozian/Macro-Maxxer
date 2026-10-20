import type { ButtonHTMLAttributes } from "react";

type FilterChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

const baseClassName =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition focus-ring disabled:cursor-not-allowed disabled:opacity-50";

export function filterChipClassName({
  active = false,
  className = "",
}: {
  active?: boolean;
  className?: string;
} = {}) {
  return [
    baseClassName,
    active
      ? "border-accent bg-accent text-white dark:text-slate-950 hover:bg-accent-strong active:bg-accent-strong focus-visible:outline-accent-strong"
      : "border-black/20 dark:border-control bg-white dark:bg-surface-card text-black/80 dark:text-slate-200 hover:bg-black/5 dark:hover:bg-surface-hover",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function FilterChip({ active = false, className, type = "button", ...props }: FilterChipProps) {
  return <button type={type} className={filterChipClassName({ active, className })} {...props} />;
}
