import { LoaderCircle, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import SavedMacros from "@/components/native/saved/SavedMacros";
import SavedPhoto from "@/components/native/saved/SavedPhoto";
import { card, muted, soft } from "@/components/native/saved/savedStyles";
import { formatCartItemName } from "@/lib/cart/displayLabels";
import { customizationLine } from "@/lib/native/savedLibrary";
import type { CartItem } from "@/types/cart";

const action = `flex h-11 cursor-pointer items-center gap-1.5 px-1 text-[15px] font-semibold active:opacity-60 disabled:opacity-50 focus-ring ${soft}`;
const step = "flex h-11 w-9 cursor-pointer items-center justify-center rounded-full active:opacity-60 disabled:opacity-35 focus-ring min-[375px]:w-[42px]";

export default function OrderItemCard({ item, loading, onEdit, onRemove, onQuantity }: {
  item: CartItem;
  loading: boolean;
  onEdit: () => void;
  onRemove: () => void;
  onQuantity: (quantity: number) => void;
}) {
  const name = formatCartItemName(item);
  return (
    <article aria-label={name} className={`rounded-3xl px-3 pb-1.5 pt-3 ${card}`}>
      <div className="flex items-center gap-3.5">
        <SavedPhoto item={item} className="size-16 shrink-0 rounded-[18px] min-[375px]:size-[88px]" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate text-base font-bold leading-5">{name}</h3>
          <p className={`mt-0.5 truncate text-sm leading-[18px] ${muted}`}>{customizationLine({ ...item, quantity: 1 })}</p>
          <SavedMacros items={[item]} size="sm" className="mt-2.5" />
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 pl-0.5 min-[375px]:gap-4">
        <button type="button" aria-label={`Edit ${name}`} aria-busy={loading} disabled={loading} onClick={onEdit} className={action}>
          {loading ? <LoaderCircle size={16} strokeWidth={2.3} className="animate-spin motion-reduce:animate-none" aria-hidden="true" /> : <Pencil size={16} strokeWidth={2.3} aria-hidden="true" />}Edit
        </button>
        <button type="button" aria-label={`Remove ${name}`} onClick={onRemove} className={action}>
          <Trash2 size={16} strokeWidth={2.3} aria-hidden="true" />Remove
        </button>
        <div className="ml-auto flex shrink-0 items-center rounded-full bg-slate-100 dark:bg-surface-hover">
          <button type="button" aria-label={`One fewer ${name}`} disabled={item.quantity <= 1} onClick={() => onQuantity(item.quantity - 1)} className={step}><Minus size={14} strokeWidth={3} aria-hidden="true" /></button>
          <span aria-live="polite" aria-label={`${name}, quantity ${item.quantity}`} className="min-w-5 text-center text-base font-bold tabular-nums">{item.quantity}</span>
          <button type="button" aria-label={`One more ${name}`} onClick={() => onQuantity(item.quantity + 1)} className={step}><Plus size={14} strokeWidth={3} aria-hidden="true" /></button>
        </div>
      </div>
    </article>
  );
}
