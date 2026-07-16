import type { ReactNode } from "react";

type EmptyStateCardProps = {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
};

export default function EmptyStateCard({ title, description, action, className = "" }: EmptyStateCardProps) {
  return (
    <div className={`rounded-2xl border border-black/10 bg-white px-5 py-8 text-center shadow-sm ${className}`}>
      <p className="text-lg font-medium text-neutral-900">{title}</p>
      {description ? <p className="mt-2 text-sm text-neutral-600">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  );
}
