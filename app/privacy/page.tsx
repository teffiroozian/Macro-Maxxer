import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import HomeBackdrop from "@/components/home/HomeBackdrop";
import HomeSectionContainer from "@/components/home/HomeSectionContainer";
import SurfaceCard from "@/components/ui/SurfaceCard";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Learn how Macro Maxxer handles information when you use the service.",
  alternates: {
    canonical: "/privacy",
  },
};

const sectionHeadingClassName = "font-heading text-lg font-bold text-neutral-900 sm:text-xl";
const paragraphClassName = "mt-3 text-sm leading-7 text-neutral-600 sm:text-base";
const listClassName = "mt-3 list-disc space-y-1.5 pl-5 text-sm leading-7 text-neutral-600 sm:text-base";

export default function PrivacyPage() {
  return (
    <div className="relative isolate min-h-screen">
      <HomeBackdrop />

      <header>
        <HomeSectionContainer as="div" className="py-5 sm:py-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 rounded-lg focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-slate-900"
          >
            <Image src="/logo.png" alt="" width={32} height={32} aria-hidden="true" className="rounded-lg" />
            <span className="font-heading text-lg font-bold text-neutral-900">Macro Maxxer</span>
          </Link>
        </HomeSectionContainer>
      </header>

      <main>
        <HomeSectionContainer className="pb-12 pt-8 sm:pb-16 sm:pt-12">
          <div className="mx-auto max-w-3xl">
            <div className="text-center">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-strong">Privacy</p>
              <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight text-neutral-950 sm:text-4xl">
                Privacy Policy
              </h1>
              <p className="mt-4 text-sm text-neutral-500">Last updated: September 3, 2026</p>
            </div>

            <SurfaceCard
              as="article"
              radius="large"
              shadow="sm"
              padding="none"
              className="mt-8 space-y-9 bg-white/90 p-6 backdrop-blur-sm sm:p-10"
            >
              <section>
                <h2 className={sectionHeadingClassName}>1. Introduction</h2>
                <p className={paragraphClassName}>
                  This Privacy Policy explains how Macro Maxxer handles information when you visit or use our restaurant nutrition and macro discovery service at macromaxxer.com.
                </p>
              </section>

              <section>
                <h2 className={sectionHeadingClassName}>2. Information you provide</h2>
                <p className={paragraphClassName}>
                  Macro Maxxer currently does not require user accounts and does not offer forms for submitting personal information. We do not intentionally collect names, email addresses, payment information, health information, or other personal information directly from users.
                </p>
              </section>

              <section>
                <h2 className={sectionHeadingClassName}>3. Analytics and technical information</h2>
                <p className={paragraphClassName}>
                  We use Google Analytics, Vercel Web Analytics, and Vercel Speed Insights. These third-party analytics and performance services may automatically collect limited technical and usage information, such as:
                </p>
                <ul className={listClassName}>
                  <li>Pages viewed and interactions with the site</li>
                  <li>Browser and device type</li>
                  <li>Operating system</li>
                  <li>Referring source</li>
                  <li>Performance metrics</li>
                  <li>Approximate location or IP-derived information, where applicable</li>
                </ul>
                <p className={paragraphClassName}>
                  These services may use cookies or similar technologies where applicable, subject to their configurations and policies.
                </p>
              </section>

              <section>
                <h2 className={sectionHeadingClassName}>4. How information is used</h2>
                <p className={paragraphClassName}>We use analytics and technical information to:</p>
                <ul className={listClassName}>
                  <li>Understand how Macro Maxxer is used</li>
                  <li>Improve the product</li>
                  <li>Diagnose performance or technical issues</li>
                  <li>Understand traffic and feature usage</li>
                </ul>
              </section>

              <section>
                <h2 className={sectionHeadingClassName}>5. Nutrition and restaurant activity</h2>
                <p className={paragraphClassName}>
                  Browsing restaurants, viewing menu items, filtering meals, and using nutrition tools are not currently tied to an identified user account. General interactions with these features may still be included in the analytics information described above.
                </p>
              </section>

              <section>
                <h2 className={sectionHeadingClassName}>6. Selling or sharing personal information</h2>
                <p className={paragraphClassName}>
                  Macro Maxxer does not sell personal information. Our analytics and performance providers may process information on our behalf or for their own applicable purposes according to their terms, settings, and privacy policies.
                </p>
              </section>

              <section>
                <h2 className={sectionHeadingClassName}>7. Data retention</h2>
                <p className={paragraphClassName}>
                  Analytics data may be retained by the applicable analytics providers according to their settings and retention policies. Retention periods can vary by provider and configuration.
                </p>
              </section>

              <section>
                <h2 className={sectionHeadingClassName}>8. Third-party services and links</h2>
                <p className={paragraphClassName}>
                  Macro Maxxer may rely on or link to third-party services. Those services have their own terms and privacy practices, and Macro Maxxer is not responsible for how they handle information.
                </p>
              </section>

              <section>
                <h2 className={sectionHeadingClassName}>9. Children</h2>
                <p className={paragraphClassName}>Macro Maxxer is not specifically directed at children under 13.</p>
              </section>

              <section>
                <h2 className={sectionHeadingClassName}>10. Changes to this policy</h2>
                <p className={paragraphClassName}>
                  We may update this policy as Macro Maxxer adds features or changes its data practices. When we do, we will update the “Last updated” date above.
                </p>
              </section>

              <section>
                <h2 className={sectionHeadingClassName}>11. Contact</h2>
                <p className={paragraphClassName}>
                  For privacy questions, email{" "}
                  <a
                    href="mailto:tef.firoozian@gmail.com"
                    className="font-semibold text-accent-strong underline decoration-accent/30 underline-offset-4 transition hover:text-neutral-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
                  >
                    tef.firoozian@gmail.com
                  </a>
                  .
                </p>
              </section>
            </SurfaceCard>
          </div>
        </HomeSectionContainer>
      </main>
    </div>
  );
}
