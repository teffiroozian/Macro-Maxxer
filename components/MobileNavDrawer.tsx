"use client";

import { useRef } from "react";
import Image from "next/image";
import { SlidersHorizontal, X } from "lucide-react";
import AppIconButton from "@/components/ui/AppIconButton";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { IS_CAPACITOR_BUILD } from "@/lib/buildTarget";


export default function MobileNavDrawer({
  isOpen,
  onClose,
  controlsContent,
  controlsFooter,
  headerTitle,
  headerLogoSrc,
}: {
  isOpen: boolean;
  onClose: () => void;
  controlsContent?: React.ReactNode;
  controlsFooter?: React.ReactNode;
  headerTitle?: string;
  headerLogoSrc?: string;
}) {
  const panelRef = useRef<HTMLDivElement | null>(null);
  const closeButtonRef = useRef<HTMLButtonElement | null>(null);

  // This drawer declares itself `role="dialog" aria-modal="true"` below, so
  // it needs to behave like one: Escape closes it, opening moves focus into
  // it (the close button — first focusable element in the panel), and
  // closing restores focus to whatever triggered it.
  useDialogA11y({ isOpen, onClose, initialFocusRef: closeButtonRef });

  return (
    <div
      className={`fixed inset-0 z-[var(--z-drawer)] ${IS_CAPACITOR_BUILD ? "" : "lg:hidden"} ${isOpen ? "" : "pointer-events-none"}`}
      aria-modal="true"
      role="dialog"
      // Stays mounted at all times for the slide transition (see the
      // transition classes below) — `inert` keeps its off-screen content out of
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
        className={`absolute flex flex-col overflow-hidden bg-white dark:bg-surface-card shadow-[0_18px_40px_rgba(0,0,0,0.24)] transition-transform duration-200 ${
          IS_CAPACITOR_BUILD
            ? `inset-x-0 bottom-0 max-h-[88dvh] min-h-[50dvh] w-full rounded-t-sheet ${isOpen ? "translate-y-0" : "translate-y-full"}`
            : `inset-y-0 left-0 h-[var(--app-viewport-height)] w-[min(90vw,360px)] pt-[var(--safe-area-top)] ${isOpen ? "translate-x-0" : "-translate-x-full"}`
        }`}
      >
        <div className="flex items-center gap-2.5 border-b border-black/5 dark:border-hairline bg-slate-50/80 dark:bg-surface-subtle px-4 py-3">
          <AppIconButton ref={closeButtonRef} onClick={onClose} variant="ghost" size="sm" aria-label="Close navigation drawer">
            <X className="h-4 w-4" strokeWidth={2.5} />
          </AppIconButton>
          {headerTitle ? (
            <div className="inline-flex min-w-0 items-center gap-2">
              {headerLogoSrc ? (
                <span className="relative h-7 w-7 shrink-0 overflow-hidden rounded-full logo-surface ring-1 ring-black/5">
                  <Image src={headerLogoSrc} alt={`${headerTitle} logo`} fill className="object-contain" />
                </span>
              ) : null}
              <span className="truncate text-[15px] font-semibold text-slate-900 dark:text-slate-100">{headerTitle}</span>
            </div>
          ) : null}
        </div>

        <div className="border-b border-black/5 dark:border-hairline px-4 py-2.5">
          <div className="inline-flex gap-1 rounded-xl bg-slate-100 dark:bg-surface-subtle p-1">
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-surface-hover px-3 py-1.5 text-sm font-semibold text-slate-900 dark:text-slate-100 shadow-sm">
              <SlidersHorizontal className="h-4 w-4" strokeWidth={2.4} />
              Controls
            </span>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(1rem,var(--safe-area-bottom))] pt-4">
          <div>{controlsContent}</div>
        </div>
        {controlsFooter ? (
          <div className="sticky bottom-0 border-t border-black/5 dark:border-hairline bg-white dark:bg-surface-card px-4 pb-[max(0.75rem,var(--safe-area-bottom))] pt-3 shadow-[0_-6px_16px_rgba(15,23,42,0.06)]">
            {controlsFooter}
          </div>
        ) : null}
      </div>
    </div>
  );
}
