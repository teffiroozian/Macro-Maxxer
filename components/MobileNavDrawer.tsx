"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Store, ChevronDown, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { getAllRestaurants } from "@/lib/restaurants";

type DrawerTab = "controls" | "restaurants";

export default function MobileNavDrawer({
  isOpen,
  onClose,
  showControls = false,
  defaultTab = "restaurants",
  controlsContent,
  controlsFooter,
  headerTitle,
  headerLogoSrc,
  browseTopContent,
}: {
  isOpen: boolean;
  onClose: () => void;
  showControls?: boolean;
  defaultTab?: DrawerTab;
  controlsContent?: React.ReactNode;
  controlsFooter?: React.ReactNode;
  headerTitle?: string;
  headerLogoSrc?: string;
  browseTopContent?: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<DrawerTab>(defaultTab);
  const [isFeaturedOpen, setIsFeaturedOpen] = useState(true);
  const visibleRestaurants = getAllRestaurants();

  const featuredRestaurants = useMemo(
    () => visibleRestaurants.filter((restaurant) => restaurant.isMacroFriendly),
    [visibleRestaurants]
  );

  return (
    <div className={`fixed inset-0 z-[210] lg:hidden ${isOpen ? "" : "pointer-events-none"}`} aria-modal="true" role="dialog">
      <button
        type="button"
        onClick={onClose}
        aria-label="Close navigation drawer"
        className={`absolute inset-0 bg-black/35 transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0"}`}
      />
      <div
        className={`absolute inset-y-0 left-0 flex w-[min(90vw,360px)] flex-col bg-white shadow-[0_18px_40px_rgba(0,0,0,0.24)] transition-transform duration-200 ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-black/10 px-4 py-3">
          <button type="button" onClick={onClose} className="rounded-full border border-black/15 p-2 text-black/70">
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
          {headerTitle ? (
            <div className="inline-flex min-w-0 items-center gap-2.5">
              {headerLogoSrc ? (
                <span className="relative h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-white">
                  <Image src={headerLogoSrc} alt={`${headerTitle} logo`} fill className="object-contain rounded-md" />
                </span>
              ) : null}
              <span className="truncate text-base font-semibold text-slate-900">{headerTitle}</span>
            </div>
          ) : null}
        </div>

        <div className="border-b border-black/10 px-4 pt-2.5">
          <div className="flex gap-1">
            {showControls ? (
              <button
                type="button"
                onClick={() => setActiveTab("controls")}
                className={`inline-flex items-center gap-2 border-b-2 px-3 pb-2 text-sm font-semibold transition-colors ${
                  activeTab === "controls"
                    ? "border-blue-600 text-slate-900"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" strokeWidth={2.4} />
                Controls
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setActiveTab("restaurants")}
              className={`inline-flex items-center gap-2 border-b-2 px-3 pb-2 text-sm font-semibold transition-colors ${
                activeTab === "restaurants"
                  ? "border-blue-600 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              }`}
            >
              <Store className="h-4 w-4" strokeWidth={2.4} />
              Restaurants
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {activeTab === "controls" && showControls ? (
            <div>{controlsContent}</div>
          ) : (
            <div className="space-y-4">
              {browseTopContent ? <div>{browseTopContent}</div> : null}
              <section className="space-y-2.5">
                <button type="button" onClick={() => setIsFeaturedOpen((prev) => !prev)} className="flex w-full items-center justify-between text-left">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-black/50">Featured Restaurants</h4>
                  <ChevronDown className={`h-4 w-4 text-black/60 transition-transform ${isFeaturedOpen ? "rotate-180" : ""}`} strokeWidth={2.5} />
                </button>
                {isFeaturedOpen ? (
                  <div className="grid gap-1.5">
                    {featuredRestaurants.map((restaurant) =>
                      !restaurant.isComingSoon ? (
                        <Link key={restaurant.id} href={`/restaurant/${restaurant.id}`} onClick={onClose} className="inline-flex items-center justify-between rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm font-semibold text-black/85">
                          <span className="inline-flex min-w-0 items-center gap-2.5">
                            <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md border border-black/10 bg-white">
                              <Image src={restaurant.logo} alt={`${restaurant.name} logo`} fill className="object-cover" />
                            </span>
                            <span className="truncate">{restaurant.name}</span>
                          </span>
                          <ChevronRight className="h-4 w-4 text-black/50" strokeWidth={2.5} />
                        </Link>
                      ) : (
                        <div key={restaurant.id} aria-disabled="true" className="inline-flex items-center justify-between rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm font-semibold text-black/85 opacity-40">
                          <span className="inline-flex min-w-0 items-center gap-2.5">
                            <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md border border-black/10 bg-white">
                              <Image src={restaurant.logo} alt={`${restaurant.name} logo`} fill className="object-cover" />
                            </span>
                            <span className="truncate">{restaurant.name}</span>
                          </span>
                          <span className="rounded-full border border-neutral-300 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-neutral-500">
                            Coming Soon
                          </span>
                        </div>
                      )
                    )}
                  </div>
                ) : null}
              </section>
            </div>
          )}
        </div>
        {activeTab === "controls" && showControls && controlsFooter ? (
          <div className="sticky bottom-0 border-t border-black/10 bg-white px-4 py-3">
            {controlsFooter}
          </div>
        ) : null}
      </div>
    </div>
  );
}
