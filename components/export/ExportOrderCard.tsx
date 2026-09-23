import Image from "next/image";
import { Zap } from "lucide-react";
import { forwardRef } from "react";
import type { CSSProperties } from "react";
import { macroColorTokens } from "@/components/nutrition/macroColorTokens";
import { proteinScoreTierStyles } from "@/components/nutrition/proteinScoreStyles";
import { formatMacroDisplayNumber, formatProteinScoreDisplay } from "@/components/nutrition/macroDisplay";
import { getProteinPer100Calories, getProteinScoreTier } from "@/lib/nutrition";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "@/lib/export/dimensions";
import { DEFAULT_BRAND_ACCENT, RESTAURANT_BRAND_COLORS } from "@/lib/theme/colors";
import type { Nutrition } from "@/types/nutrition";

export type ExportOrderSummaryItem = {
  label: string;
  quantity?: number;
  detail?: string;
  modifier?: string;
  muted?: boolean;
  components?: Array<{
    role: "Entrée" | "Side" | "Drink" | "Extra" | "Sauce" | "Dressing";
    label: string;
    muted?: boolean;
  }>;
};

export type ExportOrderCardProps = {
  restaurant: {
    id: string;
    name: string;
    logo: string;
    accentColor?: string;
  };
  orderName: string;
  nutrition: Nutrition;
  items: ExportOrderSummaryItem[];
  exportedAt?: string;
  className?: string;
  style?: CSSProperties;
};

function formatDetail(value: number | undefined, unit: string) {
  return typeof value === "number" && Number.isFinite(value) ? `${Math.round(value)}${unit}` : "—";
}

type SummaryDensity = "comfortable" | "dense" | "compact";

// Type scale for the native 1080px canvas. Short orders get large, readable
// rows; longer orders step down so the list still fits above the footer.
const densityStyles: Record<SummaryDensity, Record<string, string>> = {
  comfortable: {
    title: "mt-[44px] text-[64px]",
    cardGap: "mt-[44px]",
    cardTop: "pb-[24px] pt-[34px]",
    calories: "text-[90px]",
    macroRow: "pb-[30px] pt-[24px]",
    macroValue: "text-[52px]",
    detailsBlock: "pt-[14px] pb-[22px]",
    detailRow: "py-[9px] text-[19px]",
    itemsGap: "mt-[40px]",
    itemsGrid: "grid-cols-2 gap-x-[44px] gap-y-[2px] text-[22px]",
    itemRow: "min-h-[40px]",
    quantity: "text-[19px]",
    quantityWidth: "w-[36px]",
    componentBlock: "pb-[16px] pt-[4px]",
    componentTitle: "text-[24px]",
    componentGrid: "mt-[10px] gap-y-[12px] pl-[46px]",
    componentRole: "text-[13px]",
    componentLabel: "text-[19px]",
  },
  dense: {
    title: "mt-[36px] text-[54px]",
    cardGap: "mt-[36px]",
    cardTop: "pb-[22px] pt-[30px]",
    calories: "text-[78px]",
    macroRow: "pb-[26px] pt-[20px]",
    macroValue: "text-[47px]",
    detailsBlock: "pt-[12px] pb-[18px]",
    detailRow: "py-[7px] text-[18px]",
    itemsGap: "mt-[32px]",
    itemsGrid: "grid-cols-2 gap-x-[40px] gap-y-0 text-[20px]",
    itemRow: "min-h-[34px]",
    quantity: "text-[18px]",
    quantityWidth: "w-[32px]",
    componentBlock: "pb-[12px] pt-[2px]",
    componentTitle: "text-[22px]",
    componentGrid: "mt-[8px] gap-y-[8px] pl-[40px]",
    componentRole: "text-[12px]",
    componentLabel: "text-[17px]",
  },
  compact: {
    title: "mt-[30px] text-[47px]",
    cardGap: "mt-[28px]",
    cardTop: "pb-[16px] pt-[22px]",
    calories: "text-[70px]",
    macroRow: "pb-[20px] pt-[18px]",
    macroValue: "text-[41px]",
    detailsBlock: "pt-[6px] pb-[10px]",
    detailRow: "py-[5px] text-[16px]",
    itemsGap: "mt-[24px]",
    itemsGrid: "grid-cols-3 gap-x-[28px] gap-y-0 text-[17px]",
    itemRow: "min-h-[29px]",
    quantity: "text-[16px]",
    quantityWidth: "w-[28px]",
    componentBlock: "pb-[8px] pt-[2px]",
    componentTitle: "text-[20px]",
    componentGrid: "mt-[6px] gap-y-[6px] pl-[34px]",
    componentRole: "text-[11px]",
    componentLabel: "text-[16px]",
  },
};

