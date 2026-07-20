import type { ButtonHTMLAttributes } from "react";

type FilterChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

const baseClassName =
  "inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:cursor-not-allowed disabled:opacity-50";

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
      ? "border-black/80 bg-black/85 text-white hover:bg-black"
      : "border-black/20 bg-white text-black/80 hover:bg-black/5",
    className,
  ]
    .filter(Boolean)
    .join(" ");
}

export default function FilterChip({ active = false, className, type = "button", ...props }: FilterChipProps) {
  return <button type={type} className={filterChipClassName({ active, className })} {...props} />;
}
