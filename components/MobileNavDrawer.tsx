"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Store, ChevronDown, ChevronRight, SlidersHorizontal, X } from "lucide-react";
import { getAllRestaurants } from "@/lib/restaurants";
import AppIconButton from "@/components/ui/AppIconButton";
import { useBuildInProgressGuard } from "@/components/BuildInProgressGuardContext";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { isPlainLeftClick } from "@/lib/isPlainLeftClick";
import RestaurantLogoBadge from "@/components/ui/RestaurantLogoBadge";
import { IS_CAPACITOR_BUILD } from "@/lib/buildTarget";

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
  const [wasOpen, setWasOpen] = useState(isOpen);
  const availableRestaurants = getAllRestaurants().filter((restaurant) => !restaurant.isComingSoon);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);
  const router = useRouter();
  const { guardNavigation } = useBuildInProgressGuard();

  // This drawer declares itself `role="dialog" aria-modal="true"` below, so
  // it needs to behave like one: Escape closes it, opening moves focus into
  // it (the close button — first focusable element in the panel), and
  // closing restores focus to whatever triggered it.
  useDialogA11y({ isOpen, onClose, initialFocusRef: closeButtonRef });

  // This drawer stays mounted at all times (only `isOpen` toggles its
  // translate/opacity classes) so the CSS transition can actually animate
  // both directions — callers used to force a fresh mount via a changing
  // `key` prop to reset the tab/section state below, but that also meant
  // the very first paint already had the "open" classes applied with no
  // prior "closed" frame to transition from, so it appeared instantly
  // instead of sliding in. Resetting the state here on the closed->open
  // edge — during render, not in an effect, per
  // https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  // — gets the same fresh-state behavior without remounting.
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setActiveTab(defaultTab);
      setIsFeaturedOpen(true);
    }
  }

  return (
    <div
      className={`fixed inset-0 z-[var(--z-drawer)] ${IS_CAPACITOR_BUILD ? "" : "lg:hidden"} ${isOpen ? "" : "pointer-events-none"}`}
      aria-modal="true"
      role="dialog"
      // Stays mounted at all times for the slide transition (see the
      // wasOpen comment below) — `inert` keeps its off-screen content out of
      // the tab order and hidden from assistive tech while closed, since
      // `pointer-events-none` alone only blocks pointer interaction.
      inert={!isOpen}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Close navigation drawer"
        className={`absolute inset-0 bg-overlay-scrim transition-opacity duration-200 ${isOpen ? "opacity-100" : "opacity-0"}`}
      />
      <div
        ref={panelRef}
        className={`absolute flex flex-col overflow-hidden bg-white shadow-[0_18px_40px_rgba(0,0,0,0.24)] transition-transform duration-200 ${
          IS_CAPACITOR_BUILD
            ? `inset-x-0 bottom-0 max-h-[88dvh] min-h-[50dvh] w-full rounded-t-sheet ${isOpen ? "translate-y-0" : "translate-y-full"}`
            : `inset-y-0 left-0 h-[var(--app-viewport-height)] w-[min(90vw,360px)] pt-[var(--safe-area-top)] ${isOpen ? "translate-x-0" : "-translate-x-full"}`
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-black/5 bg-slate-50/80 px-4 py-3">
          <AppIconButton ref={closeButtonRef} onClick={onClose} variant="ghost" size="sm" aria-label="Close navigation drawer">
            <X className="h-4 w-4" strokeWidth={2.5} />
          </AppIconButton>
          {headerTitle ? (
            <div className="inline-flex min-w-0 items-center gap-2">
              {headerLogoSrc ? (
                <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full bg-white ring-1 ring-black/5">
                  <Image src={headerLogoSrc} alt={`${headerTitle} logo`} fill className="object-contain" />
                </span>
              ) : null}
              <span className="truncate text-[15px] font-semibold text-slate-900">{headerTitle}</span>
            </div>
          ) : null}
        </div>

        {/* Compact segmented control (soft neutral track, white "pressed"
            surface for the active tab) replaces the old blue underline —
            same icons/click handlers, just a treatment consistent with the
            rest of the app's green design system instead of a stray blue
            accent. */}
        <div className="border-b border-black/5 px-4 py-2.5">
          <div className="inline-flex gap-1 rounded-xl bg-slate-100 p-1">
            {showControls ? (
              <button
                type="button"
                onClick={() => setActiveTab("controls")}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all duration-200 ${
                  activeTab === "controls"
                    ? "bg-white text-slate-900 shadow-sm"
                    : "text-slate-500 hover:text-slate-700"
                }`}
              >
                <SlidersHorizontal className="h-4 w-4" strokeWidth={2.4} />
                Controls
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => setActiveTab("restaurants")}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold transition-all duration-200 ${
                activeTab === "restaurants"
                  ? "bg-white text-slate-900 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              <Store className="h-4 w-4" strokeWidth={2.4} />
              Restaurants
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,var(--safe-area-bottom))] pt-4">
          {activeTab === "controls" && showControls ? (
            <div>{controlsContent}</div>
          ) : (
            <div className="space-y-5">
              {browseTopContent ? <div>{browseTopContent}</div> : null}
              <section className="space-y-2">
                <button type="button" onClick={() => setIsFeaturedOpen((prev) => !prev)} className="flex w-full items-center justify-between text-left">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Featured Restaurants</p>
                  <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform ${isFeaturedOpen ? "rotate-180" : ""}`} strokeWidth={2.5} />
                </button>
                {isFeaturedOpen ? (
                  <div className="space-y-3">
                    <div>
                      <p className="px-1 pb-1.5 text-label text-slate-400">Available Now</p>
                      {/* Its own row treatment — flat surfaces with a hairline
                          divider between items instead of the desktop
                          dropdown's individually outlined cards, so this
                          reads as designed for the drawer rather than reused
                          wholesale. */}
                      <div className="divide-y divide-black/5 overflow-hidden rounded-xl border border-black/5">
                        {availableRestaurants.map((restaurant) => (
                          <Link
                            key={restaurant.id}
                            href={`/restaurant/${restaurant.id}`}
                            onClick={(event) => {
                              onClose();
                              if (!isPlainLeftClick(event)) return;
                              event.preventDefault();
                              const href = `/restaurant/${restaurant.id}`;
                              guardNavigation(() => router.push(href));
                            }}
                            className="flex items-center justify-between gap-2 bg-white px-3 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 active:bg-slate-100"
                          >
                            <span className="inline-flex min-w-0 items-center gap-2.5">
                              <RestaurantLogoBadge
                                src={restaurant.logo}
                                alt={`${restaurant.name} logo`}
                                size="xs"
                                ring={false}
                                fit="cover"
                                className="ring-1 ring-black/5"
                              />
                              <span className="truncate">{restaurant.name}</span>
                            </span>
                            <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2.5} />
                          </Link>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="mx-2 mb-2 border-t border-black/10" />
                      <Link
                        href="/restaurants"
                        onClick={(event) => {
                          onClose();
                          if (!isPlainLeftClick(event)) return;
                          event.preventDefault();
                          guardNavigation(() => router.push("/restaurants"));
                        }}
                        className="flex items-center justify-between rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-50 active:bg-slate-100"
                      >
                        <span>All Restaurants</span>
                        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={2.5} />
                      </Link>
                    </div>
                  </div>
                ) : null}
              </section>
            </div>
          )}
        </div>
        {activeTab === "controls" && showControls && controlsFooter ? (
          <div className="sticky bottom-0 border-t border-black/5 bg-white px-4 pb-[max(0.75rem,var(--safe-area-bottom))] pt-3 shadow-[0_-6px_16px_rgba(15,23,42,0.06)]">
            {controlsFooter}
          </div>
        ) : null}
      </div>
    </div>
  );
}
