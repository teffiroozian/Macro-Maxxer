"use client";

import type { CartMacros } from "@/types/cart";
import MacroTotalsGrid from "@/components/MacroTotalsGrid";
import AppButton from "@/components/ui/AppButton";
import type { LucideIcon } from "lucide-react";
import { Bookmark, Camera } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";

// How long to keep the expanded panel mounted after it starts closing,
// before actually removing it from the DOM. Must be at least as long as the
// slower of the two enter/exit transitions below (mobile's 300ms bottom-
// sheet slide; desktop's 200ms modal fade/scale, set via `duration-200` /
// `duration-300` directly in the className below, not from this constant —
// Tailwind classes have to be static strings) so the sheet never gets
// yanked out mid-slide on mobile.
const EXPANDED_PANEL_UNMOUNT_DELAY_MS = 300;

type StickyMacroTotalsBarProps = {
  totals: CartMacros;
  visible?: boolean;
  inline?: boolean;
  layoutPreset?: "build" | "cart";
  contextLine?: string;
  primaryActionLabel?: string;
  secondaryActionLabel?: string;
  secondaryActionExpandedLabel?: string;
  PrimaryActionIcon?: LucideIcon;
  SecondaryActionIcon?: LucideIcon;
  SecondaryActionExpandedIcon?: LucideIcon;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  detailsOpen?: boolean;
  detailsContent?: ReactNode;
};

type StickyMacroTotalsLayout = NonNullable<StickyMacroTotalsBarProps["layoutPreset"]>;

type MacroSummarySectionProps = {
  contextLine?: string;
  isCartLayout: boolean;
  totals: CartMacros;
};

type ActionSectionProps = {
  detailsOpen: boolean;
  isCartLayout: boolean;
  onPrimaryAction?: () => void;
  onSecondaryAction?: () => void;
  primaryButtonText: string;
  secondaryButtonText: string;
  PrimaryActionIcon: LucideIcon;
  SecondaryActionIcon: LucideIcon;
  SecondaryActionExpandedIcon?: LucideIcon;
};

function getWrapperClassName(inline: boolean, isCartLayout: boolean, visible: boolean) {
  if (inline) {
    return "w-full";
  }

  return `fixed left-0 right-0 ${
    isCartLayout
      ? "bottom-2 max-w-5xl px-2 sm:bottom-4 sm:px-6"
      : "bottom-0 md:bottom-1 md:max-w-6xl md:px-2"
  } mx-auto z-[120] transition-all duration-300 ease-out ${
    visible
      ? "pointer-events-none translate-y-0 opacity-100"
      : "pointer-events-none translate-y-4 opacity-0"
  }`;
}

function getPanelClassName({
  inline,
  isCartLayout,
  visible,
}: {
  inline: boolean;
  isCartLayout: boolean;
  visible: boolean;
}) {
  if (inline) {
    return `w-full rounded-3xl border border-black/10 bg-white px-4 ${isCartLayout ? "py-4" : "py-3"}`;
  }

  // Build layout doubles as the mobile bottom sheet: full-bleed, flush to
  // the viewport edge, top corners only, with a safe-area-aware bottom
  // padding so it reads correctly under the iPhone home indicator (PWA) and
  // doesn't leave a transparent strip below it for Safari's chrome to show
  // through. `md:` restores the original floating pill for desktop.
  const layoutClassName = isCartLayout
    ? "rounded-[1.5rem] border border-black/10 px-3 py-4 shadow-[0_10px_30px_rgba(0,0,0,0.24)] sm:rounded-[2.25rem] sm:px-6 sm:py-6"
    : "rounded-t-3xl border-t border-x-0 border-b-0 border-slate-200/70 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-[0_-8px_24px_rgba(0,0,0,0.14)] md:rounded-2xl md:border md:px-4 md:py-2 md:shadow-[0_10px_30px_rgba(0,0,0,0.24)]";

  return `mx-auto w-full ${layoutClassName} bg-white transition-all duration-300 ${
    visible ? "pointer-events-auto" : "pointer-events-none"
  }`;
}

