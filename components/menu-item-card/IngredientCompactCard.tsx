import { getRankingCardMacroKeys, resolveCardDisplayMode, type CardDisplayMode } from "@/lib/menuItemCard/rankingMacroDisplay";
import type { RankMetric } from "@/lib/menuSections/sortOptions";
import IngredientGridTitle from "./IngredientGridTitle";
import RankNumber from "./RankNumber";
import SurfaceCard from "@/components/ui/SurfaceCard";
import MacroStat from "@/components/nutrition/MacroStat";
import type { MenuItem } from "@/types/menu";
import Image from "@/components/ui/AppImage";
import { Lock } from "lucide-react";

export type CompactOption = { id: string; label: string; disabled?: boolean };

export function PortionControlsRow({
    options,
    selectedOptionId,
    onSelect,
    compact = false,
    compactMobile = false,
}: {
    compact?: boolean;
    compactMobile?: boolean;
    options: CompactOption[];
    selectedOptionId?: string;
    onSelect: (optionId: string) => void;
}) {
    return (
        <div className={`inline-flex w-fit items-center gap-0.5 rounded-full bg-black/5 p-0.5 ${compact ? "max-w-full flex-wrap" : ""}`}>
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
                    className={`inline-flex min-h-[30px] items-center justify-center rounded-full text-[11px] font-semibold transition ${compactMobile ? "max-md:min-h-7 max-md:py-0" : ""} ${compact && compactMobile ? "md:px-3 md:py-[5px]" : ""} ${compact ? "px-2 py-1" : "px-3 py-[1px] md:min-h-0 md:px-3.5 md:py-[5px]"} ${
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
    rank,
    rankMetric,
    cardDisplayOverride,
    fiber,
    layout = "list",
    compactMobileControls = false,
    item,
    domId,
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
    rank?: number;
    rankMetric?: RankMetric;
    cardDisplayOverride?: CardDisplayMode;
    fiber?: number;
    layout?: "list" | "grid";
    compactMobileControls?: boolean;
    item: MenuItem;
    // Optional scroll target id for the card's root — used by the preset
    // Overview cards' "jump to this ingredient in Customize" shortcut.
    domId?: string;
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
    const isGrid = layout === "grid";
    const macroKeys = getRankingCardMacroKeys(rankMetric, cardDisplayOverride);
    const isFiberDisplay = resolveCardDisplayMode(rankMetric, cardDisplayOverride) === "fiber";
    const values = { calories, protein, carbs, totalFat, fiber };
    const renderMacros = (size: "card" | "ingredientCompact", mobile = false) => macroKeys.map((key) => (
        <MacroStat
            key={key}
            macroKey={key}
            value={values[key] ?? Number.NaN}
            labelVariant={isFiberDisplay ? "uppercase" : key === "calories" ? "shortLabel" : "label"}
            labelStyle={!isFiberDisplay && mobile && compactMobileControls ? "ingredient" : "default"}
            size={isFiberDisplay ? (isGrid ? "gridCard" : "card") : size}
        />
    ));

    return (
        <SurfaceCard
            as="li"
            id={domId}
            padding="none"
            shadow="none"
            className={`isolate list-none scroll-mt-6 overflow-hidden transition duration-150 ${
                isIngredientLocked || ingredientSelectionState
                    ? "border-[1.5px] border-accent! bg-accent-soft/50 shadow-elev-1"
                    : isIngredientSelectionDisabled
                      ? "border border-black/8 bg-black/[0.015] opacity-70"
                      : readOnly
                        ? "border border-black/10 bg-white shadow-elev-1"
                        : "border border-black/10 bg-white shadow-elev-1 hover:-translate-y-px hover:border-black/15 hover:shadow-elev-2"
            }`}
        >
            <div
                role={isInteractive ? ingredientSelectionControl : undefined}
                aria-checked={isInteractive ? ingredientSelectionState : undefined}
                aria-disabled={isInteractive ? isIngredientSelectionDisabled : undefined}
                aria-label={
                    readOnly
                        ? item.name
                        : isIngredientLocked
                          ? `${ingredientDisabledReason ?? "Included"} ${item.name}`
                          : `${isIngredientSelectionDisabled ? (ingredientUnavailableReason ?? "Unavailable") : "Select"} ${item.name}`
                }
                tabIndex={isInteractive && !isIngredientSelectionDisabled ? 0 : -1}
                className={`flex flex-col gap-2 rounded-2xl px-3 py-2.5 outline-none transition-shadow duration-100 ${isGrid ? "h-full sm:p-4" : "min-h-[132px] sm:px-4 md:min-h-[106px] md:flex-row md:items-center md:gap-4 md:py-3"} ${
                    isIngredientLocked || readOnly
                        ? "cursor-default"
                        : isIngredientSelectionDisabled
                          ? "cursor-not-allowed"
                          : "cursor-pointer"
                } ${isInteractive ? "focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/50" : ""}`}
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
                    if (event.target !== event.currentTarget) return;
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
                <div className={`flex ${isGrid ? `w-full items-start gap-2 ${compactMobileControls ? "max-md:flex-col" : ""}` : "items-center gap-3 md:min-w-0 md:flex-1"}`}>
                    <div className="relative shrink-0">
                        {selectedItemImage ? (
                            <Image
                                src={selectedItemImage}
                                alt={item.name}
                                width={80}
                                height={80}
                                className={`rounded-xl bg-image-placeholder object-cover ring-1 ring-black/5 ${isGrid ? "h-16 w-16 sm:h-20 sm:w-20" : compactMobileControls ? "h-15 w-15 sm:h-18 sm:w-18 md:h-20 md:w-20" : "h-14 w-14 sm:h-18 sm:w-18 md:h-20 md:w-20"}`}
                            />
                        ) : (
                            <div className={`rounded-xl bg-image-placeholder ring-1 ring-black/5 ${isGrid ? "h-16 w-16 sm:h-20 sm:w-20" : compactMobileControls ? "h-15 w-15 sm:h-18 sm:w-18 md:h-20 md:w-20" : "h-14 w-14 sm:h-18 sm:w-18 md:h-20 md:w-20"}`} />
                        )}
                        {readOnly ? null : isIngredientLocked ? (
                            <span className="absolute -bottom-1 -right-1 flex items-center" aria-hidden="true">
                                <span className="relative z-0 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-slate-400">
                                    <Lock className="h-2.5 w-2.5 text-white" strokeWidth={2.5} />
                                </span>
                                <span className="relative z-[1] -ml-1.5 flex h-5 w-5 items-center justify-center rounded-full border-2 border-white bg-accent">
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

                    <div className={`flex min-w-0 flex-1 flex-col gap-1 ${isGrid ? `w-full ${compactMobileControls ? "max-md:flex-none" : ""}` : ""}`}>
                        <div className={`flex min-w-0 gap-1.5 ${isGrid ? "flex-wrap items-start" : "items-center"}`}>
                            {isGrid && compactMobileControls ? (
                                <IngredientGridTitle
                                    name={item.name}
                                    rank={rank}
                                    badge={ingredientPortionBadge}
                                    className="font-heading text-sm font-semibold text-black sm:text-base md:text-xl"
                                />
                            ) : <span className={`font-heading min-w-0 shrink font-semibold text-black ${isGrid ? `break-words text-sm sm:text-base ${compactMobileControls ? "md:text-xl" : ""}` : "truncate text-lg md:text-xl"}`}>
                                {rank !== undefined ? <><RankNumber rank={rank} />{" "}</> : null}{item.name}
                            </span>}
                            {categoryLabel ? (
                                <span className="shrink-0 rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                                    {categoryLabel}
                                </span>
                            ) : null}
                            {ingredientPortionBadge && !(isGrid && compactMobileControls) ? (
                                <span className="shrink-0 rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-black/50">
                                    {ingredientPortionBadge}
                                </span>
                            ) : null}
                        </div>

                        {showControls ? (
                            <PortionControlsRow
                                compact={isGrid}
                                compactMobile={compactMobileControls}
                                options={activeCompactOptions!}
                                selectedOptionId={selectedCompactOptionId}
                                onSelect={onCompactOptionSelect}
                            />
                        ) : null}
                    </div>
                </div>

                {/* Rows retain distributed spacing; Grid uses a wider, content-sized group. */}
                <div className={compactMobileControls
                    ? isGrid
                      ? "mt-auto flex flex-wrap justify-start gap-x-3 gap-y-2 border-t border-black/[0.06] px-1.5 pt-2 md:hidden [&>div]:flex-none [&>div]:min-w-0 [&>div]:gap-1"
                      : "flex flex-wrap items-end justify-between gap-x-5 gap-y-2 border-t border-black/[0.06] pt-2 md:hidden [&>div]:gap-1"
                    : isGrid
                      ? `grid ${isFiberDisplay ? "grid-cols-3" : "grid-cols-4"} gap-1 border-t border-black/[0.06] pt-2 md:hidden`
                      : `${isFiberDisplay ? "grid grid-cols-3" : "flex flex-wrap items-end gap-x-5 gap-y-2"} border-t border-black/[0.06] pt-2 md:hidden`}>
                    {renderMacros("card", true)}
                </div>

                {/* Desktop macro column — inline to the right, no divider. */}
                <div className={compactMobileControls
                    ? isGrid
                      ? "hidden flex-wrap justify-start gap-x-5 gap-y-2 border-t border-black/[0.06] px-1.5 pt-2 md:flex lg:gap-x-6 [&>div]:flex-none [&>div]:min-w-0"
                      : "hidden items-center justify-between gap-2 border-l border-black/[0.06] pl-4 md:flex md:w-72 md:shrink-0"
                    : isGrid ? `hidden items-center justify-between border-t border-black/[0.06] pt-2 ${isFiberDisplay ? "md:grid md:grid-cols-3" : "md:flex"}` : `hidden items-center justify-between gap-2 border-l border-black/[0.06] pl-4 md:w-72 md:shrink-0 ${isFiberDisplay ? "md:grid md:grid-cols-3" : "md:flex"}`}>
                    {renderMacros("ingredientCompact")}
                </div>
            </div>
        </SurfaceCard>
    );
}
