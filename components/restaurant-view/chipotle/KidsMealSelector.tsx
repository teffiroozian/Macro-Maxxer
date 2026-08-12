import Image from "next/image";
import type { ChipotleKidsMealId } from "@/lib/restaurantBuilders/chipotle";
import SectionEyebrow from "@/components/ui/SectionEyebrow";

type Props = {
  selectedKidsMeal: ChipotleKidsMealId;
  onSelectKidsMeal: (kidsMeal: ChipotleKidsMealId) => void;
  options: Array<{ id: ChipotleKidsMealId; label: string; image: string }>;
};

// Two independent cards rather than a shared segmented track — the
// selected state reads through the card's own styling (border weight,
// shadow, text color, a small check) instead of a pressed-surface-inside-
// a-track or a form-radio affordance.
export default function KidsMealSelector({ selectedKidsMeal, onSelectKidsMeal, options }: Props) {
  return (
    <section className="mb-6">
      <SectionEyebrow as="h2" className="mb-2 text-xs">
        Choose Your Kid&apos;s Meal
      </SectionEyebrow>
      <div role="radiogroup" aria-label="Kid's Meal type" className="grid grid-cols-2 gap-2 sm:gap-3">
        {options.map((option) => {
          const isActive = selectedKidsMeal === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onSelectKidsMeal(option.id)}
              className={`flex cursor-pointer items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 text-left transition-all duration-150 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-strong sm:gap-3 sm:px-3.5 sm:py-3 ${
                isActive
                  ? "border-[1.5px] border-accent shadow-[0_2px_10px_rgba(0,0,0,0.08)]"
                  : "border border-black/8 shadow-none hover:border-black/15"
              }`}
            >
              <span className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-50 ring-1 ring-black/5 sm:h-10 sm:w-10">
                <Image src={option.image} alt="" fill className="object-contain p-1" />
              </span>
              <span
                className={`min-w-0 flex-1 truncate text-sm font-semibold sm:text-[15px] ${
                  isActive ? "text-slate-900" : "text-slate-500"
                }`}
              >
                {option.label}
              </span>
              {isActive ? (
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent" aria-hidden="true">
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
            </button>
          );
        })}
      </div>
    </section>
  );
}
