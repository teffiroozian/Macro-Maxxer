import type { ReactNode } from "react";

import SurfaceCard from "@/components/ui/SurfaceCard";

type EmptyStateCardProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export default function EmptyStateCard({ title, description, action, className = "" }: EmptyStateCardProps) {
  return (
    <SurfaceCard padding="comfortable" className={`py-8 text-center ${className}`}>
      <p className="text-lg font-medium text-neutral-900">{title}</p>
      {description ? <p className="mt-2 text-sm text-neutral-600">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </SurfaceCard>
  );
}
