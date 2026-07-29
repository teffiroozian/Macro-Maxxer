import { Zap } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import SurfaceCard from "@/components/ui/SurfaceCard";
import RestaurantLogoBadge from "@/components/ui/RestaurantLogoBadge";
import MacroSplitBar from "@/components/nutrition/MacroSplitBar";
import MacroStat from "@/components/nutrition/MacroStat";
import MacroBadge from "@/components/ui/MacroBadge";
import { appButtonClassName } from "@/components/ui/AppButton";
import { getProteinPer100Calories } from "@/lib/nutrition";
import type { CoreMacros } from "@/types/nutrition";

type ProductPreviewCardProps = {
  restaurantName: string;
  restaurantLogo: string;
  itemName: string;
  itemImage: string;
  nutrition: CoreMacros;
  href: string;
  tag?: string;
};

// Slice 1's stand-in for the full Product Walkthrough (Slice 3): a single
// real menu item shown the way Macro Maxxer actually displays it, framed in
// a light "device chrome" so it reads as a real product view rather than a
// pasted-in mockup.
export default function ProductPreviewCard({
  restaurantName,
  restaurantLogo,
  itemName,
  itemImage,
  nutrition,
  href,
  tag = "High-Protein Pick",
}: ProductPreviewCardProps) {
  const proteinPer100Calories = Math.round(
    getProteinPer100Calories(nutrition.protein, nutrition.calories) ?? 0
  );

  return (
    <Link
      href={href}
      className="group block rounded-3xl focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-900"
    >
      <SurfaceCard
        as="article"
        radius="large"
        shadow="md"
        padding="none"
        className="overflow-hidden bg-white transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_24px_55px_rgba(15,23,42,0.16)]"
      >
        {/* Light "device chrome" — signals this is a real product view, not
            a decorative image. */}
        <div className="flex items-center gap-1.5 border-b border-black/5 bg-neutral-50/80 px-5 py-3">
          <span className="h-2 w-2 rounded-full bg-neutral-300" />
          <span className="h-2 w-2 rounded-full bg-neutral-300" />
          <span className="h-2 w-2 rounded-full bg-neutral-300" />
          <span className="ml-2 truncate text-xs font-medium text-neutral-400">
            Macro Maxxer · {restaurantName} · Item View
          </span>
        </div>

        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:gap-8 sm:p-8">
          <div className="relative mx-auto h-40 w-40 shrink-0 overflow-hidden rounded-2xl border border-black/10 bg-neutral-50 sm:mx-0">
            <Image src={itemImage} alt={itemName} fill className="object-cover" />
            <MacroBadge
              macroKey="protein"
              value={nutrition.protein}
              className="absolute right-2 top-2"
            />
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div>
              {tag ? (
                <span className="inline-flex rounded-full bg-neutral-900 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                  {tag}
                </span>
              ) : null}
              <div className="mt-2 flex items-center gap-2">
                <RestaurantLogoBadge src={restaurantLogo} alt="" size="sm" ring={false} className="border border-black/10" />
                <span className="text-sm font-medium text-neutral-500">{restaurantName}</span>
              </div>
              <h3 className="font-heading mt-1 text-2xl font-bold text-neutral-900">{itemName}</h3>
            </div>

            <MacroSplitBar protein={nutrition.protein} carbs={nutrition.carbs} totalFat={nutrition.totalFat} />

            <div className="flex flex-wrap items-end gap-x-6 gap-y-3 sm:gap-x-8">
              <MacroStat macroKey="calories" value={nutrition.calories} labelVariant="uppercase" size="summary" />
              <MacroStat macroKey="protein" value={nutrition.protein} labelVariant="uppercase" size="summary" />
              <MacroStat macroKey="carbs" value={nutrition.carbs} labelVariant="uppercase" size="summary" />
              <MacroStat macroKey="totalFat" value={nutrition.totalFat} labelVariant="uppercase" size="summary" />
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-orange-100 bg-gradient-to-r from-orange-50 via-amber-50/70 to-transparent px-4 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#c2410c] text-white shadow-[0_4px_12px_rgba(194,65,12,0.35)]">
                <Zap className="h-4 w-4" strokeWidth={2.5} fill="currentColor" aria-hidden="true" />
              </span>
              <p className="text-sm leading-snug text-neutral-600">
                <span className="text-base font-extrabold text-[#c2410c]">{proteinPer100Calories}g protein</span>
                {" "}per 100 calories
              </p>
            </div>

            <span className={appButtonClassName({ variant: "secondary", size: "sm", className: "w-fit" })}>
              View Full Nutrition
            </span>
          </div>
        </div>
      </SurfaceCard>
    </Link>
  );
}
