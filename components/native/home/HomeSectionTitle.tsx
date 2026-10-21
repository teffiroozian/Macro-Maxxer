import Link from "next/link";

export default function HomeSectionTitle({ title, href }: { title: string; href?: string }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-3 px-0.5">
      <h2 className="text-lg font-bold text-slate-900">{title}</h2>
      {href ? (
        <Link
          href={href}
          className="relative inline-flex text-sm font-semibold text-accent-strong after:absolute after:-inset-y-3 after:inset-x-0 focus-ring"
        >
          See all
        </Link>
      ) : null}
    </div>
  );
}
