import { Pencil } from "lucide-react";
import QuantityStepper from "@/components/QuantityStepper";
import AppIconButton from "@/components/ui/AppIconButton";

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
      <AppIconButton
        size="md"
        onClick={(event) => { event.stopPropagation(); onModify(); }}
        aria-label={`Modify ${itemName}`}
        className="border-black/15"
      >
        <Pencil className="h-5 w-5" />
      </AppIconButton>
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
