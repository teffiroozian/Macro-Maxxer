"use client";

import { Bookmark, Home, Search, Store } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { useBuildInProgressGuard } from "@/components/BuildInProgressGuardContext";
import { useCart } from "@/stores/cartStore";
import OrderBagIcon from "@/components/icons/OrderBagIcon";
import { useNativeSearchKeyboard } from "@/hooks/useNativeSearchKeyboard";
import { getActiveNativeDestination, getOrderCountLabel } from "@/lib/native/navigation";

function NativeTab({ label, active, onClick, children }: {
  label: string;
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={active ? "page" : undefined}
      className={`native-floating-tab flex min-w-0 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-[26px] px-0.5 transition-colors duration-200 ease-out focus-ring ${
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
  const keyboardOpen = useNativeSearchKeyboard(destination === "search" || pathname === "/restaurants" || pathname === "/saved" || pathname.startsWith("/restaurant/"));

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
      <div className="glass-surface grid min-w-0 flex-1 grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(max-content,1fr)_minmax(0,1fr)] gap-0.5 rounded-[31px] p-[5px]">
        <NativeTab label="Home" active={destination === "home"} onClick={() => navigate("/")}>
          <Home size={23} strokeWidth={2} aria-hidden="true" />
        </NativeTab>
        <NativeTab label="Search" active={destination === "search"} onClick={() => navigate("/search")}>
          <Search size={23} strokeWidth={2} aria-hidden="true" />
        </NativeTab>
        <NativeTab label="Restaurants" active={destination === "restaurants"} onClick={() => navigate("/restaurants")}>
          <Store size={23} strokeWidth={2} aria-hidden="true" />
        </NativeTab>
        <NativeTab label="Saved" active={destination === "saved"} onClick={() => navigate("/saved")}>
          <Bookmark size={23} strokeWidth={2} aria-hidden="true" />
        </NativeTab>
      </div>
      <button
        type="button"
        aria-label={getOrderCountLabel(cartCount)}
        aria-current={destination === "order" ? "page" : undefined}
        onClick={() => navigate("/cart")}
        className={`glass-surface native-order-tab flex size-[62px] flex-none cursor-pointer items-center justify-center rounded-full transition-colors duration-200 ease-out focus-ring ${
          destination === "order" ? "native-order-active text-white dark:text-slate-950" : "text-slate-700 dark:text-slate-300 active:bg-slate-900/[.06] dark:active:bg-surface-hover"
        }`}
      >
        <OrderBagIcon count={cartCount} />
      </button>
    </nav>
  );
}
