import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";
import type { Metadata } from "next";
import { Suspense } from "react";
import { GoogleAnalytics } from "@next/third-parties/google";
import { Outfit, Unbounded } from "next/font/google";
import { GlobalSearchProvider } from "@/components/GlobalSearchContext";
import { GlobalItemPreviewProvider } from "@/components/GlobalItemPreviewContext";
import { CartAddConfirmationProvider } from "@/components/CartAddConfirmationContext";
import { BuildInProgressGuardProvider } from "@/components/BuildInProgressGuardContext";
import GlobalSearchOverlay from "@/components/global-search/GlobalSearchOverlay";
import GlobalItemPreviewModal from "@/components/GlobalItemPreviewModal";
import CrossRestaurantCartDialog from "@/components/cart/CrossRestaurantCartDialog";
import InProgressBuildDialog from "@/components/InProgressBuildDialog";
import "./globals.css";

// Central type system for the whole app (Slice 1 establishes this on the
// homepage; other pages still fall back to Outfit as the base body font).
//
// - Outfit (`font-sans`, the default): paragraphs, nav, search input/tabs,
//   eyebrows, badges/pills, buttons, links, and any dense or small-scale
//   UI text. This is the default — most elements need no extra class.
// - Unbounded (`font-heading`): major display moments only — the hero
//   headline, section headings, and prominent restaurant/item names.
//   Never apply it to dense UI, long-form copy, or small text (its
//   letterforms stop reading cleanly below ~text-sm).
//
// `display: "swap"` on both — self-hosted by next/font (no runtime network
// request), so the swap window is effectively immediate rather than a
// visible fallback-font flash.
const outfit = Outfit({
    variable: "--font-outfit",
    subsets: ["latin"],
    display: "swap",
});

const unbounded = Unbounded({
    variable: "--font-unbounded",
    subsets: ["latin"],
    weight: ["500", "600", "700", "800"],
    display: "swap",
});

export const metadata: Metadata = {
    metadataBase: new URL("https://www.macromaxxer.com"),

    title: {
        default: "Fast Food Nutrition & Macro Tracker | Macro Maxxer",
        template: "%s | Macro Maxxer",
    },
    description:
        "Compare fast food nutrition, track calories and macros, customize meals, and find high-protein options that fit your goals.",

    openGraph: {
        title: "Fast Food Nutrition & Macro Tracker | Macro Maxxer",
        description:
            "Compare fast food nutrition, track calories and macros, customize meals, and find high-protein options that fit your goals.",
        url: "https://www.macromaxxer.com",
        siteName: "Macro Maxxer",
        images: [
            {
                url: "/og-image.png",
                width: 1200,
                height: 630,
            },
        ],
        type: "website",
    },
    icons: {
        icon: [
            { url: "/favicon.ico" },
            { url: "/logo.png", type: "image/png" },
        ],
        shortcut: "/favicon.ico",
        apple: "/logo.png",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${outfit.className} ${unbounded.variable} antialiased`}
            >
                <GlobalSearchProvider>
                    <GlobalItemPreviewProvider>
                        <CartAddConfirmationProvider>
                            <BuildInProgressGuardProvider>
                                {children}
                                <Suspense fallback={null}>
                                    <GlobalSearchOverlay />
                                </Suspense>
                                <GlobalItemPreviewModal />
                                <CrossRestaurantCartDialog />
                                <InProgressBuildDialog />
                            </BuildInProgressGuardProvider>
                        </CartAddConfirmationProvider>
                    </GlobalItemPreviewProvider>
                </GlobalSearchProvider>
                <Analytics />
                <SpeedInsights />
                <GoogleAnalytics gaId="G-LRJD1DEDVK" />
            </body>
        </html>
    );
}
