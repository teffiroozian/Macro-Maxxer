"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useCart } from "@/stores/cartStore";
import { getSelectionDetailsLabel } from "@/lib/cart/customizationLabels";
import { useOptionalRestaurantUi } from "@/components/RestaurantUiContext";
import MacroTotalsGrid from "@/components/MacroTotalsGrid";
import CartItemPreviewRow from "@/components/cart/CartItemPreviewRow";
import EmptyStateCard from "@/components/EmptyStateCard";
import { ShoppingCart, X } from "lucide-react";
import AppButton, { appButtonClassName } from "@/components/ui/AppButton";
import AppIconButton from "@/components/ui/AppIconButton";
import ItemRouteModal from "@/components/item-route-modal/ItemRouteModal";
import { useCartItemEditModal } from "@/hooks/useCartItemEditModal";
import { useLastAddedPreviewOpen } from "@/hooks/useLastAddedPreviewOpen";
import { getRemainingLastAddedPreviewMs, LAST_ADDED_PREVIEW_DURATION_MS } from "@/lib/cart/lastAddedPreview";

type CartIconDropdownProps = {
  buttonClassName: string;
  // "popover" (default) anchors a small panel under the cart icon — the
  // desktop nav's presentation. "sheet" slides a compact bottom sheet up
  // from the viewport edge instead, for the mobile nav's cart slot. Both
  // read/write the same cart store (useCart); this only changes how that
  // shared "just added" state is presented.
  variant?: "popover" | "sheet";
};

const SCROLL_CLOSE_THRESHOLD = 90;

