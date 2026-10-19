import Image from "@/components/ui/AppImage";
import { LayoutGrid } from "lucide-react";
import { isChipotleEntreeId, type ChipotleEntreeId } from "@/lib/restaurantBuilders/chipotle";
import type { BuilderEntreeOption } from "@/types/builder";

import type { IngredientItem } from "@/types/menu";
import type { ChipotleBuilderConfig } from "@/lib/restaurantBuilders/chipotle";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import { formatMacroDisplayNumber } from "@/components/nutrition/macroDisplay";
import { getEntreeBaseSummary } from "./entreeBaseSummary";

type Props = {
  ingredients: IngredientItem[];
  builderConfig?: ChipotleBuilderConfig;
  entreeOptions: Record<string, BuilderEntreeOption>;
  onSelectEntree: (entree: ChipotleEntreeId) => void;
  // Trailing utility tile, not another entrée — opens the cross-entrée
  // ingredient comparison view. Omitted entirely if not wired up.
  onSelectViewAllIngredients?: () => void;
  ingredientCount?: number;
};

export default function EntreeSelectionHero({
  entreeOptions,
  ingredients,
  builderConfig,
  onSelectEntree,
  onSelectViewAllIngredients,
  ingredientCount,
}: Props) {
  return (
    <section className="flex w-full flex-col items-center pt-8 pb-12 sm:pt-10 lg:pt-12">
      <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
        Choose your entrée
      </h2>
      <p className="text-body-lg mt-3 text-center text-slate-600">
        Start your build by selecting a base.
      </p>
      <div className="mt-8 grid w-full auto-rows-fr grid-cols-1 gap-4 sm:mt-10 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(entreeOptions).map(([entreeKey, entree]) => {
          if (!isChipotleEntreeId(entreeKey)) {
            return null;
          }

          const base = getEntreeBaseSummary(entreeKey, ingredients, builderConfig);

          return (
          <button
            key={entreeKey}
            type="button"
            onClick={() => onSelectEntree(entreeKey)}
            className="flex h-full cursor-pointer flex-col items-center gap-4 rounded-3xl border border-black/15 bg-white p-4 text-center shadow-[0_8px_22px_rgba(0,0,0,0.08)] transition hover:-translate-y-px hover:shadow-elev-2 focus-ring active:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
          >
            <div className="flex h-28 w-full items-center justify-center">
              <Image
                src={entree.image}
                alt={entree.label}
                width={640}
                height={320}
                className="h-full w-full rounded-xl object-contain"
              />
            </div>
            <span className="w-full text-center text-card-title text-slate-900">{entree.label}</span>
            <div className="flex w-full flex-col rounded-3xl bg-slate-50 p-5 text-left">
              <div className="flex items-baseline justify-between gap-2 pb-4">
                <span className="text-sm font-semibold text-slate-600">Starts at</span>
                <span className="text-sm font-semibold text-slate-600"><span className="text-3xl font-bold tracking-tight text-slate-900">{base.nutrition ? formatMacroDisplayNumber(base.nutrition.calories) : "—"}</span> cal</span>
              </div>
              <div className="grid grid-cols-3 gap-2 border-y border-slate-200 py-4 text-left">
                {([['protein', 'Protein'], ['carbs', 'Carbs'], ['totalFat', 'Fat']] as const).map(([key, label]) => (
                  <div key={key}>
                    <span className={`block text-xl font-bold ${macroColorTokens[key].valueClassName}`}>{base.nutrition ? `${formatMacroDisplayNumber(base.nutrition[key])}g` : "—"}</span>
                    <span className="block text-xs font-bold uppercase text-slate-500">{label}</span>
                  </div>
                ))}
              </div>
              <div className="pt-4">
                <span className="text-xs font-bold tracking-wider text-slate-500">INCLUDES</span>
                <span className="mt-1 block text-sm leading-relaxed text-slate-700">{entreeKey === "bowl" && base.description === "No required ingredients" ? "None" : base.description}</span>
                {!base.nutrition && <span className="mt-2 block text-xs text-slate-500">Base nutrition unavailable</span>}
              </div>
            </div>
          </button>
          );
        })}
        {onSelectViewAllIngredients ? (
          <button
            type="button"
            onClick={onSelectViewAllIngredients}
            className="flex h-full cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-black/20 bg-slate-50 p-6 text-center transition hover:border-black/35 hover:bg-slate-100 focus-ring active:bg-slate-100/80"
          >
            <div className="flex h-28 w-full items-center justify-center">
              <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white ring-1 ring-black/10">
                <LayoutGrid className="h-7 w-7 text-slate-500" strokeWidth={2} aria-hidden="true" />
              </span>
            </div>
            <div className="flex flex-col items-center gap-1">
              <span className="text-xl font-semibold text-slate-900 sm:text-2xl">View All Ingredients</span>
              <span className="text-sm font-medium text-slate-500">
                {typeof ingredientCount === "number"
                  ? `Compare all ${ingredientCount} ingredients`
                  : "Compare all ingredients"}
              </span>
            </div>
          </button>
        ) : null}
      </div>
    </section>
  );
}
