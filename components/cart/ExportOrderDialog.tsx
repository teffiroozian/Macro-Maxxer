"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { Download, LoaderCircle, X } from "lucide-react";
import ExportOrderCard from "@/components/export/ExportOrderCard";
import AppButton from "@/components/ui/AppButton";
import AppIconButton from "@/components/ui/AppIconButton";
import { useDialogA11y } from "@/hooks/useDialogA11y";
import { IS_CAPACITOR_BUILD } from "@/lib/buildTarget";
import { buildCartItemExportSummary, formatCartItemName } from "@/lib/cart/displayLabels";
import { getAllRestaurants } from "@/lib/restaurants";
import type { NutritionTotals } from "@/lib/cart/nutrition";
import type { CartItem } from "@/types/cart";
import { downloadElementAsPng, generateElementPng, getExportPngFilename } from "@/lib/export/downloadElementAsPng";
import { canSharePng, isMobileExportBrowser, pngDataUrlToFile, sharePng } from "@/lib/export/sharePng";
import { EXPORT_HEIGHT, EXPORT_WIDTH } from "@/lib/export/dimensions";

const PREVIEW_MAX_WIDTH = 540;

type ExportOrderDialogProps = {
  items: CartItem[];
  nutritionTotals: NutritionTotals;
  onClose: () => void;
};

