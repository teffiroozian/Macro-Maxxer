"use client";

import type { CartMacros } from "@/types/cart";
import MacroTotalsGrid from "@/components/MacroTotalsGrid";
import AppButton from "@/components/ui/AppButton";
import type { LucideIcon } from "lucide-react";
import { Bookmark, Camera } from "lucide-react";
import type { ReactNode } from "react";

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

type PositionWrapperProps = {
  children: ReactNode;
  detailsContent?: ReactNode;
  detailsOpen: boolean;
  inline: boolean;
  isCartLayout: boolean;
  visible: boolean;
};

type ExpandedDetailsSectionProps = {
  children?: ReactNode;
  detailsOpen: boolean;
};

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
      : "bottom-1 max-w-6xl px-2"
  } mx-auto z-[120] transition-all duration-300 ease-out ${
    visible
      ? "pointer-events-none translate-y-0 opacity-100"
      : "pointer-events-none translate-y-4 opacity-0"
  }`;
}

function getPanelClassName({
  detailsContent,
  detailsOpen,
  inline,
  isCartLayout,
  visible,
}: Omit<PositionWrapperProps, "children">) {
  if (inline) {
    return `w-full rounded-3xl border border-black/10 bg-white px-4 ${isCartLayout ? "py-4" : "py-3"}`;
  }

  return `mx-auto w-full ${
    isCartLayout
      ? "rounded-[1.5rem] border-black/10 px-3 py-4 sm:rounded-[2.25rem] sm:px-6 sm:py-6"
      : "rounded-2xl border-slate-200/70 px-3 py-2 sm:px-4 sm:py-2.5"
  } border bg-white shadow-[0_10px_30px_rgba(0,0,0,0.24)] transition-all duration-300 ${
    visible ? "pointer-events-auto" : "pointer-events-none"
  } ${detailsOpen && detailsContent ? "flex max-h-[calc(100vh-0.5rem)] flex-col" : ""}`;
}

function PositionWrapper({
  children,
  detailsContent,
  detailsOpen,
  inline,
  isCartLayout,
  visible,
}: PositionWrapperProps) {
  const wrapperClassName = getWrapperClassName(inline, isCartLayout, visible);
  const panelClassName = getPanelClassName({
    detailsContent,
    detailsOpen,
    inline,
    isCartLayout,
    visible,
  });
  const contentContainerClassName = `mx-auto w-full max-w-5xl ${
    detailsContent ? "flex min-h-0 flex-1 flex-col" : ""
  }`;

  return (
    <div className={wrapperClassName}>
      <div className={panelClassName}>
        <div className={contentContainerClassName}>{children}</div>
      </div>
    </div>
  );
}

function ExpandedDetailsSection({ children, detailsOpen }: ExpandedDetailsSectionProps) {
  if (!children) {
    return null;
  }

  return (
    <div
      className={`min-h-0 overflow-hidden transition-[max-height,transform,margin] duration-300 ease-out ${
        detailsOpen ? "mb-4 max-h-[calc(100vh-9rem)] translate-y-0" : "mb-0 max-h-0 translate-y-3"
      }`}
    >
      <div className="h-full overflow-y-auto overscroll-contain pr-1">{children}</div>
    </div>
  );
}

function MacroSummarySection({ contextLine, isCartLayout, totals }: MacroSummarySectionProps) {
  return (
    <section className={`${isCartLayout ? "flex-1" : "w-full md:w-auto md:shrink-0"}`}>
      {contextLine ? (
        <p className="text-sm font-medium tracking-tight text-neutral-500">
          {contextLine}
        </p>
      ) : null}
      {isCartLayout ? (
        <p className={`text-left text-sm font-semibold tracking-tight text-neutral-500 sm:text-center ${contextLine ? "mt-1" : ""}`}>
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
        labelClassName={`${isCartLayout ? "text-[#1A1A1A]" : "text-[#1A1A1A] !text-[9px] sm:!text-[10px]"}`}
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
  const buttonClassName = `${isCartLayout ? "h-[48px]" : "h-9 px-3 text-sm"} ${
    isCartLayout ? "" : "flex-1 md:flex-none"
  }`;
  const SecondaryIcon = detailsOpen && SecondaryActionExpandedIcon
    ? SecondaryActionExpandedIcon
    : SecondaryActionIcon;

  return (
    <div
      className={`flex gap-2 sm:gap-2.5 ${
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
          : "flex-col gap-3 md:flex-row md:items-center md:justify-between"
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

  return (
    <PositionWrapper
      detailsContent={detailsContent}
      detailsOpen={detailsOpen}
      inline={inline}
      isCartLayout={isCartLayout}
      visible={visible}
    >
      <ExpandedDetailsSection detailsOpen={detailsOpen}>{detailsContent}</ExpandedDetailsSection>
      <StickyBarContent isCartLayout={isCartLayout}>
        <MacroSummarySection
          contextLine={contextLine}
          isCartLayout={isCartLayout}
          totals={totals}
        />
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
    </PositionWrapper>
  );
}
