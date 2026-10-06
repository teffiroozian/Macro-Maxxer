"use client";

import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import CartIconDropdown from "@/components/cart/CartIconDropdown";
import DesktopRestaurantMenu from "@/components/DesktopRestaurantMenu";
import DesktopSearchDropdown from "@/components/global-search/DesktopSearchDropdown";
import { appIconButtonClassName } from "@/components/ui/AppIconButton";

// Static stand-in for DesktopSearchDropdown's always-visible input (same
// height/shape/icon/placeholder) so the Suspense boundary below doesn't
// shift layout while useSearchParams() bails to client rendering.
function DesktopSearchDropdownFallback({ className = "w-full" }: { className?: string }) {
  return (
    <div aria-hidden="true" className={`relative ${className}`}>
      <div className="relative flex h-10 w-full items-center gap-2 rounded-full border border-black/10 bg-white pl-10 pr-12 text-sm text-slate-500">
        <span className="pointer-events-none absolute inset-y-0 left-2 my-auto flex h-6 w-6 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
          <Search className="h-3.5 w-3.5" strokeWidth={2.5} />
        </span>
        <span className="truncate pl-8">Search restaurants, menu items...</span>
        <span className="pointer-events-none absolute inset-y-0 right-3 my-auto inline-flex h-5 min-w-5 items-center justify-center rounded-md border border-control bg-surface-subtle px-1 text-[11px] font-semibold text-slate-500">
          /
        </span>
      </div>
    </div>
  );
}

export default function DesktopNav() {
  return (
    <div data-global-nav="true" className="hidden w-full border-b border-hairline bg-white lg:block">
      <div className="mx-auto grid h-16 w-full max-w-6xl grid-cols-[1fr_auto_1fr] items-center gap-6 px-6">
        <Link
          href="/"
          className="inline-flex w-fit items-center gap-2.5 rounded-lg focus-ring"
          aria-label="Go to homepage"
        >
          <span className="relative h-8 w-8 shrink-0">
            <Image src="/logo.svg" alt="" fill className="object-contain" />
          </span>
          <span className="font-heading text-sm font-bold text-slate-950">Macro Maxxer</span>
        </Link>

        <div className="flex min-w-0 items-center justify-center">
          <Suspense fallback={<DesktopSearchDropdownFallback className="w-[34rem] max-w-full" />}>
            <DesktopSearchDropdown className="w-[34rem] max-w-full" />
          </Suspense>
        </div>

        <div className="flex items-center justify-end gap-2">
          <DesktopRestaurantMenu />
          <CartIconDropdown buttonClassName={appIconButtonClassName({ variant: "nav", size: "nav", className: "relative" })} />
        </div>
      </div>
    </div>
  );
}
