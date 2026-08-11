import Image from "next/image";
import { Check } from "lucide-react";
import type { ChipotleKidsMealId } from "@/lib/restaurantBuilders/chipotle";
import SectionEyebrow from "@/components/ui/SectionEyebrow";

type Props = {
  selectedKidsMeal: ChipotleKidsMealId;
  onSelectKidsMeal: (kidsMeal: ChipotleKidsMealId) => void;
  options: Array<{ id: ChipotleKidsMealId; label: string; image: string }>;
};

export default function KidsMealSelector({ selectedKidsMeal, onSelectKidsMeal, options }: Props) {
  return (
    <section className="mb-6">
      <SectionEyebrow as="h2" className="mb-2 text-xs">
        Choose Your Kid&apos;s Meal
      </SectionEyebrow>
      <div
        role="radiogroup"
        aria-label="Kid's Meal type"
        className="grid grid-cols-2 gap-1 rounded-2xl border border-black/10 bg-slate-50 p-1"
      >
        {options.map((option) => {
          const isActive = selectedKidsMeal === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onSelectKidsMeal(option.id)}
              className={`group flex cursor-pointer items-center gap-2.5 rounded-xl border px-2.5 py-2 text-left transition duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong sm:gap-3 sm:px-3 sm:py-2.5 ${
                isActive
                  ? "border-accent bg-accent-soft/60 shadow-[0_1px_2px_rgba(0,0,0,0.04)]"
                  : "border-transparent hover:bg-white/70"
              }`}
            >
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white ring-1 ring-black/5 sm:h-10 sm:w-10">
                <Image src={option.image} alt={option.label} fill className="object-contain p-1" />
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 sm:text-[15px]">
                {option.label}
              </span>
              <span
                aria-hidden="true"
                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-2 transition ${
                  isActive ? "border-accent bg-accent" : "border-black/15 bg-white group-hover:border-black/25"
                }`}
              >
                {isActive ? <Check className="h-2.5 w-2.5 text-white" strokeWidth={3} /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
