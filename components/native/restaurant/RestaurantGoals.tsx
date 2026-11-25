import { Droplet, Drumstick, Flame, Leaf, Wheat, Zap, type LucideIcon } from "lucide-react";
import { card, pressable } from "@/components/native/saved/savedStyles";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import { CutleryIcon } from "@/components/icons/SearchScopeIcons";
import type { Goal, GoalId } from "@/lib/native/restaurantMenu";

const ICONS: Record<GoalId, { Icon: LucideIcon; color: string }> = {
  "high-protein": { Icon: Drumstick, color: "text-[#c2410c] dark:text-[#f96306]" },
  "lean-protein": { Icon: Zap, color: "text-accent-strong" },
  "low-calorie": { Icon: Flame, color: "text-slate-900 dark:text-slate-50" },
  "low-carb": { Icon: Wheat, color: "text-[#ca8a04] dark:text-[#f9c406]" },
  "high-fiber": { Icon: Leaf, color: "text-[#047857] dark:text-accent-strong" },
  "low-fat": { Icon: Droplet, color: "text-[#2563eb] dark:text-[#336dfa]" },
};

export default function RestaurantGoals({ goals, active, onPick }: { goals: Goal[]; active: GoalId | null; onPick: (id: GoalId) => void }) {
  if (!goals.length) return null;
  return (
    <section aria-labelledby="restaurant-goals" className="px-[18px] pt-4">
      <h2 id="restaurant-goals" className="flex h-11 items-center px-0.5 text-xl font-bold">Explore by goal</h2>
      <ul className="grid grid-cols-3 gap-2.5">
        {goals.map(({ id, label, photo }) => {
          const { Icon, color } = ICONS[id];
          return (
            <li key={id} className="min-w-0">
              <button type="button" aria-pressed={active === id} onClick={() => onPick(id)} className={`flex h-[122px] w-full cursor-pointer flex-col items-center rounded-[22px] px-1 pt-2 focus-ring ${card} ${pressable}`}>
                <RestaurantItemImage src={photo?.image} alt="" imagePresentation={photo?.imagePresentation} containerClassName="flex h-[74px] w-20 items-center justify-center overflow-hidden rounded-2xl dark:bg-image-placeholder" fallback={<CutleryIcon className="size-6 text-slate-400" />} />
                <span className="mt-2 flex max-w-full items-center gap-[5px] text-[13px] font-bold leading-[18px] text-slate-900 min-[390px]:text-sm dark:text-slate-50">
                  <Icon size={15} strokeWidth={2.2} className={`hidden shrink-0 min-[360px]:block ${color}`} aria-hidden="true" />
                  <span className="truncate">{label}</span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