/**
 * Estimates the list height (in comfortable-tier pixels) so the whole card
 * can pick one coherent type scale instead of clipping long orders.
 */
function getSummaryDensity(items: ExportOrderSummaryItem[], orderName: string): SummaryDensity {
  // Roughly 22 title characters fit per line; a second line costs list space.
  let height = orderName.length > 22 ? 68 : 0;
  let pendingSimpleRows = 0;

  for (const item of items) {
    if (item.components) {
      height += Math.ceil(pendingSimpleRows / 2) * 44;
      pendingSimpleRows = 0;
      height += 60 + Math.ceil(item.components.length / 3) * 58;
    } else {
      pendingSimpleRows += 1;
    }
  }
  height += Math.ceil(pendingSimpleRows / 2) * 44;

  if (height <= 430) return "comfortable";
  if (height <= 600) return "dense";
  return "compact";
}

/**
 * A fixed 1080 × 1350 presentation canvas. Keep download/canvas concerns
 * outside this component so previews and exports share one 4:5 composition
 * without sharing their display scale.
 */
const ExportOrderCard = forwardRef<HTMLElement, ExportOrderCardProps>(function ExportOrderCard({
  restaurant,
  orderName,
  nutrition,
  items,
  exportedAt,
  className = "",
  style,
}, ref) {
  const accentColor = restaurant.accentColor ?? RESTAURANT_BRAND_COLORS[restaurant.id] ?? DEFAULT_BRAND_ACCENT;
  const proteinScore = getProteinPer100Calories(nutrition.protein, nutrition.calories);
  const proteinScoreTier = typeof proteinScore === "number" ? getProteinScoreTier(proteinScore) : undefined;
  const macroTotal = nutrition.protein + nutrition.carbs + nutrition.totalFat;
  const percentages = {
    protein: macroTotal > 0 ? (nutrition.protein / macroTotal) * 100 : 0,
    carbs: macroTotal > 0 ? (nutrition.carbs / macroTotal) * 100 : 0,
    totalFat: macroTotal > 0 ? (nutrition.totalFat / macroTotal) * 100 : 0,
  };
  const visibleDetails = [
    { key: "sodium", label: "Sodium", unit: "mg" },
    { key: "cholesterol", label: "Cholesterol", unit: "mg" },
    { key: "totalFat", label: "Total Fat", unit: "g" },
    { key: "fiber", label: "Fiber", unit: "g" },
    { key: "satFat", label: "Saturated Fat", unit: "g" },
    { key: "sugars", label: "Sugars", unit: "g" },
  ] as const;
  const scoreStyles = proteinScoreTier ? proteinScoreTierStyles[proteinScoreTier] : undefined;
  const density = getSummaryDensity(items, orderName);
  const size = densityStyles[density];

  return (
    <article
      ref={ref}
      className={`relative isolate box-border flex-none overflow-hidden bg-[#17120f] text-white shadow-2xl ${className}`}
      style={{
        "--restaurant-accent": accentColor,
        background: `linear-gradient(145deg, color-mix(in srgb, ${accentColor} 32%, #211914) 0%, #17120f 76%)`,
        ...style,
        // These dimensions deliberately come after caller styles. Preview
        // callers may transform the card, but cannot turn it into an
        // auto-height document or change the native export frame.
        width: EXPORT_WIDTH,
        height: EXPORT_HEIGHT,
        flex: "0 0 auto",
        contain: "layout paint size",
      } as CSSProperties}
      aria-label={`${orderName} export card`}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        <div className="absolute -right-[18%] -top-[15%] h-[48%] w-[62%] rounded-full bg-[var(--restaurant-accent)] opacity-[0.12] blur-3xl" />
      </div>

      <div className="relative flex h-full flex-col px-[64px] pb-[52px] pt-[60px]">
        <header className="flex shrink-0 items-center justify-between gap-8">
          <div className="flex items-center gap-4">
            <span className="relative size-[60px] overflow-hidden rounded-[16px] bg-black shadow-sm">
              <Image src="/logo.svg" alt="Macro Maxxer" fill className="object-contain p-2.5" />
            </span>
            <span className="font-heading text-[30px] font-bold tracking-[-0.01em]">Macro Maxxer</span>
          </div>

          <div className="flex min-w-0 items-center gap-3.5 rounded-full border border-white/15 bg-white/10 py-2 pl-2 pr-6 backdrop-blur-sm">
            <span className="relative size-[48px] shrink-0 overflow-hidden rounded-full bg-white">
              <Image src={restaurant.logo} alt="" fill sizes="96px" className="object-contain" />
            </span>
            <span className="truncate text-[24px] font-semibold">{restaurant.name}</span>
          </div>
        </header>

        {/* Short orders leave slack in the fixed frame. Split it roughly 1:2
            above and below the content block so the list stays attached to
            the macro card instead of leaving an empty middle. */}
        <div className="min-h-0 flex-[1_1_0]" aria-hidden="true" />
        <div className="flex min-h-0 flex-col">
          <h1 className={`shrink-0 line-clamp-2 max-w-[92%] font-heading font-bold leading-[0.98] tracking-[-0.035em] ${size.title}`}>
            {orderName}
          </h1>

          <section className={`shrink-0 overflow-hidden rounded-[34px] bg-[#fbfaf7] text-slate-950 shadow-[0_28px_80px_rgba(0,0,0,0.28)] ${size.cardGap}`}>
            <div className={`flex items-center justify-between gap-6 px-[44px] ${size.cardTop}`}>
              <div className="flex items-baseline gap-3">
                <span className={`font-heading font-bold leading-none tracking-[-0.06em] ${size.calories}`}>
                  {formatMacroDisplayNumber(nutrition.calories)}
                </span>
                <span className="text-[21px] font-semibold text-slate-500">calories</span>
              </div>

              {typeof proteinScore === "number" && scoreStyles ? (
                <div className={`inline-flex shrink-0 items-center gap-3 rounded-full py-2 pl-2 pr-4 text-[19px] ${scoreStyles.chip}`}>
                  <span className={`flex size-[30px] items-center justify-center rounded-full ${scoreStyles.iconWrap}`}>
                    <Zap className={`size-[18px] ${scoreStyles.icon}`} strokeWidth={2.5} />
                  </span>
                  <span>
                    <span className={`font-bold ${scoreStyles.value}`}>{formatProteinScoreDisplay(proteinScore)}g protein</span>
                    <span className={`ml-1.5 ${scoreStyles.supporting}`}>/ 100 cal</span>
                  </span>
                </div>
              ) : null}
            </div>

            <div className="mx-[44px] flex h-[14px] gap-[3px] overflow-hidden rounded-full bg-slate-100">
              <span className={macroColorTokens.protein.segmentClassName.split(" ")[0]} style={{ width: `${percentages.protein}%` }} />
              <span className={macroColorTokens.carbs.segmentClassName} style={{ width: `${percentages.carbs}%` }} />
              <span className={macroColorTokens.totalFat.segmentClassName.split(" ")[0]} style={{ width: `${percentages.totalFat}%` }} />
            </div>

            <div className={`grid grid-cols-3 px-[44px] ${size.macroRow}`}>
              {([
                ["protein", "Protein", nutrition.protein, percentages.protein],
                ["carbs", "Carbs", nutrition.carbs, percentages.carbs],
                ["totalFat", "Fat", nutrition.totalFat, percentages.totalFat],
              ] as const).map(([key, label, value, percentage]) => (
                <div key={key}>
                  <p className={`font-extrabold leading-none tracking-[-0.04em] ${size.macroValue} ${key === "carbs" ? macroColorTokens.carbs.valueClassName : macroColorTokens[key].barValueClassName}`}>
                    {formatMacroDisplayNumber(value)}<span className="ml-1 text-[0.45em]">g</span>
                  </p>
                  <p className="mt-2 text-[15px] font-bold uppercase tracking-[0.14em] text-slate-500">
                    {label} · {Math.round(percentage)}%
                  </p>
                </div>
              ))}
            </div>

            <div className={`border-t border-black/10 px-[44px] ${size.detailsBlock}`}>
              <div className="grid grid-cols-2 gap-x-[56px]">
                {visibleDetails.map((detail) => (
                  <div key={detail.key} className={`flex items-center justify-between gap-4 border-b border-black/[0.07] last:border-b-0 [&:nth-last-child(2)]:border-b-0 ${size.detailRow}`}>
                    <span className="text-slate-500">{detail.label}</span>
                    <span className="font-bold">{formatDetail(nutrition[detail.key], detail.unit)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section
            className={`grid min-h-0 shrink content-start overflow-hidden ${size.itemsGap} ${size.itemsGrid}`}
          >
            {items.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className={`${item.components ? `col-span-full border-b border-white/10 last:border-b-0 ${size.componentBlock}` : `flex min-w-0 items-center gap-3 ${size.itemRow}`} ${item.muted ? "text-white/45" : "text-white/90"}`}
              >
                {item.components ? (
                  <>
                    <div className="flex items-baseline gap-3">
                      {typeof item.quantity === "number" ? (
                        <span className={`shrink-0 font-bold text-white/45 ${size.quantity}`}>{item.quantity}×</span>
                      ) : null}
                      <span className={`font-heading font-bold text-white ${size.componentTitle}`}>{item.label}</span>
                    </div>
                    <div className={`grid grid-cols-3 gap-x-8 ${size.componentGrid}`}>
                      {item.components.map((component, componentIndex) => (
                        <div key={`${component.role}-${component.label}-${componentIndex}`} className={component.muted ? "text-white/40" : "text-white/85"}>
                          <p className={`font-bold uppercase tracking-[0.14em] text-white/45 ${size.componentRole}`}>{component.role}</p>
                          <p className={`mt-1 font-medium leading-[1.2] ${size.componentLabel}`}>{component.label}</p>
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <>
                    {typeof item.quantity === "number" ? (
                      <span className={`shrink-0 text-right font-bold text-white/45 ${size.quantity} ${size.quantityWidth}`}>{item.quantity}×</span>
                    ) : null}
                    <span className="min-w-0 flex-1 truncate font-medium">
                      {item.modifier ? <span className="mr-1.5 text-white/55">{item.modifier}</span> : null}
                      {item.label}{item.detail ? <span className="font-normal text-white/50"> ({item.detail})</span> : null}
                    </span>
                  </>
                )}
              </div>
            ))}
          </section>
        </div>
        <div className="min-h-0 flex-[2_1_0]" aria-hidden="true" />

        <footer className="mt-[24px] flex shrink-0 items-end justify-between border-t border-white/15 pt-6 text-[20px] font-semibold text-white/60">
          <span className="tracking-wide">macromaxxer.com</span>
          {exportedAt ? <span>{exportedAt}</span> : null}
        </footer>
      </div>
    </article>
  );
});

export default ExportOrderCard;
