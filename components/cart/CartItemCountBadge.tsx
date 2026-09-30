export default function CartItemCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;

  return (
    <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] font-bold leading-none tabular-nums text-white">
      {count > 99 ? "99+" : count}
    </span>
  );
}
