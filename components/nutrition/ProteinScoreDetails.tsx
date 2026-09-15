"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, ChevronRight, X, Zap } from "lucide-react";
import { formatProteinScoreDisplay } from "@/components/nutrition/macroDisplay";
import {
  ELITE_VISUAL_CEILING,
  getProteinPer100Calories,
  getProteinScoreTier,
  PROTEIN_SCORE_TIER_ORDER,
  PROTEIN_SCORE_TIER_SCALE,
  type ProteinScoreTier,
} from "@/lib/nutrition";

export type ProteinScoreDetailItem = {
  id: string;
  name: string;
  image?: string;
  calories: number;
  protein: number;
};

const tierColors: Record<ProteinScoreTier, { bar: string; text: string; soft: string; iconBg: string; icon: string }> = {
  low: { bar: "bg-[#94A3B8]", text: "text-[#64748B]", soft: "bg-[#F8FAFC]", iconBg: "bg-[#EEF2F6]", icon: "text-[#94A3B8]" },
  moderate: { bar: "bg-[#64748B]", text: "text-[#334155]", soft: "bg-[#F1F5F9]", iconBg: "bg-[#E2E8F0]", icon: "text-[#64748B]" },
  good: { bar: "bg-[#B08A3E]", text: "text-[#8A6D2F]", soft: "bg-[#FFFBEB]", iconBg: "bg-[#F3E8CE]", icon: "text-[#B08A3E]" },
  excellent: { bar: "bg-[#4C84C4]", text: "text-[#2F5F85]", soft: "bg-[#EEF4FF]", iconBg: "bg-[#4C84C4]", icon: "text-white" },
  elite: { bar: "bg-[#047857]", text: "text-[#047857]", soft: "bg-[#ECFDF3]", iconBg: "bg-[#047857]", icon: "text-white" },
};

