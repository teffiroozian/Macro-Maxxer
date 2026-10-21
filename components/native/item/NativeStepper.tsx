const minus = <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M2 6h8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>;
const plus = <svg width="11" height="11" viewBox="0 0 12 12" fill="none" aria-hidden="true"><path d="M6 1.5v9M1.5 6h9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>;

export default function NativeStepper({ name, count, max, onDecrement, onIncrement }: {
  name: string; count: number; max: number; onDecrement: () => void; onIncrement: () => void;
}) {
  const atMin = count <= 0;
  const atMax = count >= max;
  return (
    <div className="flex h-[34px] shrink-0 items-center rounded-[17px] bg-[#f1f5f9] text-slate-900">
      <button type="button" onClick={onDecrement} disabled={atMin} aria-label={`Decrease ${name}`} className="flex h-[34px] w-8 items-center justify-center disabled:opacity-30 focus-ring">{minus}</button>
      <span aria-live="polite" aria-label={`${name}, ${count}`} className="min-w-3 text-center text-sm font-bold tabular-nums">{count}</span>
      <button type="button" onClick={onIncrement} disabled={atMax} aria-label={`Increase ${name}`} className="flex h-[34px] w-8 items-center justify-center disabled:opacity-30 focus-ring">{plus}</button>
    </div>
  );
}
