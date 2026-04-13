import { Pencil } from "lucide-react";

export default function CartCardActions({
  itemName,
  quantity,
  onModify,
  onIncrement,
  onDecrement,
}: {
  itemName: string;
  quantity: number;
  onModify: () => void;
  onIncrement: () => void;
  onDecrement: () => void;
}) {
  return (
    <div className="inline-flex items-center gap-2">
      <button
        type="button"
        className="inline-flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-black/15 bg-white text-slate-700 transition hover:bg-slate-100"
        onClick={(event) => { event.stopPropagation(); onModify(); }}
        aria-label={`Modify ${itemName}`}
      >
        <Pencil className="h-5 w-5" />
      </button>
      <div className="inline-flex items-center gap-2 rounded-xl border border-black/15 bg-white/90 px-2 py-1">
        <button type="button" className="h-7 w-7 cursor-pointer rounded-lg border border-black/15 bg-white text-lg leading-none" onClick={(event) => { event.stopPropagation(); onDecrement(); }} aria-label={`Decrease quantity of ${itemName}`}>-</button>
        <span className="min-w-6 text-center text-base font-bold">{quantity}</span>
        <button type="button" className="h-7 w-7 cursor-pointer rounded-lg border border-black/15 bg-white text-lg leading-none" onClick={(event) => { event.stopPropagation(); onIncrement(); }} aria-label={`Increase quantity of ${itemName}`}>+</button>
      </div>
    </div>
  );
}
