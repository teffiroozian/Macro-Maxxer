"use client";

import { Search } from "lucide-react";
import NativeSearchResults from "@/components/native/NativeSearchResults";
import { useGlobalSearchState } from "@/lib/search/useGlobalSearchState";

export default function NativeSearchPage() {
  const state = useGlobalSearchState();

  return (
    <main className="min-h-[var(--app-viewport-height)] bg-slate-50 pb-8 pl-[max(1rem,var(--safe-area-left))] pr-[max(1rem,var(--safe-area-right))] pt-[calc(var(--safe-area-top)+1.25rem)]">
      <div className="mx-auto w-full max-w-2xl">
        <header className="px-1">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-slate-950">Search</h1>
          <p className="mt-1.5 text-sm leading-6 text-slate-600">Find restaurants and menu items fast.</p>
        </header>
        <div className="relative mt-5">
          <input
            type="search"
            autoFocus
            aria-label="Search"
            value={state.query}
            onChange={(event) => state.handleInputChange(event.target.value)}
            onKeyDown={state.handleInputKeyDown}
            placeholder="Search restaurants, menu items..."
            className="w-full rounded-2xl border border-black/10 bg-white py-4 pl-13 pr-4 text-base text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-4 focus:ring-accent/15"
          />
          <span className="pointer-events-none absolute inset-y-0 left-3 my-auto flex h-7 w-7 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
            <Search className="h-3.5 w-3.5" strokeWidth={2.5} />
          </span>
        </div>
        <NativeSearchResults {...state} />
      </div>
    </main>
  );
}
