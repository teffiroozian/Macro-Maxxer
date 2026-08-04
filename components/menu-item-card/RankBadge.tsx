// Rankings-only position badge — "#1", "#2", etc. Top 3 get a slightly
// stronger (but still restrained) treatment; everything after stays a quiet
// neutral pill. No gold/silver/bronze, no trophy iconography.
export default function RankBadge({ rank, isTopRanked }: { rank: number; isTopRanked: boolean }) {
  return (
    <div
      aria-label={`Rank ${rank}`}
      className={`inline-flex w-fit items-center rounded-full px-2.5 py-1 text-sm font-bold tabular-nums ${
        isTopRanked
          ? "border border-accent/35 bg-accent-soft text-accent-strong"
          : "border border-slate-200 bg-slate-100 text-slate-500"
      }`}
    >
      <span aria-hidden="true">#{rank}</span>
    </div>
  );
}
