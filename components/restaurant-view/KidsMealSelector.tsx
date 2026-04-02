import Image from "next/image";
import {
  CHIPOTLE_KIDS_MEAL_OPTIONS,
  type KidsMealSelection,
} from "@/app/data/chipotleBuildConfig";

type Props = {
  selectedKidsMeal: KidsMealSelection;
  onSelectKidsMeal: (kidsMeal: KidsMealSelection) => void;
};

export default function KidsMealSelector({ selectedKidsMeal, onSelectKidsMeal }: Props) {
  return (
    <section className="mb-6">
      <p className="text-sm font-semibold text-slate-700">Choose Your Kid&apos;s Meal</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {CHIPOTLE_KIDS_MEAL_OPTIONS.map((option) => {
          const isActive = selectedKidsMeal === option.id;
          return (
            <button
              key={option.id}
              type="button"
              onClick={() => onSelectKidsMeal(option.id)}
              className={`cursor-pointer rounded-3xl border bg-white p-4 text-left transition ${
                isActive
                  ? "border-2 border-lime-500 shadow-[0_4px_12px_rgba(132,204,22,0.25)]"
                  : "border-black/10 hover:border-black/25"
              }`}
              aria-pressed={isActive}
            >
              <span className="flex items-center gap-3">
                <span
                  className={`inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
                    isActive ? "border-lime-500" : "border-slate-400"
                  }`}
                  aria-hidden="true"
                >
                  {isActive ? <span className="h-2.5 w-2.5 rounded-full bg-lime-500" /> : null}
                </span>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="relative h-20 w-full overflow-hidden rounded-2xl border border-black/5 bg-slate-50">
                    <Image src={option.imageSrc} alt={option.label} fill className="object-contain p-2" />
                  </span>
                  <span className="mt-3 block text-sm font-semibold text-slate-900">{option.label}</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
