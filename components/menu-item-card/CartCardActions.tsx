import { Pencil } from "lucide-react";
import QuantityStepper from "@/components/QuantityStepper";

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
      <QuantityStepper
        value={quantity}
        onDecrement={(event) => { event.stopPropagation(); onDecrement(); }}
        onIncrement={(event) => { event.stopPropagation(); onIncrement(); }}
        decrementLabel={`Decrease quantity of ${itemName}`}
        incrementLabel={`Increase quantity of ${itemName}`}
        variant="cartCard"
      />
    </div>
  );
}
