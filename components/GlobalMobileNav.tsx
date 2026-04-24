"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { Menu, Search, ShoppingCart } from "lucide-react";
import MobileNavDrawer from "@/components/MobileNavDrawer";

export default function GlobalMobileNav({
  title = "Browse",
  logoSrc = "/favicon.ico",
  browseTopContent,
}: {
  title?: string;
  logoSrc?: string;
  browseTopContent?: ReactNode;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerKey, setDrawerKey] = useState(0);

  return (
    <>
      <div className="fixed left-0 right-0 top-0 z-[95] lg:hidden" data-global-nav="true">
        <div className="relative z-[110] mx-auto mt-1 flex w-[calc(100%-0.5rem)] max-w-6xl items-center rounded-2xl border border-slate-200/70 bg-white shadow-[0_-3px_12px_rgba(15,23,42,0.12)] backdrop-blur sm:w-[calc(100%-1rem)]">
          <div className="mx-auto flex w-full max-w-5xl items-center gap-2 px-3 py-2 sm:gap-3 sm:px-6">
            <button
              type="button"
              onClick={() => {
                setDrawerKey((prev) => prev + 1);
                setIsDrawerOpen(true);
              }}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300/80 bg-white text-slate-800"
              aria-label="Open restaurant menu"
            >
              <Menu className="h-4 w-4" strokeWidth={2.5} />
            </button>
            <Link href="/" className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-300/80 bg-white" aria-label="Go to homepage">
              <span className="relative h-7 w-7">
                <Image src={logoSrc} alt="Macro Maxxer logo" fill className="object-contain rounded-md" />
              </span>
            </Link>
            <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
              <Link href="/#restaurant-search" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300/80 bg-white text-slate-800" aria-label="Search restaurants">
                <Search className="h-4 w-4" strokeWidth={2.5} />
              </Link>
              <Link href="/cart" className="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-slate-300/80 bg-white px-2.5 text-slate-800" aria-label="Open cart">
                <ShoppingCart className="h-4 w-4" strokeWidth={2.5} />
              </Link>
            </div>
          </div>
        </div>
      </div>

      <MobileNavDrawer
        key={drawerKey}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        headerTitle={title}
        headerLogoSrc={logoSrc}
        browseTopContent={browseTopContent}
      />
    </>
  );
}
