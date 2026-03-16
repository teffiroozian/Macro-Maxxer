"use client";

import type { CartMacros } from "@/stores/cartStore";

type StickyMacroTotalsBarProps = {
  totals: CartMacros;
  visible: boolean;
  onSaveMeal?: () => void;
  onGenerateSnapshot?: () => void;
};

const macroRows: Array<{
  key: keyof CartMacros;
  label: string;
  unit?: string;
  valueClassName: string;
}> = [
  { key: "calories", label: "Calories", valueClassName: "text-[#111318]" },
  { key: "protein", label: "Protein", unit: "g", valueClassName: "text-[#C75A1B]" },
  { key: "carbs", label: "Carbs", unit: "g", valueClassName: "text-[#D0A700]" },
  { key: "fat", label: "Fat", unit: "g", valueClassName: "text-[#3B8EDB]" },
];

export default function StickyMacroTotalsBar({
  totals,
  visible,
  onSaveMeal,
  onGenerateSnapshot,
}: StickyMacroTotalsBarProps) {
  return (
    <div
      className={`fixed left-0 right-0 bottom-4 mx-auto z-40 max-w-5xl px-4 transition-all duration-300 ease-out sm:px-6 ${
        visible
          ? "pointer-events-none translate-y-0 opacity-100"
          : "pointer-events-none translate-y-4 opacity-0"
      }`}
    >
      <div
        className={`mx-auto w-full max-w-[1700px] rounded-[2.25rem] border border-black/10 bg-[#f5f5f5] px-6 py-5 shadow-[0_10px_30px_rgba(0,0,0,0.24)] transition-all duration-300 sm:px-8 sm:py-6 ${
          visible ? "pointer-events-auto" : "pointer-events-none"
        }`}
      >
        <div className="grid items-center gap-6 lg:grid-cols-[1fr_auto] lg:gap-10">
          <section>
            <p className="text-center text-xl font-semibold tracking-tight text-neutral-500">
              TOTAL MACROS
            </p>

            <div className="mt-6 grid grid-cols-4 gap-x-6 gap-y-4 text-center">
              {macroRows.map((macro) => (
                <div key={macro.key}>
                  <p className={`text-3xl font-bold leading-none ${macro.valueClassName}`}>
                    {totals[macro.key]}
                    {macro.unit ?? ""}
                  </p>
                  <p className="mt-2 text-sm font-semibold uppercase tracking-wide text-[#1A1A1A]">
                    {macro.label}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={onSaveMeal}
              className="inline-flex h-12 items-center justify-center gap-3 rounded-2xl border-2 border-black/85 bg-transparent px-10 text-lg font-semibold text-[#1A1A1A] transition hover:bg-black/5"
            >
              <span aria-hidden="true">🔖</span>
              <span>Save Meal</span>
            </button>
            <button
              type="button"
              onClick={onGenerateSnapshot}
              className="inline-flex h-12 items-center justify-center gap-3 rounded-2xl border border-black bg-black px-10 text-lg font-semibold text-white transition hover:bg-neutral-900"
            >
              <span aria-hidden="true">↓</span>
              <span>Generate Snapshot</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
