"use client";

import Image from "next/image";
import {
    Bean,
    ChevronRight,
    Circle,
    Drumstick,
    LeafyGreen,
    Lock,
    RotateCcw,
    Sprout,
    SquarePlus,
    type LucideIcon,
} from "lucide-react";
import type { MenuItem } from "@/types/menu";
import type { Nutrition } from "@/types/nutrition";
import SurfaceCard from "@/components/ui/SurfaceCard";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";

type SelectedEntry = [string, { item: MenuItem; quantity: number }];
type IngredientDiffStatus = "added" | "modified";

const CATEGORY_GROUP_ICONS: Record<string, LucideIcon> = {
    proteins: Drumstick,
    rice: Sprout,
    beans: Bean,
    toppings: LeafyGreen,
    side: SquarePlus,
    other: Circle,
};

function IngredientMacroSummary({ nutrition }: { nutrition?: Nutrition }) {
    if (!nutrition) return null;

    return (
        <p className="mt-1 truncate text-[11px] font-semibold tracking-tight text-slate-400">
            <span className={macroColorTokens.calories.valueClassName}>
                {Math.round(nutrition.calories)} Cal
            </span>
            <span className="mx-1 text-slate-300">·</span>
            <span className={macroColorTokens.protein.valueClassName}>
                {Math.round(nutrition.protein)}g P
            </span>
            <span className="mx-1 text-slate-300">·</span>
            <span className={macroColorTokens.carbs.valueClassName}>
                {Math.round(nutrition.carbs)}g C
            </span>
            <span className="mx-1 text-slate-300">·</span>
            <span className={macroColorTokens.totalFat.valueClassName}>
                {Math.round(nutrition.totalFat)}g F
            </span>
        </p>
    );
}

function PresetIngredientCard({
    image,
    name,
    portionLabel,
    quantity,
    isLocked,
    diffStatus,
    nutrition,
    onClick,
}: {
    image?: string;
    name: string;
    portionLabel?: string;
    quantity: number;
    isLocked: boolean;
    diffStatus?: IngredientDiffStatus;
    nutrition?: Nutrition;
    onClick: () => void;
}) {
    return (
        <SurfaceCard
            as="li"
            padding="none"
            shadow="none"
            className="list-none overflow-hidden border border-black/10 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] transition duration-150 hover:-translate-y-px hover:border-black/15 hover:shadow-[0_2px_6px_rgba(0,0,0,0.05)]"
        >
            <div
                role="button"
                tabIndex={0}
                aria-label={`Edit ${name} in Customize`}
                onClick={onClick}
                onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    onClick();
                }}
                className="flex cursor-pointer items-center gap-3 p-3 outline-none transition-shadow duration-100 focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2"
            >
                <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-image-placeholder ring-1 ring-black/5">
                    {image ? (
                        <Image
                            src={image}
                            alt={name}
                            fill
                            sizes="56px"
                            className="object-cover"
                        />
                    ) : null}
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-1.5">
                        <p className="truncate font-heading text-[15px] font-semibold text-neutral-900 sm:text-base">
                            {name}
                        </p>
                        {portionLabel ? (
                            <span className="shrink-0 rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-black/60">
                                {portionLabel}
                            </span>
                        ) : null}
                    </div>
                    <IngredientMacroSummary nutrition={nutrition} />
                    {quantity > 1 || isLocked || diffStatus ? (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                            {quantity > 1 ? (
                                <span className="rounded-md bg-black/5 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-black/60">
                                    ×{quantity}
                                </span>
                            ) : null}
                            {isLocked ? (
                                <span className="inline-flex items-center gap-0.5 rounded-md bg-accent-soft px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-accent-strong">
                                    <Lock className="h-2.5 w-2.5" strokeWidth={2.5} />
                                    Included
                                </span>
                            ) : null}
                            {diffStatus === "added" ? (
                                <span className="rounded-md bg-success/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-success">
                                    Added
                                </span>
                            ) : diffStatus === "modified" ? (
                                <span className="rounded-md bg-warning/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-warning">
                                    Modified
                                </span>
                            ) : null}
                        </div>
                    ) : null}
                </div>
                <ChevronRight
                    className="h-4 w-4 shrink-0 text-slate-300"
                    strokeWidth={2.25}
                />
            </div>
        </SurfaceCard>
    );
}

export default function PresetBuildReview({
    groupedEntries,
    portionLabelById,
    ingredientNutritionById,
    lockedIds,
    diffStatusById,
    isCustomized,
    onResetToOriginal,
    onSelectIngredient,
}: {
    groupedEntries: Array<{
        categoryKey: string;
        categoryLabel: string;
        entries: SelectedEntry[];
    }>;
    portionLabelById: Record<string, string>;
    ingredientNutritionById: Record<string, Nutrition>;
    lockedIds: Set<string>;
    diffStatusById: Record<string, IngredientDiffStatus>;
    isCustomized: boolean;
    onResetToOriginal: () => void;
    onSelectIngredient: (ingredientId: string) => void;
}) {
    const hasEntries = groupedEntries.some(
        (group) => group.entries.length > 0,
    );

    return (
        <div>
            <div className="grid gap-4">
                <div>
                    <h2 className="font-heading text-2xl font-bold text-neutral-900 sm:text-3xl">
                        Included in this Build
                    </h2>
                    <p className="mt-1.5 text-sm text-slate-500">
                        These are the ingredients that define this preset.
                        Tap an ingredient to edit it.
                    </p>
                </div>
                {isCustomized ? (
                    <button
                        type="button"
                        onClick={onResetToOriginal}
                        className="cursor-pointer inline-flex w-fit items-center gap-1 text-sm font-semibold text-slate-500 underline decoration-slate-300 underline-offset-2 transition hover:text-slate-700 hover:decoration-slate-500"
                    >
                        <RotateCcw className="h-3.5 w-3.5" strokeWidth={2.5} />
                        Reset to Original
                    </button>
                ) : null}
            </div>

            {hasEntries ? (
                <div className="mt-10 grid gap-6">
                    {groupedEntries.map((group) => {
                        const CategoryIcon =
                            CATEGORY_GROUP_ICONS[group.categoryKey] ?? Circle;

                        return (
                            <div key={group.categoryKey}>
                                <div className="mb-3 flex items-center gap-2">
                                    <CategoryIcon
                                        className="h-4 w-4 text-slate-400"
                                        strokeWidth={2.25}
                                    />
                                    <h3 className="font-heading text-base font-bold text-neutral-900 sm:text-lg">
                                        {group.categoryLabel}
                                    </h3>
                                </div>
                                <ul className="grid grid-cols-1 gap-3 p-0 sm:grid-cols-2">
                                    {group.entries.map(
                                        ([ingredientId, entry]) => (
                                            <PresetIngredientCard
                                                key={ingredientId}
                                                image={entry.item.image}
                                                name={entry.item.name}
                                                portionLabel={
                                                    portionLabelById[
                                                        ingredientId
                                                    ]
                                                }
                                                nutrition={
                                                    ingredientNutritionById[
                                                        ingredientId
                                                    ]
                                                }
                                                quantity={entry.quantity}
                                                isLocked={lockedIds.has(
                                                    ingredientId,
                                                )}
                                                diffStatus={
                                                    diffStatusById[
                                                        ingredientId
                                                    ]
                                                }
                                                onClick={() =>
                                                    onSelectIngredient(
                                                        ingredientId,
                                                    )
                                                }
                                            />
                                        ),
                                    )}
                                </ul>
                            </div>
                        );
                    })}
                </div>
            ) : null}
        </div>
    );
}
