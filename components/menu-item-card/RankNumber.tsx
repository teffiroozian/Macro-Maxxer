/** Shared inline rank styling for restaurant items and ingredient cards. */
export default function RankNumber({ rank }: { rank: number }) {
  return <span className="font-heading shrink-0 font-bold tracking-tight text-slate-400">{rank}.</span>;
}
