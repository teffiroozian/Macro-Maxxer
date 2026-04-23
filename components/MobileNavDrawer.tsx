"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ChevronDown, ChevronRight, X } from "lucide-react";
import restaurants from "@/app/data/index.json";

type DrawerTab = "controls" | "browse";

export default function MobileNavDrawer({
  isOpen,
  onClose,
  showControls = false,
  defaultTab = "browse",
  browseVariant = "default",
  controlsContent,
}: {
  isOpen: boolean;
  onClose: () => void;
  showControls?: boolean;
  defaultTab?: DrawerTab;
  browseVariant?: "default" | "home";
  controlsContent?: React.ReactNode;
}) {
  const [activeTab, setActiveTab] = useState<DrawerTab>(defaultTab);
  const [isFeaturedOpen, setIsFeaturedOpen] = useState(false);

  const featuredRestaurants = useMemo(
    () => restaurants.filter((restaurant) => restaurant.isMacroFriendly).slice(0, 5),
    []
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
        <div className="flex items-center justify-between border-b border-black/10 px-4 py-3">
          <h3 className="text-lg font-bold text-black/90">Navigation</h3>
          <button type="button" onClick={onClose} className="rounded-full border border-black/15 p-2 text-black/70">
            <X className="h-4 w-4" strokeWidth={2.5} />
          </button>
        </div>

        <div className="border-b border-black/10 px-4 py-2.5">
          <div className="flex gap-2">
            {showControls ? (
              <button
                type="button"
                onClick={() => setActiveTab("controls")}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${activeTab === "controls" ? "border-black/80 bg-black/85 text-white" : "border-black/20 bg-white text-black/75"}`}
              >
                Controls
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setActiveTab("browse")}
              className={`rounded-full border px-3 py-1.5 text-sm font-semibold ${activeTab === "browse" ? "border-black/80 bg-black/85 text-white" : "border-black/20 bg-white text-black/75"}`}
            >
              Browse
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 py-4">
          {activeTab === "controls" && showControls ? (
            <div>{controlsContent}</div>
          ) : (
            <div className="space-y-4">
              {browseVariant === "home" ? (
                <div className="grid gap-2">
                  <a href="#macro-friendly-section" onClick={onClose} className="rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm font-semibold text-black/85">
                    Macro-Friendly
                  </a>
                  <a href="#all-restaurants-section" onClick={onClose} className="rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm font-semibold text-black/85">
                    All Restaurants
                  </a>
                </div>
              ) : null}

              <section className="space-y-2.5">
                <button type="button" onClick={() => setIsFeaturedOpen((prev) => !prev)} className="flex w-full items-center justify-between text-left">
                  <h4 className="text-sm font-semibold uppercase tracking-wide text-black/50">Featured Restaurants</h4>
                  <ChevronDown className={`h-4 w-4 text-black/60 transition-transform ${isFeaturedOpen ? "rotate-180" : ""}`} strokeWidth={2.5} />
                </button>
                {isFeaturedOpen ? (
                  <div className="grid gap-1.5">
                    {featuredRestaurants.map((restaurant) => (
                      <Link key={restaurant.id} href={`/restaurant/${restaurant.id}`} onClick={onClose} className="inline-flex items-center justify-between rounded-xl border border-black/15 bg-white px-3 py-2.5 text-sm font-semibold text-black/85">
                        <span className="inline-flex min-w-0 items-center gap-2.5">
                          <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-md border border-black/10 bg-white">
                            <Image src={restaurant.logo} alt={`${restaurant.name} logo`} fill className="object-cover" />
                          </span>
                          <span className="truncate">{restaurant.name}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-black/50" strokeWidth={2.5} />
                      </Link>
                    ))}
                  </div>
                ) : null}
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
