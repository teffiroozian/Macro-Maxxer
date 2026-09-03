import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Github } from "lucide-react";
import SurfaceCard from "@/components/ui/SurfaceCard";
import { appButtonClassName } from "@/components/ui/AppButton";
import HomeSectionContainer, { HOME_VISUAL_WIDTH_CLASS } from "@/components/home/HomeSectionContainer";
import { macroDisplayConfig, macroOrder } from "@/components/nutrition/macroDisplay";

const REPOSITORY_URL = "https://github.com/teffiroozian/Macro-Maxxer";

// Shared site footer, preserving the homepage footer's original product-led
// panel, macro-color signature, legal links, and external repository link.
export default function SiteFooter() {
  return (
    <footer className="relative mt-8 overflow-hidden border-t border-black/5 bg-gradient-to-b from-transparent via-emerald-50/30 to-emerald-50/60">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute right-[-120px] top-[-120px] h-72 w-72 rounded-full bg-[radial-gradient(closest-side,rgba(5,150,105,0.16),transparent_75%)] blur-2xl"
      />

      <HomeSectionContainer as="div" className="py-14 sm:py-16">
        <SurfaceCard as="div" radius="large" shadow="sm" padding="none" className={`mx-auto w-full ${HOME_VISUAL_WIDTH_CLASS} overflow-hidden bg-white/90 backdrop-blur-sm`}>
          <div className="grid gap-8 p-6 sm:grid-cols-[1.3fr_1fr] sm:items-center sm:gap-10 sm:p-10">
            <div>
              <Link href="/" className="inline-flex items-center gap-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
                <Image src="/logo.png" alt="" width={28} height={28} aria-hidden="true" className="rounded-lg" />
                <span className="font-heading text-lg font-bold text-neutral-900">Macro Maxxer</span>
              </Link>

              <p className="mt-3 max-w-sm text-sm text-neutral-600">
                See exactly what you&apos;re ordering before you order it — real menu data and real macros, one search away.
              </p>

              <Link
                href="/"
                className={appButtonClassName({ variant: "primary", size: "sm", className: "group mt-5 w-fit" })}
              >
                Browse the Menu
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-200 ease-out group-hover:translate-x-0.5 group-focus-visible:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0 motion-reduce:group-focus-visible:translate-x-0"
                  aria-hidden="true"
                />
              </Link>
            </div>

            <div aria-hidden="true" className="rounded-2xl border border-black/10 bg-neutral-50/70 p-4 sm:p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500">Every Item, Broken Down</p>
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                {macroOrder.map((macroKey) => {
                  const config = macroDisplayConfig[macroKey];
                  return (
                    <span key={macroKey} className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-700">
                      <span className={`h-2 w-2 shrink-0 rounded-full bg-current ${config.valueClassNameByVariant.default}`} />
                      {config.label}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>
        </SurfaceCard>

        <p className="mx-auto mt-6 w-full max-w-4xl text-center text-xs leading-5 text-neutral-500">
          Nutrition information may vary by location, preparation, portion size, substitutions, or restaurant updates.
        </p>

        <div className="mx-auto mt-3 flex w-full max-w-4xl flex-col items-center justify-between gap-3 text-xs text-neutral-500 sm:flex-row">
          <p>© {new Date().getFullYear()} Macro Maxxer</p>
          <div className="flex items-center gap-4">
            <Link
              href="/privacy"
              className="font-medium text-neutral-500 transition hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="font-medium text-neutral-500 transition hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              Terms
            </Link>
            <a
              href={REPOSITORY_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 font-semibold text-neutral-600 transition hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
            >
              <Github className="h-3.5 w-3.5" aria-hidden="true" />
              View on GitHub
            </a>
          </div>
        </div>
      </HomeSectionContainer>
    </footer>
  );
}
