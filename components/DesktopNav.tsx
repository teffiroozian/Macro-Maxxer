"use client";

import Image from "next/image";
import Link from "next/link";
import { Search, UserRound } from "lucide-react";
import CartIconDropdown from "@/components/CartIconDropdown";
import { useProfile } from "@/components/profile/ProfileContext";

export default function DesktopNav({
  logoSrc = "/logo.png",
  showSearchButton = true,
  showCartButton = true,
}: {
  logoSrc?: string;
  showSearchButton?: boolean;
  showCartButton?: boolean;
}) {
  const { profile, switchProfile } = useProfile();

  return (
    <div className="mx-auto hidden w-full max-w-6xl items-center rounded-2xl border border-slate-200/70 bg-white px-6 py-3 shadow-[0_-3px_12px_rgba(15,23,42,0.08)] lg:flex">
      <div className="flex min-w-0 items-center gap-3">
        <Link href="/" className="inline-flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white" aria-label="Go to homepage">
          <span className="relative h-7 w-7">
            <Image src={logoSrc} alt="Macro Maxxer logo" fill className="object-contain rounded-md" />
          </span>
        </Link>
      </div>

      <div className="ml-auto flex items-center gap-2">
        <div className="group relative hidden sm:block">
          <button
            type="button"
            className="inline-flex h-9 items-center gap-2 rounded-full border border-slate-300/80 bg-white px-3 text-sm font-semibold text-slate-800"
            aria-label="Profile settings"
          >
            <UserRound className="h-4 w-4" strokeWidth={2.5} />
            <span>{profile?.name ?? "Profile"}</span>
          </button>
          <div className="invisible absolute right-0 top-full z-20 mt-2 w-48 rounded-2xl border border-slate-200 bg-white p-2 opacity-0 shadow-lg transition group-focus-within:visible group-focus-within:opacity-100 group-hover:visible group-hover:opacity-100">
            <button
              type="button"
              onClick={switchProfile}
              className="w-full rounded-xl px-3 py-2 text-left text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
            >
              Switch Profile
            </button>
          </div>
        </div>
        {showSearchButton ? (
          <Link href="/#restaurant-search" className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300/80 bg-white text-slate-800" aria-label="Search restaurants">
            <Search className="h-4 w-4" strokeWidth={2.5} />
          </Link>
        ) : null}
        {showCartButton ? (
          <CartIconDropdown buttonClassName="inline-flex h-9 min-w-9 items-center justify-center rounded-full border border-slate-300/80 bg-white px-2.5 text-slate-800" />
        ) : null}
      </div>
    </div>
  );
}