function MacroSummarySection({ contextLine, isCartLayout, totals }: MacroSummarySectionProps) {
  return (
    <section className={`${isCartLayout ? "flex-1" : "w-full md:w-auto md:shrink-0"}`}>
      {contextLine ? (
        <p className="text-sm font-medium tracking-tight text-slate-500">
          {contextLine}
        </p>
      ) : null}
      {isCartLayout ? (
        <p className={`text-left text-sm font-semibold tracking-tight text-slate-500 sm:text-center ${contextLine ? "mt-1" : ""}`}>
          TOTAL MACROS
        </p>
      ) : null}
      <MacroTotalsGrid
        macros={totals}
        variant="bar"
        size={isCartLayout ? "panel" : "compact"}
        className={`${
          isCartLayout
            ? "mt-4 grid-cols-2 gap-x-4 gap-y-4 sm:grid-cols-4 sm:gap-x-6"
            : `mt-1 w-full grid-cols-4 gap-x-3 ${contextLine ? "sm:mt-2" : ""} md:w-fit`
        }`}
        labelClassName={`${isCartLayout ? "text-[#1A1A1A]" : "text-[#1A1A1A] !mt-0.5 !text-[9px] sm:!text-[10px]"}`}
        valueClassName={isCartLayout ? "" : "!text-xl sm:!text-2xl lg:!text-xl"}
      />
    </section>
  );
}

function ActionSection({
  detailsOpen,
  isCartLayout,
  onPrimaryAction,
  onSecondaryAction,
  primaryButtonText,
  secondaryButtonText,
  PrimaryActionIcon,
  SecondaryActionIcon,
  SecondaryActionExpandedIcon,
}: ActionSectionProps) {
  const buttonSize = isCartLayout ? "lg" : "sm";
  const buttonClassName = `${isCartLayout ? "h-[48px]" : "h-8 px-3 text-sm"} ${
    isCartLayout ? "" : "flex-1 md:flex-none"
  }`;
  const SecondaryIcon = detailsOpen && SecondaryActionExpandedIcon
    ? SecondaryActionExpandedIcon
    : SecondaryActionIcon;

  return (
    <div
      className={`flex ${isCartLayout ? "gap-2 sm:gap-2.5" : "gap-1.5 sm:gap-2"} ${
        isCartLayout ? "w-full flex-col sm:w-auto" : "w-full shrink-0 flex-row md:w-auto"
      }`}
    >
      <AppButton
        variant="secondary"
        size={buttonSize}
        onClick={onSecondaryAction}
        className={buttonClassName}
      >
        <SecondaryIcon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
        <span>{secondaryButtonText}</span>
      </AppButton>
      <AppButton
        variant="primary"
        size={buttonSize}
        onClick={onPrimaryAction}
        className={buttonClassName}
      >
        <PrimaryActionIcon className="h-4 w-4" strokeWidth={2.5} aria-hidden="true" />
        <span>{primaryButtonText}</span>
      </AppButton>
    </div>
  );
}

function StickyBarContent({ children, isCartLayout }: { children: ReactNode; isCartLayout: boolean }) {
  return (
    <div
      className={`shrink-0 flex ${
        isCartLayout
          ? "flex-col gap-5 lg:flex-row lg:items-center lg:gap-8"
          : "flex-col gap-2 md:flex-row md:items-center md:justify-between"
      }`}
    >
      {children}
    </div>
  );
}

function getButtonText({
  detailsOpen,
  layoutPreset,
  primaryActionLabel,
  secondaryActionExpandedLabel,
  secondaryActionLabel,
}: {
  detailsOpen: boolean;
  layoutPreset: StickyMacroTotalsLayout;
  primaryActionLabel: string;
  secondaryActionExpandedLabel?: string;
  secondaryActionLabel: string;
}) {
  const isCartLayout = layoutPreset === "cart";

  return {
    primaryButtonText: isCartLayout ? primaryActionLabel : "Add to Cart",
    secondaryButtonText: isCartLayout
      ? detailsOpen && secondaryActionExpandedLabel
        ? secondaryActionExpandedLabel
        : secondaryActionLabel
      : detailsOpen
        ? "Close Build"
        : "View Build",
  };
}

