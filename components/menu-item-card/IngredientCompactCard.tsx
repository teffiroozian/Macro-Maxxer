import SurfaceCard from "@/components/ui/SurfaceCard";
import MacroStat from "@/components/nutrition/MacroStat";
import type { MenuItem } from "@/types/menu";
import Image from "next/image";
import { Lock } from "lucide-react";

type CompactOption = { id: string; label: string; disabled?: boolean };

function PortionControlsRow({
    options,
    selectedOptionId,
    onSelect,
}: {
    options: CompactOption[];
    selectedOptionId?: string;
    onSelect: (optionId: string) => void;
}) {
    return (
        <div className="inline-flex w-fit items-center gap-0.5 rounded-full bg-black/5 p-0.5">
            {options.map((variantOption) => (
                <button
                    key={variantOption.id}
                    type="button"
                    disabled={Boolean(variantOption.disabled)}
                    onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        if (!variantOption.disabled) onSelect(variantOption.id);
                    }}
                    className={`rounded-full px-2.5 py-[3px] text-[11px] font-semibold transition md:px-3.5 md:py-[5px] ${
                        selectedOptionId === variantOption.id
                            ? "bg-white text-black shadow-sm"
                            : "cursor-pointer text-black/50 hover:text-black/70"
                    } ${variantOption.disabled ? "cursor-not-allowed opacity-40" : ""}`}
                >
                    {variantOption.label}
                </button>
            ))}
        </div>
    );
}

