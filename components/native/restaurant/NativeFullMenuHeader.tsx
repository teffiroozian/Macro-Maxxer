"use client";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useBuildInProgressGuard } from "@/components/BuildInProgressGuardContext";

export default function NativeFullMenuHeader({ restaurantId, name, logo }: { restaurantId: string; name: string; logo: string }) {
  const router = useRouter();
  const { guardNavigation } = useBuildInProgressGuard();
  const back = () => guardNavigation(() => {
    if (window.history.length > 1) router.back();
    else router.replace(`/restaurant/${restaurantId}`);
  });
  return (
    <>
      <div aria-hidden="true" className="fixed inset-x-0 top-0 z-[95] h-[var(--safe-area-top)] bg-white" />
      <header className="fixed inset-x-0 top-[var(--safe-area-top)] z-[95] flex h-[52px] items-center gap-[10px] bg-white px-[14px]">
        <button type="button" onClick={back} aria-label="Back" className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-900 focus-ring">
          <svg width="10" height="17" viewBox="0 0 9 15" fill="none" aria-hidden="true"><path d="M7.5 1.5l-6 6 6 6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </button>
        <span className="relative size-8 shrink-0 overflow-hidden rounded-full shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"><Image src={logo} alt="" fill sizes="32px" className="object-cover" /></span>
        <div className="flex min-w-0 flex-1 flex-col gap-px">
          <h1 className="truncate text-base font-bold leading-[1.2] text-slate-900">{name}</h1>
          <p className="text-[12.5px] leading-[1.2] text-slate-500">Full menu</p>
        </div>
        <button type="button" onClick={() => guardNavigation(() => router.push("/search"))} aria-label={`Search ${name}`} className="flex size-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-900 focus-ring">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.4" /><path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" /></svg>
        </button>
      </header>
    </>
  );
}