export default function CartIconDropdown({
  buttonClassName,
  variant = "popover",
}: CartIconDropdownProps) {
  const router = useRouter();
  const pathname = usePathname();
  const isCurrentPage = pathname === "/cart";
  const restaurantUi = useOptionalRestaurantUi();
  const {
    items,
    totals,
    lastAddedItem,
    lastAddedAt,
    dismissLastAddedPreview,
  } = useCart();
  const containerRef = useRef<HTMLDivElement>(null);
  const openScrollYRef = useRef<number | null>(null);
  const isOpen = useLastAddedPreviewOpen();
  const { editState, openModal, closeEditModal } = useCartItemEditModal();

  const cartCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );

  useEffect(() => {
    if (!isOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      // The cart preview shares one global store, but this component itself
      // is mounted more than once on most pages (e.g. the homepage's sticky
      // + static nav, or a page's desktop + mobile nav) — CSS hides the
      // inactive copy, but it's still mounted and listening. Checking only
      // this instance's own containerRef would treat a click inside the
      // *other* mounted copy as "outside" and dismiss the shared preview
      // (and its pointer-events) out from under the click that's still in
      // flight, swallowing it before the click event ever fires. Scoping
      // the check to any cart-dropdown root via the shared marker fixes
      // that without needing to know how many copies exist.
      const inside = (event.target as HTMLElement)?.closest?.("[data-cart-icon-dropdown]");
      if (!inside) {
        dismissLastAddedPreview();
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [dismissLastAddedPreview, isOpen]);

  useEffect(() => {
    if (!isOpen || lastAddedAt === null) return;

    const timeout = window.setTimeout(
      dismissLastAddedPreview,
      getRemainingLastAddedPreviewMs(lastAddedAt, Date.now(), LAST_ADDED_PREVIEW_DURATION_MS),
    );

    return () => window.clearTimeout(timeout);
  }, [dismissLastAddedPreview, isOpen, lastAddedAt]);

  useEffect(() => {
    if (!isOpen) {
      openScrollYRef.current = null;
      return;
    }

    openScrollYRef.current = window.scrollY;

    const handleScroll = () => {
      if (openScrollYRef.current === null) {
        openScrollYRef.current = window.scrollY;
        return;
      }

      if (Math.abs(window.scrollY - openScrollYRef.current) > SCROLL_CLOSE_THRESHOLD) {
        dismissLastAddedPreview();
      }
    };

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      window.removeEventListener("scroll", handleScroll);
    };
  }, [dismissLastAddedPreview, isOpen]);

  // GlobalMobileNav (which renders the "sheet" variant) and DesktopNav
  // (which renders the default "popover" variant) are both mounted at every
  // viewport width — each is only CSS-hidden (`lg:hidden` / `hidden lg:*`)
  // outside its own breakpoint, not unmounted. Both instances share the same
  // `isOpen` state via useLastAddedPreviewOpen, so a `variant === "sheet"`
  // check alone isn't enough: on a desktop-width viewport the CSS-hidden
  // mobile sheet instance would still be "open" and would lock body scroll
  // out from under the visible desktop popover. Track the matching
  // `lg:hidden` breakpoint here too, so this only locks when the sheet is
  // actually the thing on screen.
  const [isBelowLgViewport, setIsBelowLgViewport] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 1023px)");
    const updateIsBelowLgViewport = () => setIsBelowLgViewport(mediaQuery.matches);
    updateIsBelowLgViewport();
    mediaQuery.addEventListener("change", updateIsBelowLgViewport);
    return () => mediaQuery.removeEventListener("change", updateIsBelowLgViewport);
  }, []);

  // The sheet covers the viewport behind it, so lock background scroll while
  // it's open — same pattern as CartPreviewDrawer. The popover is small and
  // non-blocking, so it doesn't need this.
  useEffect(() => {
    if (variant !== "sheet" || !isOpen || !isBelowLgViewport) return;

    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen, variant, isBelowLgViewport]);

  // Escape dismisses either presentation — matches every other dialog/sheet
  // in the app (MobileNavDrawer, ItemRouteModal, CartPreviewDrawer).
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        dismissLastAddedPreview();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [dismissLastAddedPreview, isOpen]);

  const countLabel = (
    <>
      <ShoppingCart className="h-4 w-4" strokeWidth={2.5} />
      {cartCount > 0 ? (
        <span className="absolute -right-1 -top-1 inline-flex min-h-4 min-w-4 items-center justify-center rounded-full bg-slate-900 px-1 text-[10px] leading-none font-bold tabular-nums text-white">
          {cartCount}
        </span>
      ) : null}
    </>
  );

  const addonsLabel = lastAddedItem ? (getSelectionDetailsLabel(lastAddedItem.selection) ?? "") : "";
  const handleOpenCart = () => {
    // Already on the full cart page — nothing to navigate to or preview.
    if (isCurrentPage) {
      return;
    }
    if (restaurantUi) {
      restaurantUi.openCart();
    } else {
      router.push("/cart");
    }
  };

  const handleViewCart = () => {
    handleOpenCart();
    dismissLastAddedPreview();
  };

  // Same preview/edit split the cart drawer's item cards use (openModal from
  // useCartItemEditModal) — this opens the exact just-added CartItem
  // instance, never a freshly-built one, so its quantity/variant/side/drink/
  // ingredient selections are all preserved as-is. Dismissing the popover
  // here mirrors View Cart/View All Items: once the full modal is up, the
  // small popover behind it has nothing left to do.
  const activateLastAddedPreview = () => {
    if (!lastAddedItem) return;
    openModal(lastAddedItem, "preview");
    dismissLastAddedPreview();
  };

  // Shared between both presentations: item preview + total macros. Only the
  // surrounding chrome (header, close button, button row layout) differs.
  const itemAndTotalsContent = (
    <>
      <div className="flex items-center gap-3">
        {lastAddedItem ? (
          // Same hierarchy as the cart drawer's own item cards: image + name,
          // then macros. The outer div's onClick covers the whole card
          // (image included) for Preview; onActivate keeps the text block
          // keyboard-reachable. No edit action here — customizing happens
          // from the item preview this opens.
          <div className="w-full min-w-0 cursor-pointer" onClick={activateLastAddedPreview}>
            <CartItemPreviewRow
              item={lastAddedItem}
              imageRenderer="native-img"
              imageFallback="initial"
              macroStyle="compact"
              customizationsText={addonsLabel}
              customizationsLineClamp={1}
              onActivate={activateLastAddedPreview}
              activateLabel={`Preview ${lastAddedItem.name}`}
            />
          </div>
        ) : (
          <EmptyStateCard variant="compact" align="left" title="Your cart is empty." className="py-0" />
        )}
      </div>

      <div className="my-2.5 h-px bg-slate-200" />

      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">Total Macros</p>
        <MacroTotalsGrid macros={totals} size="compact" className="mt-2.5" />
      </div>
    </>
  );

  const actionButtons = (
    <>
      <AppButton variant="ghost" size="md" onClick={handleViewCart} className="flex-1 font-medium">
        View Cart
      </AppButton>
      <Link
        href="/cart"
        onClick={() => {
          dismissLastAddedPreview();
        }}
        className={appButtonClassName({ variant: "primary", size: "md", className: "flex-1 border-slate-900 bg-slate-900 font-medium hover:bg-slate-800" })}
      >
        View All Items
      </Link>
    </>
  );

  return (
    <div ref={containerRef} data-cart-icon-dropdown className="relative">
      <button
        type="button"
        onClick={() => {
          handleOpenCart();
          dismissLastAddedPreview();
        }}
        className={`${buttonClassName} cursor-pointer`}
        aria-label={cartCount > 0 ? `Cart (${cartCount})` : "Cart"}
        aria-current={isCurrentPage ? "page" : undefined}
        aria-expanded={isOpen}
      >
        {countLabel}
      </button>

      {variant === "sheet" ? (
        <div
          aria-hidden={!isOpen}
          inert={!isOpen}
          className={`fixed inset-0 z-[231] ${isOpen ? "" : "pointer-events-none"}`}
        >
          <button
            type="button"
            aria-label="Dismiss just added preview"
            onClick={dismissLastAddedPreview}
            className={`absolute inset-0 bg-slate-900/35 transition-opacity duration-200 ${
              isOpen ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* h-auto: sized to its own content by default, no forced min/max
              band — a short item row shouldn't leave blank space, and a
              normal one shouldn't be squeezed into a scrollbar. max-h-[85vh]
              + overflow-y-auto only ever engage as a fallback, on a screen
              short enough (or content tall enough) that the sheet would
              otherwise run past the viewport — `auto` only draws a
              scrollbar once content actually exceeds that cap. */}
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Item added to cart"
            className={`absolute inset-x-0 bottom-0 flex h-auto max-h-[85vh] flex-col overflow-y-auto rounded-t-3xl bg-white text-slate-900 shadow-[0_-18px_40px_rgba(15,23,42,0.18)] transition-transform duration-300 ${
              isOpen ? "translate-y-0" : "translate-y-full"
            }`}
          >
            <div className="flex justify-center pb-1 pt-2.5" aria-hidden="true">
              <span className="h-1 w-9 rounded-full bg-slate-300" />
            </div>

            <div className="flex items-center justify-between gap-2 px-4 pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
                Just Added
              </p>
              <AppIconButton onClick={dismissLastAddedPreview} variant="ghost" size="sm" aria-label="Dismiss just added preview">
                <X className="h-4 w-4" strokeWidth={2.5} />
              </AppIconButton>
            </div>

            <div className="px-4 pb-1 pt-2.5">
              {itemAndTotalsContent}
            </div>

            {/* Equal-width two-column grid — same pattern as CartPreviewDrawer's
                own Clear Cart/Open Full Cart row — rather than a flex row that
                depends on a one-off arbitrary viewport breakpoint to avoid
                stacking; a grid keeps both buttons side-by-side and equal
                width at any realistic phone size without one. */}
            <div className="grid grid-cols-2 gap-2 border-t border-slate-200 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
              {actionButtons}
            </div>
          </div>
        </div>
      ) : (
        <div
          aria-hidden={!isOpen}
          inert={!isOpen}
          className={`absolute right-0 top-[calc(100%+0.55rem)] z-[231] w-[22rem] rounded-2xl border border-slate-200 bg-white p-3.5 text-slate-900 shadow-[0_18px_40px_rgba(15,23,42,0.18)] transition-all duration-200 ${
            isOpen
              ? "translate-y-0 opacity-100"
              : "pointer-events-none -translate-y-1 opacity-0"
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              Just added
            </p>
            <AppIconButton onClick={dismissLastAddedPreview} variant="ghost" size="sm" aria-label="Dismiss just added preview">
              <X className="h-4 w-4" strokeWidth={2.5} />
            </AppIconButton>
          </div>

          <div className="mt-2">{itemAndTotalsContent}</div>

          <div className="mt-2.5 flex items-center gap-2 border-t border-slate-200 pt-2.5">
            {actionButtons}
          </div>
        </div>
      )}

      {editState ? (
        <ItemRouteModal
          restaurantId={editState.restaurant.id}
          restaurantPath={`/restaurant/${editState.restaurant.id}`}
          item={editState.sourceItem}
          menuItems={editState.restaurant.items}
          addons={editState.addons}
          ingredients={editState.restaurant.ingredients}
          customizationRules={editState.restaurant.customizationRules}
          closeBehavior="local"
          editCartItemId={editState.cartItemId}
          initialMode={editState.mode}
          onClose={closeEditModal}
        />
      ) : null}
    </div>
  );
}
