import { Zap } from "lucide-react";
import Image from "@/components/ui/AppImage";
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
  itemDescription?: string;
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
  itemDescription,
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

        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-start sm:gap-8 sm:p-8">
          <div className="flex flex-col items-center gap-3 sm:shrink-0 sm:items-start">
            <div className="flex items-center gap-2">
              <RestaurantLogoBadge src={restaurantLogo} alt="" size="sm" ring={false} className="border border-black/10" />
              <span className="text-sm font-medium text-neutral-500">{restaurantName}</span>
            </div>

            <div className="relative h-40 w-40 overflow-hidden rounded-2xl border border-black/10 bg-neutral-50">
              <Image src={itemImage} alt={itemName} fill className="object-cover" />
              <MacroBadge
                macroKey="protein"
                value={nutrition.protein}
                className="absolute right-2 top-2"
              />
            </div>
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-4">
            <div>
              {tag ? (
                <span className="inline-flex rounded-full bg-neutral-900 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                  {tag}
                </span>
              ) : null}
              <h3 className="font-heading mt-2 text-2xl font-bold text-neutral-900">{itemName}</h3>
              {itemDescription ? (
                <p className="mt-1.5 text-sm leading-snug text-neutral-500">{itemDescription}</p>
              ) : null}
            </div>

            <MacroSplitBar protein={nutrition.protein} carbs={nutrition.carbs} totalFat={nutrition.totalFat} />

            {/* Deliberately asymmetric spacing: more room above (on top of
                the column's own gap-4) so the protein score reads as its
                own moment separate from the macro bar, then the stat row
                below pulls in tight against it (negative margin, undoing
                part of that same gap-4) rather than sitting equidistant
                between the two — it's the stats' own supporting detail, not
                a card centered between two neighbors. */}
            <p className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-emerald-50 py-1 pl-1 pr-2.5 text-xs text-emerald-700 sm:mt-4">
              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-600">
                <Zap className="h-2.5 w-2.5 text-emerald-50" strokeWidth={2.5} aria-hidden="true" />
              </span>
              <span className="font-bold">{proteinPer100Calories}g protein</span>
              <span className="text-emerald-700/70">per 100 cal</span>
            </p>

            <div className="-mt-2 flex flex-wrap items-end gap-x-6 gap-y-4 sm:gap-x-8">
              <MacroStat macroKey="calories" value={nutrition.calories} labelVariant="uppercase" size="summary" />
              <MacroStat macroKey="protein" value={nutrition.protein} labelVariant="uppercase" size="summary" />
              <MacroStat macroKey="carbs" value={nutrition.carbs} labelVariant="uppercase" size="summary" />
              <MacroStat macroKey="totalFat" value={nutrition.totalFat} labelVariant="uppercase" size="summary" />
              <span className={appButtonClassName({ variant: "secondary", size: "sm", className: "ml-auto w-fit" })}>
                View Full Nutrition
              </span>
            </div>
          </div>
        </div>
      </SurfaceCard>
    </Link>
  );
}
