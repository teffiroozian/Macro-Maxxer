import Image from "next/image";
import { LayoutGrid } from "lucide-react";
import { isChipotleEntreeId, type ChipotleEntreeId } from "@/lib/restaurantBuilders/chipotle";
import type { BuilderEntreeOption } from "@/types/builder";

type Props = {
  entreeOptions: Record<string, BuilderEntreeOption>;
  onSelectEntree: (entree: ChipotleEntreeId) => void;
  // Trailing utility tile, not another entrée — opens the cross-entrée
  // ingredient comparison view. Omitted entirely if not wired up.
  onSelectViewAllIngredients?: () => void;
  ingredientCount?: number;
};

export default function EntreeSelectionHero({
  entreeOptions,
  onSelectEntree,
  onSelectViewAllIngredients,
  ingredientCount,
}: Props) {
  return (
    <section className="flex w-full flex-col items-center pt-8 pb-12 sm:pt-10 lg:pt-12">
      <h2 className="text-center text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
        Choose your entrée
      </h2>
      <p className="mt-3 text-center text-base text-slate-600 sm:text-lg">
        Start your build by selecting a base.
      </p>
      <div className="mt-10 grid w-full grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Object.entries(entreeOptions).map(([entreeKey, entree]) => {
          if (!isChipotleEntreeId(entreeKey)) {
            return null;
          }

          return (
          <button
            key={entreeKey}
            type="button"
            onClick={() => onSelectEntree(entreeKey)}
            className="flex h-full cursor-pointer flex-col items-center gap-4 rounded-3xl border border-black/15 bg-white p-6 text-center shadow-[0_8px_22px_rgba(0,0,0,0.08)] transition hover:border-black/30 hover:shadow-[0_12px_26px_rgba(0,0,0,0.12)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 active:shadow-[0_4px_12px_rgba(0,0,0,0.08)]"
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
            <span className="text-xl font-semibold text-slate-900 sm:text-2xl">{entree.label}</span>
          </button>
          );
        })}
        {onSelectViewAllIngredients ? (
          <button
            type="button"
            onClick={onSelectViewAllIngredients}
            className="flex h-full cursor-pointer flex-col items-center justify-center gap-4 rounded-3xl border border-dashed border-black/20 bg-slate-50 p-6 text-center transition hover:border-black/35 hover:bg-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 active:bg-slate-100/80"
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
