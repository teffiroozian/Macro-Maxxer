import Image from "next/image";
import type { ChipotleKidsMealId } from "@/lib/chipotleBuild";

type Props = {
  selectedKidsMeal: ChipotleKidsMealId;
  onSelectKidsMeal: (kidsMeal: ChipotleKidsMealId) => void;
  options: Array<{ id: ChipotleKidsMealId; label: string; imageSrc: string }>;
};

export default function KidsMealSelector({ selectedKidsMeal, onSelectKidsMeal, options }: Props) {
  return (
    <section className="mb-6">
      <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Choose Your Kid&apos;s Meal</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {options.map((option) => {
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
                <span className="relative h-16 w-28 shrink-0 overflow-hidden rounded-2xl border border-black/5 bg-slate-50">
                  <Image src={option.imageSrc} alt={option.label} fill className="object-contain p-2" />
                </span>
                <span className="min-w-0 flex-1 text-sm font-semibold text-slate-900">
                  {option.label}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
