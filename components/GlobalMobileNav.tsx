"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { useState } from "react";
import { House, Menu, ShoppingCart } from "lucide-react";
import MobileNavDrawer from "@/components/MobileNavDrawer";

export default function GlobalMobileNav({
  title = "Macro Maxxer",
  logoSrc = "/favicon.ico",
  browseTopContent,
}: {
  title?: string;
  logoSrc?: string;
  browseTopContent?: ReactNode;
}) {
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [drawerKey, setDrawerKey] = useState(0);
  const isHomePageNav = title === "Macro Maxxer";

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
            {isHomePageNav ? null : (
              <Link href="/" className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-slate-300/80 bg-white text-slate-800" aria-label="Go to homepage">
                <House className="h-4 w-4" strokeWidth={2.5} />
              </Link>
            )}
            {isHomePageNav ? (
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-lg border border-slate-300/80 bg-white">
                  <Image src={logoSrc} alt={`${title} logo`} fill className="object-contain rounded-md" />
                </span>
                <span className="truncate text-base font-semibold text-slate-900">{title}</span>
              </div>
            ) : null}
            <div className="ml-auto">
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
