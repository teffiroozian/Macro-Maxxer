const pulse = "animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none";

function MenuCardSkeleton() {
  return (
    <div className="flex min-h-[148px] gap-4 rounded-2xl border border-black/5 bg-white p-4 shadow-elev-1 sm:p-5">
      <div className="h-24 w-28 shrink-0 animate-pulse rounded-xl bg-slate-200 motion-reduce:animate-none sm:h-28 sm:w-36" />
      <div className="flex min-w-0 flex-1 flex-col py-1">
        <div className={`${pulse} h-5 w-3/5`} />
        <div className="mt-4 flex gap-4">
          <div className={`${pulse} h-9 w-14`} />
          <div className={`${pulse} h-9 w-14`} />
          <div className={`${pulse} h-9 w-14`} />
          <div className={`${pulse} h-9 w-14`} />
        </div>
        <div className="mt-auto flex justify-end gap-2 pt-4">
          <div className={`${pulse} h-8 w-20`} />
          <div className={`${pulse} h-8 w-20`} />
        </div>
      </div>
    </div>
  );
}

export default function RestaurantPageSkeleton() {
  return (
    <div className="min-h-[calc(var(--app-viewport-height)+36rem)] w-full bg-app-background" aria-busy="true" aria-label="Loading restaurant menu">
      <header className="relative mt-12 border-b border-hairline bg-white pt-4 lg:mt-16 lg:pt-0">
        <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:py-10">
          <div className="mx-auto flex max-w-4xl flex-col items-center">
            <div className="flex items-center gap-4">
              <div className="h-14 w-14 animate-pulse rounded-full bg-slate-200 motion-reduce:animate-none" />
              <div className={`${pulse} h-9 w-64 max-w-[60vw]`} />
            </div>
            <div className={`${pulse} mt-5 h-4 w-full max-w-xl`} />
            <div className={`${pulse} mt-2 h-4 w-4/5 max-w-lg`} />
            <div className="mt-6 flex w-full justify-center gap-5 border-t border-divider pt-4">
              <div className={`${pulse} h-3 w-28`} />
              <div className={`${pulse} h-3 w-24`} />
              <div className={`${pulse} h-3 w-28`} />
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl px-3 pb-16 sm:px-4 lg:px-6">
        <div className="relative py-5 lg:py-6">
          <div className="absolute inset-x-0 top-1/2 border-t border-divider" aria-hidden="true" />
          <div className="relative mx-auto flex h-[52px] w-full max-w-[680px] items-center gap-2 rounded-full border border-hairline bg-white p-1.5 shadow-elev-1">
            <div className={`${pulse} h-10 w-48`} />
            <div className={`${pulse} h-10 w-28`} />
            <div className="mx-1 h-6 w-px bg-slate-200" />
            <div className={`${pulse} h-4 w-24`} />
            <div className={`${pulse} ml-auto h-9 w-[74px]`} />
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
          <aside className="hidden rounded-2xl border border-black/5 bg-white p-4 lg:block">
            <div className={`${pulse} h-5 w-24`} />
            {Array.from({ length: 6 }, (_, index) => <div key={index} className={`${pulse} mt-4 h-4`} style={{ width: `${72 + (index % 3) * 8}%` }} />)}
          </aside>
          <div className="mx-auto grid w-full max-w-[900px] gap-3">
            {Array.from({ length: 6 }, (_, index) => <MenuCardSkeleton key={index} />)}
          </div>
        </div>
      </main>
    </div>
  );
}
