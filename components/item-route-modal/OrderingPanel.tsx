"use client";

import { useEffect, useRef, useState } from "react";
import type { CartItem } from "@/types/cart";
import type { MenuItem } from "@/types/menu";
import type { OrderingPlan, SavedOrdering } from "@/types/ordering";
import { useCart } from "@/stores/cartStore";
import { useCartAddConfirmation } from "@/components/CartAddConfirmationContext";
import { buildOrderingCartPayload } from "@/lib/ordering/cart";
import { canRestoreSavedOrdering, evaluateOrdering, updateOrderingQuantities, type ActiveOrderingGroup } from "@/lib/ordering/evaluate";
import { getCustomizationLabels } from "@/lib/cart/customizationLabels";

function ChoiceGroups({
  groups, onChange,
}: { groups: ActiveOrderingGroup[]; onChange: (changes: SavedOrdering["quantities"]) => void }) {
  return groups.map(({ group, options, path }) => (
    <fieldset key={path} className="space-y-2 rounded-lg border border-divider p-3">
      <legend className="px-1 font-semibold">{group.label}</legend>
      {options.map(({ option, path: optionPath, quantity, instances }) => (
        <div key={optionPath}>
          <label className="flex items-center justify-between gap-3">
            <span>{option.label}</span>
            {(group.selectionMode === "single-component" || (group.min === 1 && group.max === 1)) ? (
              <input
                type="radio"
                name={path}
                checked={quantity === 1}
                onChange={() => onChange(Object.fromEntries(options.map((entry) => [entry.path, Number(entry.path === optionPath)])))}
              />
            ) : (
              <input
                type="number"
                className="w-16 rounded border border-divider bg-transparent p-1"
                value={quantity}
                min={option.min ?? 0}
                max={option.max ?? group.max ?? undefined}
                onChange={(event) => {
                  const next = event.currentTarget.valueAsNumber;
                  if (Number.isSafeInteger(next)) onChange({ [optionPath]: next });
                }}
              />
            )}
          </label>
          {instances.map(({ path, children }, index) => children.length > 0 && (
            <div key={path} className="my-2 space-y-2 pl-3">
              {option.independentCopies && instances.length > 1 && <p className="text-sm font-medium">{option.label} {index + 1}</p>}
              <ChoiceGroups groups={children} onChange={onChange} />
            </div>
          ))}
        </div>
      ))}
    </fieldset>
  ));
}

export default function OrderingPanel({
  item, plan, restaurantId, savedItem, initialMode, onBack, onClose,
}: {
  item: MenuItem;
  plan?: OrderingPlan;
  restaurantId: string;
  savedItem: CartItem | null;
  initialMode?: "preview" | "edit";
  onBack?: () => void;
  onClose: () => void;
}) {
  const saved = savedItem?.selection.type === "standard" ? savedItem.selection.ordering : undefined;
  const [quantities, setQuantities] = useState(saved?.quantities ?? {});
  const [quantity, setQuantity] = useState(savedItem?.quantity ?? 1);
  const [editing, setEditing] = useState(!saved || initialMode !== "preview");
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeButton.current?.focus(); }, []);
  const { updateItem } = useCart();
  const { requestAddItem } = useCartAddConfirmation();
  const compatible = plan && (!saved || canRestoreSavedOrdering(plan, saved));
  const editable = editing && compatible;
  const result = editable ? evaluateOrdering(plan, quantities) : undefined;
  const nutrition = result?.nutrition ?? (!editable ? savedItem?.nutritionPerItem : undefined);

  function save() {
    if (!editable || !plan) return;
    const payload = buildOrderingCartPayload(item, plan, quantities, quantity);
    if (!payload) return;
    if (savedItem) updateItem(savedItem.id, payload);
    else requestAddItem({ ...payload, restaurantId, id: crypto.randomUUID() });
    onClose();
  }

  return (
    <section className="relative z-30 flex min-h-0 flex-1 flex-col overflow-auto bg-white p-5 dark:bg-surface-card" aria-label="Source ordering">
      <div className="mb-4 flex items-start justify-between gap-4">
        <h2 className="text-xl font-semibold">{item.name}</h2>
        <button type="button" ref={closeButton} className="underline" onClick={onBack ?? onClose}>{onBack ? "Back to menu options" : "Close"}</button>
      </div>
      {result && plan ? (
        <div className="space-y-3">
          <p className="text-sm">Source ordering preview. The regular menu offers the full set of app options.</p>
          <ChoiceGroups groups={result.groups} onChange={(changes) => setQuantities((current) => updateOrderingQuantities(plan, current, changes))} />
          <label className="flex items-center gap-3">
            Meal quantity
            <input type="number" min={1} className="w-16 rounded border border-divider bg-transparent p-1" value={quantity}
              onChange={(event) => { if (event.currentTarget.valueAsNumber >= 1) setQuantity(event.currentTarget.valueAsNumber); }} />
          </label>
          {result.errors.length > 0 && <ul role="status" className="text-sm">{result.errors.map((error) => <li key={error}>{error}</li>)}</ul>}
        </div>
      ) : (
        <div>
          {!compatible && <p>This saved configuration is available to review. Editing requires the same ordering preview.</p>}
          {compatible && <button type="button" className="underline" onClick={() => setEditing(true)}>Edit selections</button>}
          <ul>{getCustomizationLabels(savedItem?.customizations)?.map((label, index) => <li key={index}>{label}</li>)}</ul>
        </div>
      )}
      {nutrition && (
        <p aria-live="polite" className="my-4">
          {nutrition.calories} cal · {nutrition.protein} g protein · {nutrition.carbs} g carbs · {nutrition.totalFat} g fat
          {nutrition.sodium !== undefined && <> · {nutrition.sodium} mg sodium</>}
        </p>
      )}
      {result && <button type="button" className="rounded bg-black px-4 py-2 text-white disabled:opacity-50"
        disabled={!result.nutrition || !Number.isSafeInteger(quantity)} onClick={save}>{savedItem ? "Update meal" : "Add to Meal"}</button>}
    </section>
  );
}