export default function StickyMacroTotalsBar({
  totals,
  visible = true,
  inline = false,
  layoutPreset = "build",
  contextLine,
  primaryActionLabel = "Generate Snapshot",
  secondaryActionLabel = "Save Meal",
  secondaryActionExpandedLabel,
  PrimaryActionIcon = Camera,
  SecondaryActionIcon = Bookmark,
  SecondaryActionExpandedIcon,
  onPrimaryAction,
  onSecondaryAction,
  detailsOpen = false,
  detailsContent,
}: StickyMacroTotalsBarProps) {
  const isCartLayout = layoutPreset === "cart";
  const { primaryButtonText, secondaryButtonText } = getButtonText({
    detailsOpen,
    layoutPreset,
    primaryActionLabel,
    secondaryActionExpandedLabel,
    secondaryActionLabel,
  });

  const wantsExpandedBuildPanel = !inline && !isCartLayout && detailsOpen && Boolean(detailsContent);

  const [isExpandedPanelMounted, setIsExpandedPanelMounted] = useState(wantsExpandedBuildPanel);
  const [isExpandedPanelEntered, setIsExpandedPanelEntered] = useState(false);
  const [prevWantsExpandedBuildPanel, setPrevWantsExpandedBuildPanel] = useState(wantsExpandedBuildPanel);
  const expandedPanelRef = useRef<HTMLDivElement | null>(null);
  const enterFirstFrameRef = useRef<number | null>(null);
  const enterSecondFrameRef = useRef<number | null>(null);
  const unmountFallbackTimeoutRef = useRef<number | null>(null);
  // Mobile's persistent sheet never unmounts `detailsContent` once it has
  // been shown (see the mobile tree below) — but it also shouldn't mount
  // that potentially-heavy subtree eagerly before the user has ever opened
  // View Build. This is a one-way ratchet, deliberately independent of
  // `isExpandedPanelMounted`'s own ~300ms post-close unmount timer: tying
  // mobile's content to that timer would race its own 300ms max-height
  // transition and risk the exact "content vanishes before the shrink
  // finishes" bug this refactor exists to fix.
  const [hasMobileDetailsEverOpened, setHasMobileDetailsEverOpened] = useState(wantsExpandedBuildPanel);

  // Adjusting state during render (not in an effect) for the mount/exit
  // trigger itself — this is the React-endorsed pattern for state derived
  // from a prop change comparison, and keeps the transition in sync with
  // this render rather than one tick behind. Opening commits "mounted, not
  // entered" in one go, so the very first paint is already the closed
  // (`translate-y-full` on mobile) position rather than skipping straight
  // to open. Closing only ever drops `isExpandedPanelEntered` here — actual
  // unmounting is handled below, once the exit transition really finishes.
  if (wantsExpandedBuildPanel !== prevWantsExpandedBuildPanel) {
    setPrevWantsExpandedBuildPanel(wantsExpandedBuildPanel);
    if (wantsExpandedBuildPanel) {
      setIsExpandedPanelMounted(true);
      setHasMobileDetailsEverOpened(true);
    }
    setIsExpandedPanelEntered(false);
  }

  useEffect(() => {
    if (!wantsExpandedBuildPanel) return;

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [wantsExpandedBuildPanel]);

  // Enter (open): a single rAF isn't reliably enough here — it can still
  // land inside the same frame the browser was about to use for the first
  // "closed" paint, coalescing both style changes into one and making the
  // slide read as an instant pop instead of an animation. Waiting two
  // frames guarantees the browser has actually painted the closed
  // (`translate-y-full`) state at least once before we flip to entered, so
  // there's a real "from" position for the transition to animate out of.
  useEffect(() => {
    if (!wantsExpandedBuildPanel) return;

    const firstFrame = requestAnimationFrame(() => {
      const secondFrame = requestAnimationFrame(() => {
        setIsExpandedPanelEntered(true);
      });
      enterSecondFrameRef.current = secondFrame;
    });
    enterFirstFrameRef.current = firstFrame;

    return () => {
      cancelAnimationFrame(firstFrame);
      if (enterSecondFrameRef.current !== null) {
        cancelAnimationFrame(enterSecondFrameRef.current);
        enterSecondFrameRef.current = null;
      }
    };
  }, [wantsExpandedBuildPanel]);

  // Exit (close): stay mounted and listen for the panel's own `transform`
  // transition to actually finish — rather than guessing with a timeout —
  // before unmounting. Filtered to `event.target === node` (ignore bubbled
  // transitions from children inside the panel, e.g. button hovers) and
  // `propertyName === "transform"` (the transition here also covers
  // `opacity`, which isn't what we're waiting on). A fallback timeout still
  // covers the rare case `transitionend` never fires at all (e.g. a
  // reduced-motion override dropping the duration to 0).
  useEffect(() => {
    if (wantsExpandedBuildPanel) return;
    if (!isExpandedPanelMounted) return;

    const node = expandedPanelRef.current;

    const finishUnmount = () => {
      setIsExpandedPanelMounted(false);
      if (unmountFallbackTimeoutRef.current !== null) {
        window.clearTimeout(unmountFallbackTimeoutRef.current);
        unmountFallbackTimeoutRef.current = null;
      }
    };

    const handleTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== node) return;
      if (event.propertyName !== "transform") return;
      finishUnmount();
    };

    node?.addEventListener("transitionend", handleTransitionEnd);
    unmountFallbackTimeoutRef.current = window.setTimeout(
      finishUnmount,
      EXPANDED_PANEL_UNMOUNT_DELAY_MS,
    );

    return () => {
      node?.removeEventListener("transitionend", handleTransitionEnd);
      if (unmountFallbackTimeoutRef.current !== null) {
        window.clearTimeout(unmountFallbackTimeoutRef.current);
        unmountFallbackTimeoutRef.current = null;
      }
    };
  }, [wantsExpandedBuildPanel, isExpandedPanelMounted]);

  // The macro totals + View Build/Add to Cart (or Close Build/Add to Cart)
  // row — identical data/props regardless of which surface it's rendered
  // inside (the plain collapsed bar, desktop's expanded-modal footer, or
  // mobile's persistent sheet footer below), so it's built once here rather
  // than risking three copies drifting apart. `isCartLayout` is already
  // guaranteed `false` everywhere except the plain collapsed-bar usage, so
  // reusing the real variable (instead of hardcoding `false`) is safe.
  const barContentNode = (
    <StickyBarContent isCartLayout={isCartLayout}>
      <MacroSummarySection contextLine={contextLine} isCartLayout={isCartLayout} totals={totals} />
      <ActionSection
        detailsOpen={detailsOpen}
        isCartLayout={isCartLayout}
        onPrimaryAction={onPrimaryAction}
        onSecondaryAction={onSecondaryAction}
        primaryButtonText={primaryButtonText}
        secondaryButtonText={secondaryButtonText}
        PrimaryActionIcon={PrimaryActionIcon}
        SecondaryActionIcon={SecondaryActionIcon}
        SecondaryActionExpandedIcon={SecondaryActionExpandedIcon}
      />
    </StickyBarContent>
  );

  // Plain collapsed bar — used as-is for `inline`/cart layouts (which never
  // expand at all) and reused below as desktop's own "resting" state.
  const collapsedBarNode = (
    <div className={getWrapperClassName(inline, isCartLayout, visible)}>
      <div className={getPanelClassName({ inline, isCartLayout, visible })}>
        <div className="mx-auto w-full max-w-5xl">{barContentNode}</div>
      </div>
    </div>
  );

  if (inline || isCartLayout) {
    return collapsedBarNode;
  }

  // Below here: the "build" layout only — the only one that ever expands
  // into a View Build panel.
  const isDesktopExpanded = isExpandedPanelMounted && detailsContent;
  const isDesktopEntered = isExpandedPanelEntered && visible;
  // Mobile's sheet never unmounts (see the persistent container below), so
  // its "open" flag is just a direct read of props/state — no separate
  // mount lifecycle needed the way desktop's modal requires one.
  const isMobileSheetOpen = wantsExpandedBuildPanel && visible;

  return (
    <>
      {/* Desktop (lg+): entirely unchanged from before — still a genuine
          mount/unmount swap between the collapsed bar and a centered modal,
          with its own fade+scale transition and transitionend-driven
          unmount. Hidden outright below `lg` so it never doubles up with
          the mobile sheet underneath. */}
      <div className="hidden lg:block">
        {isDesktopExpanded ? (
          <div
            className={`fixed inset-0 z-[120] flex flex-col justify-end lg:items-center lg:justify-center lg:p-4 ${
              isDesktopEntered ? "pointer-events-auto" : "pointer-events-none"
            }`}
            role="dialog"
            aria-modal="true"
            aria-label="Build summary"
          >
            <button
              type="button"
              className={`absolute inset-0 border-0 bg-overlay-scrim transition-opacity duration-200 ease-out ${
                isDesktopEntered ? "opacity-100" : "opacity-0"
              }`}
              onClick={onSecondaryAction}
              aria-label="Close build summary"
            />
            <div
              ref={expandedPanelRef}
              className={`relative z-10 flex h-[94vh] max-h-[94vh] w-[92vw] max-w-[1440px] flex-col overflow-hidden rounded-2xl border border-black/10 bg-white shadow-[0_10px_30px_rgba(0,0,0,0.24)] transition-[opacity,transform] duration-200 ease-out ${
                isDesktopEntered
                  ? "translate-y-0 scale-100 opacity-100"
                  : "translate-y-[10px] scale-[0.98] opacity-0"
              }`}
            >
              <div className="min-h-0 flex-1 overflow-hidden">{detailsContent}</div>
              <div className="shrink-0 border-t border-slate-200/70 bg-white px-3 py-2 sm:px-4">
                {barContentNode}
              </div>
            </div>
          </div>
        ) : (
          collapsedBarNode
        )}
      </div>

      {/* Mobile (<lg): one persistent bottom-sheet surface — the compact
          bar and the expanded View Build content are the SAME element tree
          at all times; only a `max-height` grows/shrinks between them,
          never a mount/unmount swap. Because it's bottom-anchored
          (`inset-x-0 bottom-0`) with no explicit height of its own, growing
          the details region's height pushes the whole surface's top edge
          upward — that height change (not a transform, not opacity) is the
          entire motion, satisfying "no opacity-only fades as the primary
          motion." The backdrop is a fully separate `fixed inset-0` sibling,
          deliberately outside anything that could ever gain a `transform`
          (which would make it a containing block and break its full-screen
          coverage) — it only fades, which is fine since it's a secondary
          accent, not the primary motion. */}
      <button
        type="button"
        className={`lg:hidden fixed inset-0 z-[119] border-0 bg-overlay-scrim transition-opacity duration-300 ease-out ${
          isMobileSheetOpen ? "pointer-events-auto opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={onSecondaryAction}
        aria-label="Close build summary"
        aria-hidden={!isMobileSheetOpen}
        tabIndex={isMobileSheetOpen ? 0 : -1}
      />
      <div
        className={`lg:hidden fixed inset-x-0 bottom-0 z-[120] transition-opacity duration-300 ease-out ${
          visible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        role={isMobileSheetOpen ? "dialog" : undefined}
        aria-modal={isMobileSheetOpen ? true : undefined}
        aria-label={isMobileSheetOpen ? "Build summary" : undefined}
      >
        <div className="relative flex max-h-[94vh] flex-col overflow-hidden rounded-t-3xl border-t border-slate-200/70 bg-white shadow-[0_-8px_24px_rgba(0,0,0,0.14)]">
          <div
            className={`overflow-hidden transition-[max-height] duration-300 ease-out ${
              isMobileSheetOpen ? "max-h-[85vh]" : "max-h-0"
            }`}
            // Content stays mounted (and visible) throughout the close
            // animation on purpose — see the note above — so `inert`
            // (rather than unmounting it) is what keeps it out of the tab
            // order/accessibility tree while it's clipped to zero height.
            inert={!isMobileSheetOpen}
          >
            <div className="h-[85vh] min-h-0">{hasMobileDetailsEverOpened ? detailsContent : null}</div>
          </div>
          <div
            className={`shrink-0 px-4 pt-2 pb-[max(1rem,env(safe-area-inset-bottom))] ${
              isMobileSheetOpen ? "border-t border-slate-200/70" : ""
            }`}
          >
            {barContentNode}
          </div>
        </div>
      </div>
    </>
  );
}
