"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import type { RefObject } from "react";
import { useBuildInProgressGuard } from "@/components/BuildInProgressGuardContext";

const ease = "transition-[background-color,color,box-shadow,border-color,opacity,width] duration-[250ms] ease-in-out motion-reduce:transition-none";

export default function NativeRestaurantTopBar({ barRef, scrolled, name, logo }: {
  barRef: RefObject<HTMLDivElement | null>;
  scrolled: boolean;
  name: string;
  logo: string;
}) {
  const router = useRouter();
  const { guardNavigation } = useBuildInProgressGuard();
  const back = () => guardNavigation(() => {
    if (window.history.length > 1) router.back();
    else router.replace("/restaurants");
  });
  const circle = scrolled
    ? "border border-transparent bg-slate-100 text-slate-900"
    : "border border-white/[0.24] bg-[rgba(15,23,42,0.34)] text-white backdrop-blur-[12px]";
  return (
    <>
      <div aria-hidden="true" className={`pointer-events-none fixed inset-x-0 top-0 z-[95] h-[var(--safe-area-top)] ${ease} ${scrolled ? "bg-white" : "bg-transparent"}`} />
      <div
        ref={barRef}
        className={`pointer-events-none fixed inset-x-0 top-[var(--safe-area-top)] z-[95] flex h-[52px] items-center gap-[10px] px-[14px] ${ease} ${scrolled ? "bg-white shadow-[0_1px_0_#e2e8f0]" : "bg-transparent shadow-[0_1px_0_transparent]"}`}
      >
        <button type="button" onClick={back} aria-label="Back" className={`pointer-events-auto flex size-10 shrink-0 items-center justify-center rounded-full ${ease} ${circle} focus-ring`}>
          <svg width="10" height="17" viewBox="0 0 9 15" fill="none" aria-hidden="true"><path d="M7.5 1.5l-6 6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span className={`relative size-8 shrink-0 overflow-hidden rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.08)] ${ease} ${scrolled ? "opacity-100" : "opacity-0"}`}>
          <Image src={logo} alt="" fill sizes="32px" className="object-cover" />
        </span>
        <button
          type="button"
          onClick={() => guardNavigation(() => router.push("/search"))}
          aria-label={`Search ${name}`}
          className={`pointer-events-auto flex h-10 items-center rounded-[20px] ${ease} focus-ring ${scrolled ? "min-w-0 flex-1 gap-2 border border-transparent bg-slate-100 px-[10px]" : `ml-auto w-10 justify-center ${circle}`}`}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true" className={`shrink-0 ${scrolled ? "text-slate-400" : "text-white"}`}>
            <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.4" /><path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
          </svg>
          {scrolled ? <span className="truncate text-[15px] font-medium text-slate-400">Search {name}</span> : null}
        </button>
      </div>
    </>
  );
}
