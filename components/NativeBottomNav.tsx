"use client";

import { Home, Search, Store } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { useBuildInProgressGuard } from "@/components/BuildInProgressGuardContext";
import { useCart } from "@/stores/cartStore";
import OrderBagIcon from "@/components/icons/OrderBagIcon";
import { useNativeSearchKeyboard } from "@/hooks/useNativeSearchKeyboard";
import { getActiveNativeDestination, getOrderCountLabel } from "@/lib/native/navigation";

function NativeTab({ label, accessibleLabel = label, active, onClick, children }: {
  label: string;
  accessibleLabel?: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={accessibleLabel}
      aria-current={active ? "page" : undefined}
      className={`native-floating-tab flex min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[26px] transition-colors duration-200 ease-out focus-ring ${
        active ? "bg-accent text-white dark:text-slate-950 active:bg-accent-strong" : "text-slate-700 dark:text-slate-300 active:bg-slate-900/[.06] dark:active:bg-surface-hover"
      }`}
    >
      {children}
      <span className="max-w-full truncate text-[10px] font-semibold leading-none">{label}</span>
    </button>
  );
}

export default function NativeBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { items } = useCart();
  const { guardNavigation } = useBuildInProgressGuard();
  const cartCount = useMemo(() => items.reduce((total, item) => total + item.quantity, 0), [items]);
  const destination = getActiveNativeDestination(pathname);
  const keyboardOpen = useNativeSearchKeyboard(destination === "search");

  const navigate = (href: string) => {
    if (pathname === href) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (href === "/search") window.dispatchEvent(new Event("native-nav-reselect"));
      return;
    }
    guardNavigation(() => router.replace(href));
  };

  return (
    <nav
      aria-label="Primary navigation"
      aria-hidden={keyboardOpen ? true : undefined}
      inert={keyboardOpen}
      className={`native-bottom-nav fixed z-[var(--z-nav)] flex h-[62px] gap-2.5 transition-opacity duration-150 ${keyboardOpen ? "pointer-events-none opacity-0" : "opacity-100"}`}
    >
      <div className="glass-surface grid min-w-0 flex-1 grid-cols-3 gap-0.5 rounded-[31px] p-[5px]">
        <NativeTab label="Home" active={destination === "home"} onClick={() => navigate("/")}>
          <Home size={23} fill={destination === "home" ? "currentColor" : "none"} strokeWidth={destination === "home" ? 0 : 2} aria-hidden="true" />
        </NativeTab>
        <NativeTab label="Restaurants" active={destination === "restaurants"} onClick={() => navigate("/restaurants")}>
          <Store size={23} strokeWidth={destination === "restaurants" ? 2.4 : 2} aria-hidden="true" />
        </NativeTab>
        <NativeTab label="My Meal" accessibleLabel={getOrderCountLabel(cartCount)} active={destination === "order"} onClick={() => navigate("/cart")}>
          <OrderBagIcon count={cartCount} active={destination === "order"} />
        </NativeTab>
      </div>
      <button
        type="button"
        aria-label="Search"
        aria-current={destination === "search" ? "page" : undefined}
        onClick={() => navigate("/search")}
        className={`glass-surface native-search-tab flex size-[62px] flex-none cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-out focus-ring ${
          destination === "search" ? "native-search-active text-white dark:text-slate-950" : "text-slate-700 dark:text-slate-300 active:bg-slate-900/[.06] dark:active:bg-surface-hover"
        }`}
      >
        <Search size={24} strokeWidth={2.4} aria-hidden="true" />
      </button>
    </nav>
  );
}
