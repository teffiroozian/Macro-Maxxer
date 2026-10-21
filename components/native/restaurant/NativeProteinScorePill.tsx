import { formatScore, getScoreTier, PILL_TIERS } from "@/lib/native/fullMenu";

export function BoltIcon({ size, color }: { size: number; color: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
  );
}

export default function NativeProteinScorePill({ score }: { score: number | undefined }) {
  const t = PILL_TIERS[getScoreTier(score)];
  return (
    <span className="inline-flex w-fit items-center gap-1.5 rounded-full py-1 pl-1 pr-2.5 text-xs leading-none" style={{ background: t.chip }} aria-hidden="true">
      <span className="flex size-4 items-center justify-center rounded-full" style={{ background: t.icon }}><BoltIcon size={10} color={t.iconFg} /></span>
      <span style={{ color: t.suffix }}>
        <b className="font-bold" style={{ color: t.value }}>{formatScore(score)}g protein</b>
        <span className="ml-0.5">/ 100 cal</span>
      </span>
    </span>
  );
}
