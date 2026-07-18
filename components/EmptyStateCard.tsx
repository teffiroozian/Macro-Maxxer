import type { ReactNode } from "react";

import SurfaceCard from "@/components/ui/SurfaceCard";

type EmptyStateCardVariant = "card" | "compact";
type EmptyStateCardAlign = "center" | "left";

type EmptyStateCardProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
  variant?: EmptyStateCardVariant;
  align?: EmptyStateCardAlign;
};

const alignmentClassNames: Record<EmptyStateCardAlign, string> = {
  center: "text-center",
  left: "text-left",
};

export default function EmptyStateCard({
  title,
  description,
  action,
  className = "",
  variant = "card",
  align = "center",
}: EmptyStateCardProps) {
  const alignmentClassName = alignmentClassNames[align];

  if (variant === "compact") {
    return (
      <div className={`py-4 ${alignmentClassName} ${className}`}>
        <p className="text-sm font-medium text-black/70">{title}</p>
        {description ? <p className="mt-1.5 text-sm text-slate-600">{description}</p> : null}
        {action ? <div className="mt-3">{action}</div> : null}
      </div>
    );
  }

  return (
    <SurfaceCard padding="comfortable" className={`py-8 ${alignmentClassName} ${className}`}>
      <p className="text-lg font-medium text-neutral-900">{title}</p>
      {description ? <p className="mt-2 text-sm text-neutral-600">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </SurfaceCard>
  );
}
