import type { LucideIcon } from "lucide-react";
import { Beef, Droplet, Flame, Wheat } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import SurfaceCard from "@/components/ui/SurfaceCard";
import SectionEyebrow from "@/components/ui/SectionEyebrow";
import RestaurantLogoBadge from "@/components/ui/RestaurantLogoBadge";
import MacroSplitBar from "@/components/nutrition/MacroSplitBar";
import MacroBadge from "@/components/ui/MacroBadge";
import { appButtonClassName } from "@/components/ui/AppButton";
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

type MacroTileConfig = {
  key: keyof CoreMacros;
  label: string;
  unit: string;
  Icon: LucideIcon;
  tintClassName: string;
};

const MACRO_TILES: MacroTileConfig[] = [
  { key: "calories", label: "Calories", unit: "", Icon: Flame, tintClassName: "border-neutral-200 bg-neutral-50 text-neutral-900" },
  { key: "protein", label: "Protein", unit: "g", Icon: Beef, tintClassName: "border-orange-100 bg-orange-50 text-[#c2410c]" },
  { key: "carbs", label: "Carbs", unit: "g", Icon: Wheat, tintClassName: "border-amber-100 bg-amber-50 text-[#ca8a04]" },
  { key: "totalFat", label: "Fat", unit: "g", Icon: Droplet, tintClassName: "border-blue-100 bg-blue-50 text-[#2563eb]" },
];

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
              <div className="flex flex-wrap items-center gap-2">
                <SectionEyebrow className="text-xs">See it in your order</SectionEyebrow>
                {tag ? (
                  <span className="rounded-full bg-neutral-900 px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-wide text-white">
                    {tag}
                  </span>
                ) : null}
              </div>
              <div className="mt-2 flex items-center gap-2">
                <RestaurantLogoBadge src={restaurantLogo} alt="" size="sm" ring={false} className="border border-black/10" />
                <span className="text-sm font-medium text-neutral-500">{restaurantName}</span>
              </div>
              <h3 className="font-heading mt-1 text-2xl font-bold text-neutral-900">{itemName}</h3>
            </div>

            <MacroSplitBar protein={nutrition.protein} carbs={nutrition.carbs} totalFat={nutrition.totalFat} />

            <div className="grid grid-cols-4 gap-2">
              {MACRO_TILES.map(({ key, label, unit, Icon, tintClassName }) => (
                <div
                  key={key}
                  className={`flex flex-col items-center gap-1 rounded-2xl border px-2 py-2.5 ${tintClassName}`}
                >
                  <Icon className="h-4 w-4" strokeWidth={2.25} />
                  <span className="text-sm font-bold sm:text-base">
                    {nutrition[key]}
                    {unit}
                  </span>
                  <span className="text-[9px] font-semibold uppercase tracking-wide text-neutral-500 sm:text-[10px]">
                    {label}
                  </span>
                </div>
              ))}
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
