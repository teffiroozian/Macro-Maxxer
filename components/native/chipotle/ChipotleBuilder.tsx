"use client";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronLeft, Lock, Plus } from "lucide-react";
import { CutleryIcon } from "@/components/icons/SearchScopeIcons";
import NativeRestaurantLogo from "@/components/native/restaurants/NativeRestaurantLogo";
import MenuMacros from "@/components/native/restaurant/menu/MenuMacros";
import { card, pressable } from "@/components/native/saved/savedStyles";
import RestaurantItemImage from "@/components/ui/RestaurantItemImage";
import type { ChipotleBuilderConfig, ChipotleTacoCount } from "@/lib/restaurantBuilders/chipotle";
import type { CartItem } from "@/types/cart";
import type { IngredientItem, MenuItem } from "@/types/menu";
import ChipotleBuildIsland from "./ChipotleBuildIsland";
import { nutritionOf, useChipotleBuild, type BuildEntree, type BuildSection, type ChipotleBuild } from "./useChipotleBuild";

const BAR = 52;
const TACO_COUNTS: ChipotleTacoCount[] = [1, 3];

type NavEntry = { id: string; label: string; count?: string };

// Keyed by base, so each base starts empty.
export default function ChipotleBuilder({ restaurantId, entree, ingredients, config, logo, title, onBack, onAdd }: {
  restaurantId: string;
  entree: BuildEntree;
  ingredients: IngredientItem[];
  config?: ChipotleBuilderConfig;
  logo: string;
  title: string;
  onBack: () => void;
  onAdd: (item: CartItem, added: () => void) => void;
}) {
  const build = useChipotleBuild({ restaurantId, entree, ingredients, config });
  const { sections } = build;
  const tacoImage = config?.entreeOptions?.tacos?.image;
  const base = entree === "tacos" || entree === "kids-meal";
  const included = sections.find((section) => section.id === "included ingredients");
  const rest = sections.filter((section) => section.id !== "included ingredients");
  const nav: NavEntry[] = [
    ...(base ? [{ id: "base", label: entree === "tacos" ? "Tacos" : "Meal" }] : []),
    ...rest.map((section) => {
      const n = section.items.filter((item) => item.id && build.selected.has(item.id)).length;
      return { id: section.id, label: section.title, count: n ? (section.max && section.max > 1 ? `${n}/${section.max}` : String(n)) : undefined };
    }),
  ];
  const [active, setActive] = useState(nav[0]?.id);
  const sectionOf = (id: string) => document.getElementById(`build-section-${id.replace(/\s+/g, "-")}`);
  const navRef = useRef<HTMLDivElement>(null);
  const navIds = nav.map((entry) => entry.id).join("|");

  // The section under the nav is the one being browsed.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const line = (navRef.current?.getBoundingClientRect().bottom ?? 0) + 12;
      let current = navIds.split("|")[0];
      for (const id of navIds.split("|")) {
        const top = document.getElementById(`build-section-${id.replace(/\s+/g, "-")}`)?.getBoundingClientRect().top;
        if (top !== undefined && top <= line) current = id;
      }
      if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) current = navIds.split("|").at(-1) ?? current;
      setActive(current);
    };
    const onScroll = () => { if (!frame) frame = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (frame) cancelAnimationFrame(frame); };
  }, [navIds]);

  // Keep the active pill in view when the list holds more than fits.
  useEffect(() => {
    navRef.current?.querySelector<HTMLElement>(`[data-nav="${active}"]`)?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [active]);

  const jump = (id: string) => {
    const element = sectionOf(id);
    const bottom = navRef.current?.getBoundingClientRect().bottom ?? 0;
    if (!element) return;
    setActive(id);
    const smooth = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.scrollTo({ top: Math.max(0, window.scrollY + element.getBoundingClientRect().top - bottom - 4), behavior: smooth ? "smooth" : "instant" });
  };
  const anchor = (id: string) => `build-section-${id.replace(/\s+/g, "-")}`;

  return (
    <>
      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[var(--z-sticky)] h-[var(--safe-area-top)] bg-slate-50" />
      <header className="fixed inset-x-0 top-[var(--safe-area-top)] z-[var(--z-sticky)] flex h-[52px] items-center gap-2 bg-slate-50 pl-[max(14px,var(--safe-area-left))] pr-[max(14px,var(--safe-area-right))] text-slate-900">
        <button type="button" onClick={onBack} aria-label="Back to bases" className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full active:bg-slate-200/70 focus-ring"><ChevronLeft size={24} strokeWidth={2.4} className="-ml-0.5" aria-hidden="true" /></button>
        <div className="flex min-w-0 flex-1 items-center gap-[9px]">
          <NativeRestaurantLogo src={logo} size={32} />
          <h1 className="min-w-0 truncate text-[17px] font-bold">{title}</h1>
        </div>
        <button type="button" onClick={build.clear} disabled={!build.picked} className="flex h-11 shrink-0 cursor-pointer items-center px-1.5 text-base font-semibold text-accent-strong active:opacity-70 disabled:opacity-40 focus-ring">Clear</button>
      </header>

      <main className="native-nav-page min-h-[var(--app-viewport-height)] bg-slate-50 pl-[var(--safe-area-left)] pr-[var(--safe-area-right)] pt-[calc(var(--safe-area-top)+52px)] text-slate-900">
        {nav.length > 1 ? (
          <nav ref={navRef} aria-label="Ingredient categories" className="sticky z-[calc(var(--z-sticky)-1)] bg-linear-to-b from-slate-50 from-75% to-slate-50/0 px-3.5 pb-3 pt-1" style={{ top: `calc(var(--safe-area-top) + ${BAR}px)` }}>
            <div className="flex gap-1 overflow-x-auto rounded-full bg-white p-1 shadow-[0_0_0_1px_rgb(0_0_0/0.06),0_6px_16px_-8px_rgb(15_23_42/0.25)] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {nav.map((entry) => {
                const on = entry.id === active;
                return (
                  <button key={entry.id} type="button" data-nav={entry.id} aria-current={on ? "true" : undefined} onClick={() => jump(entry.id)} className={`flex h-[38px] min-w-[70px] flex-1 shrink-0 cursor-pointer items-center justify-center gap-[5px] whitespace-nowrap rounded-full px-3 text-sm font-bold transition-colors duration-150 motion-reduce:transition-none focus-ring ${on ? "bg-accent-strong text-white" : "text-slate-700 active:bg-slate-100"}`}>
                    {entry.label}{entry.count ? <span className={`text-xs font-extrabold ${on ? "text-emerald-200" : "text-accent-strong"}`}>{entry.count}</span> : null}
                  </button>
                );
              })}
            </div>
          </nav>
        ) : <div ref={navRef} className="h-1" style={{ top: `calc(var(--safe-area-top) + ${BAR}px)` }} />}

        <div className="px-4">
          {base ? (
            <section id={anchor("base")} aria-labelledby="build-base">
              {entree === "tacos" ? (
                <>
                  <Heading id="build-base" title="How many tacos?" hint="Fillings split across them" />
                  <ul className="grid grid-cols-2 gap-2.5">
                    {TACO_COUNTS.map((value) => (
                      <li key={value}>
                        <ChoiceCard on={build.count === value} onSelect={() => build.setCount(value)} label={`${value} ${value === 1 ? "taco" : "tacos"}`}>
                          <span className="flex h-[34px] items-center" aria-hidden="true">
                            {Array.from({ length: value }, (_, index) => (
                              <RestaurantItemImage key={index} src={tacoImage} alt="" containerClassName={`size-[34px] ${index ? "-ml-3" : ""}`} fallback={<CutleryIcon className="size-5 text-slate-400" />} />
                            ))}
                          </span>
                        </ChoiceCard>
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <>
                  <Heading id="build-base" title="Kid's meal" hint="Comes with a side and drink" />
                  <ul className="grid grid-cols-2 gap-2.5">
                    {build.kidsMealOptions.map((option) => (
                      <li key={option.id}>
                        <ChoiceCard on={build.kidsMeal === option.id} onSelect={() => build.setKidsMeal(option.id)} label={option.label}>
                          <RestaurantItemImage src={option.image} alt="" containerClassName="h-[46px] w-[70px]" fallback={<CutleryIcon className="size-5 text-slate-400" />} />
                        </ChoiceCard>
                      </li>
                    ))}
                  </ul>
                </>
              )}
              {included?.items.length ? <IngredientSection section={included} build={build} level={3} /> : null}
            </section>
          ) : included?.items.length ? (
            <IngredientSection section={included} build={build} />
          ) : null}

          {rest.map((section) => (
            <section key={section.id} id={anchor(section.id)}>
              <IngredientSection section={section} build={build} />
            </section>
          ))}
          {/* Room for the order card at the bottom of the screen. */}
          <div aria-hidden="true" className="h-[210px]" />
        </div>
      </main>

      <ChipotleBuildIsland build={build} onAdd={(quantity) => onAdd(build.cartItem(quantity), build.clear)} />
    </>
  );
}

function Heading({ id, title, hint, level = 2 }: { id?: string; title: string; hint?: string; level?: 2 | 3 }) {
  const Tag = level === 2 ? "h2" : "h3";
  return (
    <div className="flex items-baseline gap-3 px-1 pb-2.5 pt-[18px]">
      <Tag id={id} className={`flex-1 font-bold ${level === 2 ? "text-xl" : "text-lg"}`}>{title}</Tag>
      {hint ? <span className="text-sm font-semibold text-slate-500">{hint}</span> : null}
    </div>
  );
}

function ChoiceCard({ on, onSelect, label, children }: { on: boolean; onSelect: () => void; label: string; children: ReactNode }) {
  return (
    <button type="button" role="radio" aria-checked={on} onClick={onSelect} className={`relative flex h-[104px] w-full cursor-pointer flex-col items-center justify-center gap-2 rounded-[20px] bg-white focus-ring ${pressable} ${on ? "border border-transparent shadow-[inset_0_0_0_2px_#047857,0_8px_18px_-8px_rgb(4_120_87/0.35)]" : card}`}>
      {on ? <span className="absolute right-2 top-2 flex size-[22px] items-center justify-center rounded-full bg-accent-strong text-white"><Check size={13} strokeWidth={3.4} aria-hidden="true" /></span> : null}
      {children}
      <span className="font-heading text-sm font-bold tracking-[-0.02em]">{label}</span>
    </button>
  );
}

function IngredientSection({ section, build, level = 2 }: { section: BuildSection; build: ChipotleBuild; level?: 2 | 3 }) {
  const headingId = `build-${section.id.replace(/\s+/g, "-")}`;
  const radio = section.items.some((item) => item.id && build.isShell(item.id));
  return (
    <div role={radio ? "radiogroup" : undefined} aria-labelledby={headingId}>
      <Heading id={headingId} title={section.title} hint={section.hint} level={level} />
      <ul className="flex flex-col gap-2.5">
        {section.items.map((item) => <li key={item.id ?? item.name}><IngredientRow item={item} build={build} /></li>)}
      </ul>
    </div>
  );
}

function IngredientRow({ item, build }: { item: MenuItem; build: ChipotleBuild }) {
  const id = item.id ?? "";
  const on = build.selected.has(id);
  const locked = build.isLocked(id);
  const shell = build.isShell(id);
  const full = build.isFull(id);
  const control = build.portionControl(item);
  const nutrition = nutritionOf(item);
  const calories = Math.round(nutrition.calories ?? 0);
  const ring = on ? "!border-transparent !shadow-[inset_0_0_0_2px_#047857,0_8px_18px_-8px_rgb(4_120_87/0.35)]" : "";
  return (
    <div className={`rounded-[22px] ${card} ${ring} ${full ? "opacity-55" : ""}`}>
      <button
        type="button"
        role={shell ? "radio" : undefined}
        aria-checked={shell ? on : undefined}
        aria-pressed={shell || locked ? undefined : on}
        aria-disabled={locked || full || undefined}
        aria-label={`${item.name}, ${calories} calories${locked ? ", included" : ""}${full ? ", category full" : ""}`}
        onClick={() => { if (!locked && !full) build.toggle(item); }}
        className={`flex w-full items-center gap-3 rounded-[22px] py-2 pl-2 pr-3 text-left focus-ring ${locked ? "cursor-default" : `cursor-pointer ${pressable}`}`}
      >
        <RestaurantItemImage src={item.image} alt="" imagePresentation={item.imagePresentation} containerClassName="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-slate-100" fallback={<CutleryIcon className="size-6 text-slate-400" />} />
        <span className="block min-w-0 flex-1">
          <span className="block truncate font-heading text-[15px] font-bold leading-5 tracking-[-0.02em]">{item.name}</span>
          <MenuMacros nutrition={nutrition} className="mt-1.5" />
        </span>
        {locked ? (
          <span className="flex h-7 shrink-0 items-center gap-1 rounded-full bg-slate-100 px-2.5 text-xs font-bold text-slate-600"><Lock size={11} strokeWidth={2.8} aria-hidden="true" />Included</span>
        ) : on ? (
          <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-strong text-white"><Check size={15} strokeWidth={3.2} /></span>
        ) : (
          <span aria-hidden="true" className={`flex size-7 shrink-0 items-center justify-center rounded-full ${shell ? "border-2 border-slate-300" : "bg-accent-soft text-accent-strong"}`}>{shell ? null : <Plus size={16} strokeWidth={3} />}</span>
        )}
      </button>
      {control ? (
        <div role="radiogroup" aria-label={`${item.name} portion`} className="mx-2 mb-2 flex gap-0.5 rounded-xl bg-slate-100 p-[3px]">
          {control.options.map((option) => {
            const chosen = option.id === control.selected;
            return (
              <button key={option.id} type="button" role="radio" aria-checked={chosen} disabled={control.disabled} onClick={() => build.setPortion(item, option.id)} className={`h-[30px] flex-1 cursor-pointer rounded-[9px] text-[13px] font-bold disabled:cursor-default focus-ring ${chosen ? "bg-white text-accent-strong shadow-[0_1px_3px_rgb(15_23_42/0.14)]" : "text-slate-600"} ${control.disabled ? "opacity-60" : ""}`}>{option.label}</button>
            );
          })}
        </div>
      ) : null}
      {control?.disabled ? <p className="-mt-1 px-4 pb-2.5 text-xs font-semibold text-slate-500">Half portion each when you pick two</p> : null}
    </div>
  );
}
