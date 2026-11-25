import { Minus, Plus } from "lucide-react";
import { CutleryIcon } from "@/components/icons/SearchScopeIcons";
import { addCircle, card } from "@/components/native/saved/savedStyles";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import { formatScore, getProteinScore, getScoreTier, PILL_TIERS } from "@/lib/native/fullMenu";
import type { CardDisplayMode } from "@/lib/menuItemCard/rankingMacroDisplay";
import { getDefaultMenuItemNutrition } from "@/lib/nutrition";
import type { MenuItem } from "@/types/menu";
import MenuMacros from "./MenuMacros";

export type MenuCardProps = {
  item: MenuItem;
  title: string;
  // Place in the active ranking.
  rank?: number;
  mode: CardDisplayMode;
  layout: "list" | "grid";
  query?: string;
  quantity: number;
  onOpen: () => void;
  onAdd: () => void;
  onRemove: () => void;
};

function Title({ text, query }: { text: string; query?: string }) {
  const at = query ? text.toLowerCase().indexOf(query.toLowerCase()) : -1;
  if (!query || at < 0) return text;
  return <>{text.slice(0, at)}<span className="text-accent-strong">{text.slice(at, at + query.length)}</span>{text.slice(at + query.length)}</>;
}

const step = "flex h-11 w-9 cursor-pointer items-center justify-center active:opacity-60 focus-ring";

function AddControl({ title, quantity, onAdd, onRemove, raised }: { title: string; quantity: number; onAdd: () => void; onRemove: () => void; raised: boolean }) {
  if (!quantity) {
    return (
      <button type="button" aria-label={`Add ${title}`} onClick={onAdd} className="flex size-11 cursor-pointer items-center justify-center rounded-full active:opacity-70 focus-ring">
        <span className={`size-9 ${addCircle}`}><Plus size={17} strokeWidth={2.8} aria-hidden="true" /></span>
      </button>
    );
  }
  return (
    <span className="flex h-11 items-center">
      <span className={`flex h-9 items-center overflow-hidden rounded-full text-accent-strong ${raised ? "bg-white shadow-[0_2px_8px_rgba(15,23,42,0.18)] dark:bg-surface-hover" : "bg-accent-soft"}`}>
        <button type="button" aria-label={`One fewer ${title}`} onClick={onRemove} className={step}><Minus size={15} strokeWidth={3} aria-hidden="true" /></button>
        <span aria-live="polite" aria-label={`${quantity} in your order`} className="min-w-3.5 text-center text-[15px] font-bold tabular-nums">{quantity}</span>
        <button type="button" aria-label={`One more ${title}`} onClick={onAdd} className={step}><Plus size={15} strokeWidth={3} aria-hidden="true" /></button>
      </span>
    </span>
  );
}

export default function MenuItemCard({ item, title, rank, mode, layout, query, quantity, onOpen, onAdd, onRemove }: MenuCardProps) {
  const nutrition = getDefaultMenuItemNutrition(item);
  const score = getProteinScore(item);
  const list = layout === "list";
  const label = `${rank ? `Number ${rank}, ` : ""}${title}, ${Math.round(nutrition.calories ?? 0)} calories, ${Math.round(nutrition.protein ?? 0)} grams protein`;
  const badge = rank ? <span className={`absolute flex h-6 min-w-6 items-center justify-center rounded-full bg-white px-1.5 text-[13px] font-bold text-accent-strong shadow-[0_1px_4px_rgba(15,23,42,0.2)] dark:bg-control ${list ? "-left-1.5 -top-1.5" : "left-[7px] top-[7px]"}`}>{rank}</span> : null;
  const photo = (
    <span className={`relative block shrink-0 ${list ? "size-[68px] min-[375px]:size-[84px]" : "h-[104px] w-full"}`}>
      <RestaurantItemImage
        src={item.image}
        alt=""
        imagePresentation={item.imagePresentation}
        containerClassName={`flex size-full items-center justify-center overflow-hidden bg-slate-100 ${item.image ? "dark:bg-image-placeholder" : "dark:bg-surface-hover"} ${list ? "rounded-[18px]" : "rounded-[17px]"}`}
        fallback={<CutleryIcon className="size-6 text-slate-400" />}
      />
      {badge}
    </span>
  );
  const name = <Title text={title} query={query} />;
  const scoreLine = (
    <span className="mt-[3px] flex items-center gap-1 whitespace-nowrap text-[13px] leading-[17px] text-slate-500 dark:text-slate-400">
      <svg width="12" height="12" viewBox="0 0 24 24" className="shrink-0 text-accent-strong" fill="currentColor" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 9-12h-7z" /></svg>
      <b className="font-bold dark:!text-slate-100" style={{ color: PILL_TIERS[getScoreTier(score)].value }}>{formatScore(score)}g</b>
      <span className="truncate">{list ? "protein / 100 cal" : "per 100 cal"}</span>
    </span>
  );

  return (
    <article className={`relative min-w-0 rounded-3xl ${card} ${list ? "p-3" : "h-full p-[9px] pb-2.5"}`}>
      <button type="button" onClick={onOpen} aria-label={label} className={`w-full min-w-0 cursor-pointer rounded-[18px] text-left transition-transform duration-[120ms] active:scale-[.985] motion-reduce:transition-none motion-reduce:active:scale-100 focus-ring ${list ? "flex gap-3.5" : "flex h-full flex-col"}`}>
        {photo}
        {list ? (
          <span className="block min-w-0 flex-1 pt-px">
            <span className={`line-clamp-2 text-base font-bold leading-5 text-slate-900 dark:text-slate-50 ${quantity ? "pr-[88px]" : "pr-11"}`}>{name}</span>
            {scoreLine}
            <MenuMacros nutrition={nutrition} mode={mode} className="mt-2" />
          </span>
        ) : (
          <span className="flex w-full flex-1 flex-col px-1 pt-2.5">
            <span className="line-clamp-2 min-h-[38px] text-[15px] font-bold leading-[19px] text-slate-900 dark:text-slate-50">{name}</span>
            {scoreLine}
            <MenuMacros nutrition={nutrition} mode={mode} columns={2} className="mt-2" />
          </span>
        )}
      </button>
      <span className={`absolute ${list ? "right-2 top-[7px]" : "right-3 top-[66px]"}`}><AddControl title={title} quantity={quantity} onAdd={onAdd} onRemove={onRemove} raised={!list} /></span>
    </article>
  );
}
