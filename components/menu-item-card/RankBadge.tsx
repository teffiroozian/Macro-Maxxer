// Rankings-only position badge — "#1", "#2", etc, placed inline to the left
// of the item title (see MenuItemCardHeader). Solid medal fills for the top
// 3 (gold/silver/bronze, each a distinct hue so they stay legible at a
// glance) fading to the existing pale neutral slate tint from #4 on.
function getRankTierClassName(rank: number) {
  if (rank === 1) return "bg-[#C89B2B] text-white";
  if (rank === 2) return "bg-[#7D8694] text-white";
  if (rank === 3) return "bg-[#8A4B42] text-white";
  return "bg-slate-100 text-slate-500";
}

export default function RankBadge({ rank }: { rank: number }) {
  return (
    <div
      aria-label={`Rank ${rank}`}
      className={`inline-flex h-7 w-fit shrink-0 items-center rounded-full px-3 text-xs font-bold tabular-nums tracking-wide ${getRankTierClassName(rank)}`}
    >
      <span aria-hidden="true">#{rank}</span>
    </div>
  );
}
