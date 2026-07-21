import type { ReactNode } from "react";

import SurfaceCard from "@/components/ui/SurfaceCard";

type EmptyStateCardVariant = "default" | "compact" | "transparent";
type EmptyStateCardAlign = "center" | "left";

type EmptyStateCardProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
  variant?: EmptyStateCardVariant;
  align?: EmptyStateCardAlign;
};

const alignmentClassNames: Record<EmptyStateCardAlign, string> = {
  center: "items-center text-center",
  left: "items-start text-left",
};

const variantClassNames: Record<EmptyStateCardVariant, {
  container: string;
  icon: string;
  title: string;
  description: string;
  action: string;
}> = {
  default: {
    container: "gap-2 py-8",
    icon: "mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-2xl text-slate-700",
    title: "text-lg font-semibold text-neutral-900",
    description: "max-w-md text-sm leading-6 text-neutral-600",
    action: "mt-2",
  },
  compact: {
    container: "gap-1.5 py-4",
    icon: "mb-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-700",
    title: "text-sm font-medium text-black/70",
    description: "text-sm leading-5 text-slate-600",
    action: "mt-1.5",
  },
  transparent: {
    container: "gap-1.5 px-4 py-[18px]",
    icon: "mb-0.5 flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-lg text-slate-700",
    title: "text-sm font-medium text-black/70",
    description: "text-sm leading-5 text-slate-600",
    action: "mt-1.5",
  },
};

export default function EmptyStateCard({
  title,
  description,
  action,
  icon,
  className = "",
  variant = "default",
  align = "center",
}: EmptyStateCardProps) {
  const classes = variantClassNames[variant];
  const content = (
    <>
      {icon ? <div className={classes.icon}>{icon}</div> : null}
      <p className={classes.title}>{title}</p>
      {description ? <p className={classes.description}>{description}</p> : null}
      {action ? <div className={classes.action}>{action}</div> : null}
    </>
  );
  const contentClassName = ["flex flex-col", alignmentClassNames[align], classes.container, className]
    .filter(Boolean)
    .join(" ");

  if (variant === "transparent" || variant === "compact") {
    return <div className={contentClassName}>{content}</div>;
  }

  return (
    <SurfaceCard padding="comfortable" className={contentClassName}>
      {content}
    </SurfaceCard>
  );
}
