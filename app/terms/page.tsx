import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import HomeBackdrop from "@/components/home/HomeBackdrop";
import HomeFooter from "@/components/home/HomeFooter";
import HomeSectionContainer from "@/components/home/HomeSectionContainer";
import SurfaceCard from "@/components/ui/SurfaceCard";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "Read the terms that apply when using Macro Maxxer.",
  alternates: {
    canonical: "/terms",
  },
};

const sectionHeadingClassName = "font-heading text-lg font-bold text-neutral-900 sm:text-xl";
const paragraphClassName = "mt-3 text-sm leading-7 text-neutral-600 sm:text-base";

export default function TermsPage() {
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
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-accent-strong">Terms</p>
              <h1 className="mt-3 font-heading text-3xl font-bold tracking-tight text-neutral-950 sm:text-4xl">
                Terms of Use
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
                <h2 className={sectionHeadingClassName}>1. Acceptance of Terms</h2>
                <p className={paragraphClassName}>
                  By accessing or using Macro Maxxer, you agree to these Terms of Use. If you do not agree, please do not use the service.
                </p>
              </section>

              <section>
                <h2 className={sectionHeadingClassName}>2. Permitted Use</h2>
                <p className={paragraphClassName}>
                  You may use Macro Maxxer for normal personal and informational purposes. You may not use the service unlawfully, interfere with its operation, abuse its features, attempt unauthorized access, or try to disrupt the service or other users’ access to it.
                </p>
              </section>

              <section>
                <h2 className={sectionHeadingClassName}>3. Nutrition Information Disclaimer</h2>
                <p className={paragraphClassName}>
                  Nutrition and menu information is provided for informational purposes only. It may change or vary because of restaurant updates, preparation methods, substitutions, portion sizes, ingredients, or location. Information shown in Macro Maxxer may not always match what a restaurant currently serves.
                </p>
              </section>

              <section>
                <h2 className={sectionHeadingClassName}>4. Not Medical Advice</h2>
                <p className={paragraphClassName}>
                  Macro Maxxer does not provide medical, dietary, or other professional health advice. Do not use the service as a substitute for advice from a qualified healthcare professional.
                </p>
              </section>

              <section>
                <h2 className={sectionHeadingClassName}>5. Allergens and Dietary Needs</h2>
                <p className={paragraphClassName}>
                  If you have food allergies, a medical condition, or strict dietary requirements, verify ingredients, preparation practices, and nutrition information directly with the restaurant before ordering or eating.
                </p>
              </section>

              <section>
                <h2 className={sectionHeadingClassName}>6. Service Availability</h2>
                <p className={paragraphClassName}>
                  Features, restaurant data, and the service itself may be changed, updated, removed, or temporarily unavailable. We may also add or stop supporting restaurants or features as Macro Maxxer develops.
                </p>
              </section>

              <section>
                <h2 className={sectionHeadingClassName}>7. Accuracy and Warranties</h2>
                <p className={paragraphClassName}>
                  We work to make Macro Maxxer useful, but we do not guarantee that every menu item, nutrition value, feature, or other piece of information will always be complete, current, accurate, available, or error-free.
                </p>
              </section>

              <section>
                <h2 className={sectionHeadingClassName}>8. Intellectual Property</h2>
                <p className={paragraphClassName}>
                  Macro Maxxer’s branding, software, site design, and original content are protected by applicable intellectual property laws. Restaurant names, logos, trademarks, menu information, and related materials belong to their respective owners.
                </p>
              </section>

              <section>
                <h2 className={sectionHeadingClassName}>9. Limitation of Liability</h2>
                <p className={paragraphClassName}>
                  To the extent allowed by law, Macro Maxxer is not responsible for losses, injuries, or other harm resulting from reliance on inaccurate or outdated information, restaurant preparation or substitutions, or interruptions to the service. You are responsible for confirming information that is important to your health, diet, or purchasing decisions.
                </p>
              </section>

              <section>
                <h2 className={sectionHeadingClassName}>10. Third-Party Services</h2>
                <p className={paragraphClassName}>
                  Macro Maxxer may link to or rely on third-party websites, tools, or services. Your use of those services is governed by their own terms and policies, and Macro Maxxer does not control them.
                </p>
              </section>

              <section>
                <h2 className={sectionHeadingClassName}>11. Changes to the Terms</h2>
                <p className={paragraphClassName}>
                  We may update these terms as Macro Maxxer changes. Updated terms will be posted on this page with a revised “Last updated” date.
                </p>
              </section>

              <section>
                <h2 className={sectionHeadingClassName}>12. Contact</h2>
                <p className={paragraphClassName}>
                  For questions about these terms, email{" "}
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

      <HomeFooter primaryRestaurantHref="/" />
    </div>
  );
}
