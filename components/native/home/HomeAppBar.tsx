import Image from "next/image";
import Link from "next/link";
import { Clock, Search } from "lucide-react";
import { useRecentQueries } from "@/lib/search/useRecentQueries";
import { recordQuery } from "@/lib/search/recentQueries";
export default function HomeAppBar() {
    const queries = useRecentQueries();
    return <>
    <header className="flex items-center gap-2.5">
    <Image src="/logo.svg" alt="" width={36} height={36} priority className="rounded-[9px]"/>
    <h1 className="font-heading text-base font-bold tracking-[-0.015em]">Macro Maxxer</h1>
    </header>
    <Link href="/search" aria-label="Search restaurants and menu items" className="mt-[18px] flex h-[54px] items-center gap-2.5 rounded-2xl border border-black/8 bg-surface-card pl-2.5 pr-3.5 shadow-elev-2 active:bg-slate-50 focus-ring">
    <span className="flex size-[34px] shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent-strong">
    <Search size={16} strokeWidth={2.5} aria-hidden="true"/>
    </span>
    <span className="truncate text-base text-slate-400">Search restaurants, menu items...</span>
    </Link>
    {queries.length ? <div className="native-home-chips native-home-reveal mt-[7px] flex gap-2 overflow-x-auto" aria-label="Recent searches">{queries.map(query => <Link key={query.toLowerCase()} href={`/search?q=${encodeURIComponent(query)}`} onClick={() => recordQuery(query)} className="flex min-h-11 shrink-0 items-center focus-ring">
            <span className="flex h-[34px] items-center gap-1.5 rounded-full border border-black/8 bg-surface-card pl-2.5 pr-3 text-sm font-medium text-slate-700 active:bg-slate-50">
            <Clock size={13} strokeWidth={2.5} className="text-slate-400" aria-hidden="true"/>{query}</span>
            </Link>)}</div> : null}
  </>;
}