export default function IngredientCompactCard({
    item,
    selectedItemImage,
    ingredientSelectionState,
    isIngredientSelectionDisabled,
    isIngredientLocked = false,
    ingredientSelectionControl,
    ingredientDisabledReason,
    ingredientPortionBadge,
    isIngredientUnavailable,
    ingredientUnavailableReason,
    activeCompactOptions,
    selectedCompactOptionId,
    calories,
    protein,
    carbs,
    totalFat,
    onSelectionChange,
    onCompactOptionSelect,
    // Comparison-only rendering (the "View All Ingredients" state): no
    // selection affordance, no click interaction — just the card's visual
    // design plus a category badge, since there's no per-category section
    // heading to convey that here.
    readOnly = false,
    categoryLabel,
}: {
    item: MenuItem;
    selectedItemImage?: string;
    ingredientSelectionState: boolean;
    isIngredientSelectionDisabled: boolean;
    // Fixed/non-removable included ingredient — distinct from
    // `isIngredientSelectionDisabled`, which also covers the temporary
    // "category max reached" case. Locked items get a non-interactive
    // treatment instead of the dimmed/disabled one.
    isIngredientLocked?: boolean;
    ingredientSelectionControl: "checkbox" | "radio";
    ingredientDisabledReason?: string;
    ingredientPortionBadge?: string;
    isIngredientUnavailable?: boolean;
    ingredientUnavailableReason?: string;
    activeCompactOptions?: CompactOption[];
    selectedCompactOptionId?: string;
    calories?: number;
    protein?: number;
    carbs?: number;
    totalFat?: number;
    onSelectionChange: (selected: boolean) => void;
    onCompactOptionSelect: (optionId: string) => void;
    readOnly?: boolean;
    categoryLabel?: string;
}) {
    // In the build flow, portion/variant controls only matter once an
    // ingredient is actually selected. Read-only comparison cards have no
    // selection concept at all — the control should just show whenever
    // there's more than one option to compare.
    const showControls =
        activeCompactOptions &&
        activeCompactOptions.length > 1 &&
        (ingredientSelectionState || readOnly);
    const isInteractive = !isIngredientLocked && !readOnly;

    return (
        <SurfaceCard
            as="li"
            padding="none"
            shadow="none"
            className={`list-none overflow-hidden transition duration-150 ${
                isIngredientLocked || ingredientSelectionState
                    ? "border-[1.5px] border-accent! bg-accent-soft/50 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                    : isIngredientSelectionDisabled
                      ? "border border-black/8 bg-black/[0.015] opacity-70"
                      : readOnly
                        ? "border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                        : "border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] hover:-translate-y-px hover:border-black/15 hover:shadow-[0_2px_6px_rgba(0,0,0,0.05)]"
            }`}
        >
            <div
                role={isInteractive ? ingredientSelectionControl : undefined}
                aria-checked={isInteractive ? ingredientSelectionState : undefined}
                aria-label={
                    readOnly
                        ? item.name
                        : isIngredientLocked
                          ? `${ingredientDisabledReason ?? "Included"} ${item.name}`
                          : `${isIngredientSelectionDisabled ? (ingredientUnavailableReason ?? "Unavailable") : "Select"} ${item.name}`
                }
                tabIndex={isInteractive && !isIngredientSelectionDisabled ? 0 : -1}
                className={`flex flex-col gap-2 rounded-2xl px-3 py-2.5 outline-none transition-shadow duration-100 sm:px-4 md:flex-row md:items-center md:gap-4 md:py-3 ${
                    isIngredientLocked || readOnly
                        ? "cursor-default"
                        : isIngredientSelectionDisabled
                          ? "cursor-not-allowed"
                          : "cursor-pointer"
                } ${isInteractive ? "focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2" : ""}`}
                onClick={() => {
                    if (!isInteractive || isIngredientSelectionDisabled) return;
                    const nextSelected =
                        ingredientSelectionControl === "radio"
                            ? true
                            : !ingredientSelectionState;
                    onSelectionChange(nextSelected);
                }}
                onKeyDown={(event) => {
                    if (!isInteractive || isIngredientSelectionDisabled) return;
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    const nextSelected =
                        ingredientSelectionControl === "radio"
                            ? true
                            : !ingredientSelectionState;
                    onSelectionChange(nextSelected);
                }}
            >
                {/* Image + name + controls — identical at every breakpoint.
                    The whole role div above is already the click target, so
                    there's no dedicated checkbox column; selection reads via
                    the corner indicator on the image instead. */}
                <div className="flex items-center gap-3 md:min-w-0 md:flex-1">
                    <div className="relative shrink-0">
                        {selectedItemImage ? (
                            <Image
                                src={selectedItemImage}
                                alt={item.name}
                                width={80}
                                height={80}
                                className="h-14 w-14 rounded-xl bg-image-placeholder object-cover ring-1 ring-black/5 sm:h-18 sm:w-18 md:h-20 md:w-20"
                            />
                        ) : (
                            <div className="h-14 w-14 rounded-xl bg-image-placeholder ring-1 ring-black/5 sm:h-18 sm:w-18 md:h-20 md:w-20" />
                        )}
                        {readOnly ? null : isIngredientLocked ? (
                            <span className="absolute -bottom-1 -right-1 flex items-center" aria-hidden="true">
                                <span className="relative z-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-slate-400">
                                    <Lock className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
                                </span>
                                <span className="relative z-10 -ml-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-accent">
                                    <svg viewBox="0 0 16 16" fill="none" className="h-2.5 w-2.5">
                                        <path
                                            d="M3.5 8.5L6.5 11.5L12.5 4.5"
                                            stroke="white"
                                            strokeWidth="2"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </svg>
                                </span>
                            </span>
                        ) : ingredientSelectionState ? (
                            <span
                                className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-accent"
                                aria-hidden="true"
                            >
                                <svg viewBox="0 0 16 16" fill="none" className="h-2.5 w-2.5">
                                    <path
                                        d="M3.5 8.5L6.5 11.5L12.5 4.5"
                                        stroke="white"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </svg>
                            </span>
                        ) : null}
                    </div>

                    <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex min-w-0 items-center gap-1.5">
                            <span className="font-heading min-w-0 shrink truncate text-lg font-semibold text-black md:text-xl">
                                {item.name}
                            </span>
                            {categoryLabel ? (
                                <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                    {categoryLabel}
                                </span>
                            ) : null}
                            {ingredientPortionBadge ? (
                                <span className="shrink-0 rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-black/50">
                                    {ingredientPortionBadge}
                                </span>
                            ) : null}
                        </div>

                        {showControls ? (
                            <PortionControlsRow
                                options={activeCompactOptions!}
                                selectedOptionId={selectedCompactOptionId}
                                onSelect={onCompactOptionSelect}
                            />
                        ) : null}
                    </div>
                </div>

                {/* Mobile macro row — full width, underneath a divider. */}
                <div className="flex flex-wrap items-end gap-x-5 gap-y-2 border-t border-black/[0.06] pt-2 md:hidden">
                    <MacroStat
                        macroKey="calories"
                        value={calories ?? Number.NaN}
                        labelVariant="shortLabel"
                        size="card"
                    />
                    <MacroStat macroKey="protein" value={protein ?? Number.NaN} size="card" />
                    <MacroStat macroKey="carbs" value={carbs ?? Number.NaN} size="card" />
                    <MacroStat macroKey="totalFat" value={totalFat ?? Number.NaN} size="card" />
                </div>

                {/* Desktop macro column — inline to the right, no divider. */}
                <div className="hidden items-center justify-between gap-2 border-l border-black/[0.06] pl-4 md:flex md:w-72 md:shrink-0">
                    <MacroStat
                        macroKey="calories"
                        value={calories ?? Number.NaN}
                        labelVariant="shortLabel"
                        size="ingredientCompact"
                    />
                    <MacroStat macroKey="protein" value={protein ?? Number.NaN} size="ingredientCompact" />
                    <MacroStat macroKey="carbs" value={carbs ?? Number.NaN} size="ingredientCompact" />
                    <MacroStat macroKey="totalFat" value={totalFat ?? Number.NaN} size="ingredientCompact" />
                </div>
            </div>
        </SurfaceCard>
    );
}