function ScoreScale({ score }: { score: number }) {
  const tier = getProteinScoreTier(score);
  const styles = tierColors[tier];
  const tierIndex = PROTEIN_SCORE_TIER_ORDER.indexOf(tier);
  const range = PROTEIN_SCORE_TIER_SCALE[tier];
  const upper = range.max ?? ELITE_VISUAL_CEILING;
  const progress = Math.max(0, Math.min(1, (score - range.min) / (upper - range.min)));
  const markerPosition = ((tierIndex + progress) / PROTEIN_SCORE_TIER_ORDER.length) * 100;

  return (
    <div className="mt-6 border-t border-black/[0.06] pt-5">
      <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Where it lands</h3>
      <div className="relative mt-8">
        <div
          className={`absolute -top-7 -translate-x-1/2 text-xs font-bold ${styles.text}`}
          style={{ left: `${Math.max(2, Math.min(98, markerPosition))}%` }}
        >
          {formatProteinScoreDisplay(score)}
        </div>
        <div
          className={`absolute -top-2 h-4 w-0.5 -translate-x-1/2 rounded-full ${styles.bar}`}
          style={{ left: `${Math.max(2, Math.min(98, markerPosition))}%` }}
          aria-hidden="true"
        />
        <div className="grid grid-cols-5 gap-1" aria-label={`Protein score ${formatProteinScoreDisplay(score)}, ${PROTEIN_SCORE_TIER_SCALE[tier].label}`}>
          {PROTEIN_SCORE_TIER_ORDER.map((scaleTier) => (
            <div key={scaleTier} className={`h-2 rounded-full ${tierColors[scaleTier].bar} ${tier === scaleTier ? "opacity-100" : "opacity-25"}`} />
          ))}
        </div>
        <div className="mt-2 grid grid-cols-5 gap-1">
          {PROTEIN_SCORE_TIER_ORDER.map((scaleTier) => (
            <div key={scaleTier} className="min-w-0">
              <p className={`truncate text-[10px] font-semibold sm:text-xs ${tier === scaleTier ? tierColors[scaleTier].text : "text-slate-500"}`}>
                {PROTEIN_SCORE_TIER_SCALE[scaleTier].label}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">{PROTEIN_SCORE_TIER_SCALE[scaleTier].tickLabel}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ScoreDetail({ label, score, protein, calories }: { label: string; score: number; protein: number; calories: number }) {
  const tier = getProteinScoreTier(score);
  const styles = tierColors[tier];
  return (
    <>
      <p className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">{label}</p>
      <div className={`mt-4 rounded-2xl p-5 ${styles.soft}`}>
        <div className="flex items-center gap-3 whitespace-nowrap">
          <span className={`flex h-10 w-10 items-center justify-center rounded-full ${styles.iconBg}`}>
            <Zap className={`h-5 w-5 ${styles.icon}`} fill="currentColor" aria-hidden="true" />
          </span>
          <p className="min-w-0 text-sm font-medium text-slate-500 sm:text-base">
            <span className={`text-3xl font-bold leading-none ${styles.text}`}>{formatProteinScoreDisplay(score)}g</span>
            <span className="ml-2.5">per 100 calories</span>
          </p>
        </div>
      </div>
      <div className="mt-6 border-t border-black/[0.06] pt-5">
        <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">How it&apos;s calculated</h3>
        <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-center text-sm font-normal tabular-nums text-slate-600">
          {formatProteinScoreDisplay(protein)}g protein <span className="text-slate-400">÷</span> {formatProteinScoreDisplay(calories)} cal <span className="text-slate-400">×</span> 100 <span className="text-slate-400">=</span> <span className={`font-bold ${styles.text}`}>{formatProteinScoreDisplay(score)}</span>
        </div>
      </div>
      <ScoreScale score={score} />
    </>
  );
}

export default function ProteinScoreDetails({
  open,
  onClose,
  score,
  protein,
  calories,
  name = "This item",
  image,
  items = [],
}: {
  open: boolean;
  onClose: () => void;
  score: number;
  protein?: number;
  calories?: number;
  name?: string;
  image?: string;
  items?: ProteinScoreDetailItem[];
}) {
  const [selectedItem, setSelectedItem] = useState<ProteinScoreDetailItem | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const isAggregate = items.length > 1;

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKeyDown);
    requestAnimationFrame(() => closeButtonRef.current?.focus());
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) return null;
  const selectedScore = selectedItem
    ? getProteinPer100Calories(selectedItem.protein, selectedItem.calories)
    : undefined;
  const headerImage = selectedItem?.image ?? (!isAggregate ? image : undefined);

  const modal = (
    <div className="fixed inset-0 z-[250] flex items-end justify-center bg-slate-950/40 sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="protein-score-title" onMouseDown={onClose}>
      <section className="flex max-h-[85dvh] w-full flex-col overflow-hidden rounded-t-[28px] bg-white shadow-2xl sm:max-h-[min(720px,calc(100dvh-3rem))] sm:max-w-[520px] sm:rounded-[28px]" onMouseDown={(event) => event.stopPropagation()}>
        <div className="mx-auto mt-2 h-1 w-10 rounded-full bg-slate-300 sm:hidden" aria-hidden="true" />
        <header className="flex shrink-0 items-center justify-between border-b border-black/[0.06] px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            {selectedItem ? (
              <button type="button" className="-ml-2 cursor-pointer rounded-full p-2 text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900" onClick={() => setSelectedItem(null)} aria-label="Back to overall Protein Score">
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : null}
            {headerImage ? (
              <span className="h-8 w-8 shrink-0 overflow-hidden rounded-lg border border-black/10 bg-slate-50">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={headerImage} alt="" className="h-full w-full object-contain p-0.5" />
              </span>
            ) : null}
            <h2 id="protein-score-title" className="truncate font-heading text-xl font-bold text-neutral-900">
              {selectedItem ? selectedItem.name : isAggregate ? "Protein Score" : name}
            </h2>
          </div>
          <button ref={closeButtonRef} type="button" className="-mr-2 cursor-pointer rounded-full p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900" onClick={onClose} aria-label="Close Protein Score">
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="overflow-y-auto overscroll-contain px-5 pb-[max(24px,env(safe-area-inset-bottom))] pt-5 sm:px-6 sm:pb-6">
          {selectedItem && typeof selectedScore === "number" ? (
            <ScoreDetail label="Protein Score" score={selectedScore} protein={selectedItem.protein} calories={selectedItem.calories} />
          ) : (
            <>
              <ScoreDetail
                label={isAggregate ? "Meal Protein Score" : "Protein Score"}
                score={score}
                protein={protein ?? score}
                calories={calories ?? 100}
              />
              {isAggregate ? (
                <div className="mt-6 border-t border-black/[0.06] pt-5">
                  <h3 className="text-xs font-bold uppercase tracking-[0.12em] text-slate-500">Item-by-item</h3>
                  <div className="mt-3 divide-y divide-black/[0.06]">
                    {items.map((item) => {
                      const itemScore = getProteinPer100Calories(item.protein, item.calories);
                      if (typeof itemScore !== "number") return null;
                      const itemTier = getProteinScoreTier(itemScore);
                      return (
                        <button key={item.id} type="button" className="flex w-full items-center gap-3 py-3 text-left hover:bg-slate-50" onClick={() => setSelectedItem(item)}>
                          <span className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-black/10 bg-slate-50">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            {item.image ? <img src={item.image} alt="" className="h-full w-full object-contain p-1" /> : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-neutral-900">{item.name}</span>
                            <span className={`mt-0.5 block text-xs font-semibold ${tierColors[itemTier].text}`}>
                              {formatProteinScoreDisplay(itemScore)}g / 100 cal · {PROTEIN_SCORE_TIER_SCALE[itemTier].label}
                            </span>
                          </span>
                          <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>
    </div>
  );

  return createPortal(modal, document.body);
}
