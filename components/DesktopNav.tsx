"use client";

import Image from "next/image";
import Link from "next/link";
import { Search } from "lucide-react";
import CartIconDropdown from "@/components/CartIconDropdown";

export default function DesktopNav({
  logoSrc = "/favicon.ico",
  showCartButton = true,
}: {
  logoSrc?: string;
  showCartButton?: boolean;
}) {
  return (
    <div className="hidden w-full lg:block">
      <div className="w-full bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/80">
        <div className="mx-auto flex w-full max-w-6xl items-center rounded-2xl border border-slate-200/70 bg-white px-6 py-3 shadow-[0_-3px_12px_rgba(15,23,42,0.08)]">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-300/80 bg-white" aria-label="Go to homepage">
              <span className="relative h-7 w-7">
                <Image src={logoSrc} alt="Macro Maxxer logo" fill className="object-contain rounded-md" />
              </span>
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Link href="/#restaurant-search" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300/80 bg-white text-slate-800" aria-label="Search restaurants">
              <Search className="h-4 w-4" strokeWidth={2.5} />
            </Link>
            {showCartButton ? (
              <CartIconDropdown buttonClassName="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-slate-300/80 bg-white px-2.5 text-slate-800" />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
