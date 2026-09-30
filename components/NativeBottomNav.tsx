"use client";

import { Home, Search, ShoppingCart, Store, type LucideIcon } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { useBuildInProgressGuard } from "@/components/BuildInProgressGuardContext";
import { useGlobalSearch } from "@/components/GlobalSearchContext";
import { useCart } from "@/stores/cartStore";
import CartItemCountBadge from "@/components/cart/CartItemCountBadge";

type NativeTabProps = {
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
  badge?: number;
};

function NativeTab({ label, icon: Icon, active, onClick, badge }: NativeTabProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
      className={`relative flex h-14 min-w-0 flex-1 cursor-pointer flex-col items-center justify-center gap-0.5 rounded-xl transition-colors focus-ring ${
        active ? "bg-accent-soft text-accent-strong" : "text-slate-500 active:bg-slate-100 active:text-slate-900"
      }`}
    >
      <span className="relative">
        <Icon className="h-5 w-5" strokeWidth={active ? 2.6 : 2.2} aria-hidden="true" />
        {badge ? <CartItemCountBadge count={badge} /> : null}
      </span>
      <span className="truncate text-[10px] font-semibold leading-none">{label}</span>
    </button>
  );
}

export default function NativeBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { items } = useCart();
  const { isOpen: isSearchOpen, open: openSearch, close: closeSearch } = useGlobalSearch();
  const { guardNavigation } = useBuildInProgressGuard();
  const cartCount = useMemo(() => items.reduce((total, item) => total + item.quantity, 0), [items]);

  const navigate = (href: string) => {
    closeSearch();
    if (pathname === href) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    guardNavigation(() => router.replace(href));
  };

  const isRestaurantsActive = pathname === "/restaurants" || pathname.startsWith("/restaurant/");

  return (
    <nav
      aria-label="Primary navigation"
      className="native-bottom-nav fixed inset-x-0 bottom-0 z-[var(--z-nav)] border-t border-black/10 bg-white/95 px-[max(0.5rem,var(--safe-area-left))] pb-[var(--safe-area-bottom)] shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-lg"
    >
      <div className="mx-auto flex h-14 max-w-md items-center gap-1">
        <NativeTab label="Home" icon={Home} active={!isSearchOpen && pathname === "/"} onClick={() => navigate("/")} />
        <NativeTab label="Search" icon={Search} active={isSearchOpen} onClick={() => openSearch()} />
        <NativeTab label="Restaurants" icon={Store} active={!isSearchOpen && isRestaurantsActive} onClick={() => navigate("/restaurants")} />
        <NativeTab label="Cart" icon={ShoppingCart} active={!isSearchOpen && pathname === "/cart"} onClick={() => navigate("/cart")} badge={cartCount} />
      </div>
    </nav>
  );
}