export default function ExportOrderDialog({ items, nutritionTotals, onClose }: ExportOrderDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const exportCardRef = useRef<HTMLElement>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const headerRef = useRef<HTMLElement>(null);
  const previewPaneRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const [previewScale, setPreviewScale] = useState(1);
  const [preparedImage, setPreparedImage] = useState<{
    dataUrl: string;
    file: File;
    shareable: boolean;
    items: CartItem[];
    nutritionTotals: NutritionTotals;
  } | null>(null);
  // Never share a stale image if the order changes while the dialog is open.
  const image = preparedImage?.items === items && preparedImage.nutritionTotals === nutritionTotals
    ? preparedImage
    : null;

  const cardData = useMemo(() => {
    const restaurantsById = new Map(getAllRestaurants().map((restaurant) => [restaurant.id, restaurant]));
    const restaurantIds = Array.from(new Set(items.map((item) => item.restaurantId)));
    const primaryRestaurant = restaurantsById.get(restaurantIds[0]);
    const additionalRestaurantCount = Math.max(restaurantIds.length - 1, 0);
    const restaurantName = primaryRestaurant
      ? `${primaryRestaurant.name}${additionalRestaurantCount > 0 ? ` + ${additionalRestaurantCount} more` : ""}`
      : "Restaurant meal";

    const orderName = items.length === 1
      ? formatCartItemName(items[0])
      : restaurantIds.length === 1 && primaryRestaurant
        ? `${primaryRestaurant.name} Meal`
        : "Multi-Restaurant Meal";

    return {
      restaurant: {
        id: primaryRestaurant?.id ?? restaurantIds[0] ?? "unknown",
        name: restaurantName,
        logo: primaryRestaurant?.logo ?? "/logo.svg",
      },
      orderName,
      items: items.flatMap(buildCartItemExportSummary),
      exportedAt: new Intl.DateTimeFormat("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      }).format(new Date()),
    };
  }, [items]);

  useLayoutEffect(() => {
    const sheet = sheetRef.current;
    const header = headerRef.current;
    const pane = previewPaneRef.current;
    const controls = controlsRef.current;
    if (!sheet || !header || !pane || !controls) return;

    // Desktop: fit the whole 4:5 card inside the fixed-height preview pane.
    // Mobile: fit whatever height the sheet has left after its header and
    // controls, so the whole sheet fits on screen without scrolling.
    const sideBySideQuery = window.matchMedia("(min-width: 768px)");
    const updatePreviewSize = () => {
      const paneStyle = getComputedStyle(pane);
      const availableWidth = Math.min(
        pane.clientWidth - parseFloat(paneStyle.paddingLeft) - parseFloat(paneStyle.paddingRight),
        PREVIEW_MAX_WIDTH,
      );
      const paneHeight = !IS_CAPACITOR_BUILD && sideBySideQuery.matches
        ? pane.clientHeight
        : parseFloat(getComputedStyle(sheet).maxHeight) - header.offsetHeight - controls.offsetHeight;
      const availableHeight = paneHeight - parseFloat(paneStyle.paddingTop) - parseFloat(paneStyle.paddingBottom);
      setPreviewScale(Math.max(Math.min(availableWidth / EXPORT_WIDTH, availableHeight / EXPORT_HEIGHT, 1), 0.1));
    };

    updatePreviewSize();
    const resizeObserver = new ResizeObserver(updatePreviewSize);
    resizeObserver.observe(pane);
    resizeObserver.observe(header);
    resizeObserver.observe(controls);
    window.addEventListener("resize", updatePreviewSize);
    sideBySideQuery.addEventListener("change", updatePreviewSize);
    return () => {
      resizeObserver.disconnect();
      sideBySideQuery.removeEventListener("change", updatePreviewSize);
      window.removeEventListener("resize", updatePreviewSize);
    };
  }, [cardData]);

  const saveImage = async () => {
    if (!exportCardRef.current || isExporting) return;

    setExportError(null);
    setIsExporting(true);
    try {
      if (image) {
        // No asynchronous work before sharePng invokes navigator.share.
        const result = await sharePng(image.file);
        if (result === "unsupported") {
          setPreparedImage({ ...image, shareable: false });
        }
      } else if (isMobileExportBrowser()) {
        const dataUrl = await generateElementPng(exportCardRef.current);
        const file = pngDataUrlToFile(dataUrl, getExportPngFilename(cardData.orderName));
        setPreparedImage({ dataUrl, file, shareable: canSharePng(file), items, nutritionTotals });
      } else {
        await downloadElementAsPng(exportCardRef.current, getExportPngFilename(cardData.orderName));
      }
    } catch (error) {
      console.error("Unable to export order card", error);
      setExportError(image
        ? "We couldn’t share this image. Try again, or use the image below to save it."
        : "We couldn’t create this image. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  useDialogA11y({ isOpen: true, onClose, initialFocusRef: closeButtonRef, lockBodyScroll: true });

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-order-dialog-title"
      className={`fixed inset-0 z-[var(--z-tooltip)] flex items-end justify-center bg-overlay-scrim ${IS_CAPACITOR_BUILD ? "" : "md:items-center md:p-6"}`}
      onClick={onClose}
    >
      <div
        ref={sheetRef}
        className={`flex w-full flex-col overflow-y-auto overscroll-contain rounded-t-sheet bg-white dark:bg-surface-card shadow-[0_24px_80px_rgba(0,0,0,0.35)] ${IS_CAPACITOR_BUILD ? "max-h-[calc(94dvh-var(--safe-area-top))]" : "max-h-[94dvh] md:grid md:h-[min(780px,calc(100dvh-3rem))] md:max-h-none md:w-[min(1120px,calc(100vw-3rem))] md:grid-cols-[minmax(0,1fr)_360px] md:grid-rows-[auto_minmax(0,1fr)] md:overflow-hidden md:rounded-[32px]"}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header ref={headerRef} className={`shrink-0 px-5 pb-3 pt-2 ${IS_CAPACITOR_BUILD ? "" : "md:col-start-2 md:row-start-1 md:px-8 md:pb-0 md:pt-8"}`}>
          <div className={`mx-auto mb-2 h-1 w-10 rounded-full bg-black/15 dark:bg-divider ${IS_CAPACITOR_BUILD ? "" : "md:hidden"}`} aria-hidden="true" />
          <div className="flex items-center justify-between gap-4">
            <h2 id="export-order-dialog-title" className={`whitespace-nowrap font-heading text-[22px] font-bold tracking-[-0.02em] text-slate-950 dark:text-slate-50 ${IS_CAPACITOR_BUILD ? "" : "md:text-[23px]"}`}>
              Share Meal
            </h2>
            <AppIconButton
              ref={closeButtonRef}
              aria-label="Close share meal"
              variant="ghost"
              size="md"
              className="size-10! rounded-full! bg-[#f1f0ec]! dark:bg-surface-hover! hover:bg-[#e8e6e0]! dark:hover:bg-surface-card!"
              onClick={onClose}
            >
              <X className="size-5" aria-hidden="true" />
            </AppIconButton>
          </div>
        </header>

        <div
          ref={previewPaneRef}
          className={`flex shrink-0 items-center justify-center bg-[#f1f0ec] dark:bg-surface-subtle px-6 py-4 ${IS_CAPACITOR_BUILD ? "" : "md:col-start-1 md:row-span-2 md:row-start-1 md:min-h-0 md:p-10"}`}
        >
          <div
            className={`relative overflow-hidden rounded-[12px] shadow-[0_18px_44px_rgba(0,0,0,0.18)] ${IS_CAPACITOR_BUILD ? "" : "md:rounded-[18px]"}`}
            style={{
              width: `${EXPORT_WIDTH * previewScale}px`,
              height: `${EXPORT_HEIGHT * previewScale}px`,
            }}
          >
            <ExportOrderCard
              restaurant={cardData.restaurant}
              orderName={cardData.orderName}
              nutrition={nutritionTotals}
              items={cardData.items}
              exportedAt={cardData.exportedAt}
              className="absolute left-0 top-0 origin-top-left"
              style={{ transform: `scale(${previewScale})` }}
            />
          </div>
        </div>

        <div className="pointer-events-none fixed left-[-20000px] top-0" aria-hidden="true">
          <ExportOrderCard
            ref={exportCardRef}
            restaurant={cardData.restaurant}
            orderName={cardData.orderName}
            nutrition={nutritionTotals}
            items={cardData.items}
            exportedAt={cardData.exportedAt}
          />
        </div>

        <div ref={controlsRef} className={`flex shrink-0 flex-col px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4 ${IS_CAPACITOR_BUILD ? "" : "md:col-start-2 md:row-start-2 md:min-h-0 md:px-8 md:pb-8 md:pt-8"}`}>
          <div className={IS_CAPACITOR_BUILD ? "hidden" : "hidden md:block"}>
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-slate-400">Format</p>
            <div className="mt-2.5 flex items-center gap-3 rounded-xl border border-black/10 dark:border-hairline bg-[#f6f5f1] dark:bg-surface-hover px-3.5 py-2.5">
              <span className="h-[18px] w-[14px] shrink-0 rounded-[3px] border-2 border-slate-950" aria-hidden="true" />
              <span className="text-[15px] font-semibold text-slate-950 dark:text-slate-50">Portrait · 4:5</span>
            </div>
          </div>

          <div className={IS_CAPACITOR_BUILD ? "" : "md:mt-auto"}>
            {exportError ? <p role="alert" className="mb-3 text-center text-sm font-medium text-red-600">{exportError}</p> : null}
            {image && !image.shareable ? null : <AppButton disabled={isExporting} variant="primary" size="lg" className="w-full rounded-2xl! text-[16px]!" onClick={saveImage}>
              {isExporting ? <LoaderCircle className="size-[18px] animate-spin" aria-hidden="true" /> : <Download className="size-[18px]" aria-hidden="true" />}
              {isExporting ? "Saving…" : image ? "Share image" : "Save image"}
            </AppButton>}
            {image ? (
              <details className="mt-3 text-center text-sm text-slate-600 dark:text-slate-300" open={!image.shareable || !!exportError}>
                <summary className="cursor-pointer font-medium">View image to save</summary>
                <p className="my-2">Touch and hold the image, then choose Save to Photos or Save Image. You can also share it from that menu.</p>
                {/* A real PNG image supports Safari's native long-press save menu. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.dataUrl} alt="Your exported meal" width={EXPORT_WIDTH} height={EXPORT_HEIGHT} className="mx-auto h-auto w-full rounded-lg" />
              </details>
            ) : null}
            {image?.shareable ? <p role="status" className="mt-2 text-center text-sm text-slate-600 dark:text-slate-300">Image ready. Tap Share image to save or send it.</p> : null}
            <p className={`mt-2 text-center text-[13px] text-slate-500 dark:text-slate-400 ${IS_CAPACITOR_BUILD ? "" : "md:mt-3 md:text-sm"}`}>
              {EXPORT_WIDTH} × {EXPORT_HEIGHT} PNG
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
