import ProfileGate from "@/components/profile/ProfileGate";
import { ProfileProvider } from "@/components/profile/ProfileContext";
import "./globals.css";

export const metadata = {
  title: {
    default: "Macro Maxxer",
    template: "%s | Macro Maxxer",
  },
  description:
    "Track your fast food order macros and see your total macros before you order it. The app makes it super easy for you to find high protein items, spot hidden calories, and choose meals that actually fit your goals.",

  openGraph: {
    title: "Macro Maxxer",
    description:
      "Track your fast food order macros and see your total macros before you order it. Find high protein,low calorie items, and choose meals that fit your goals.",
    url: "https://your-vercel-url.vercel.app",
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
      <body className="antialiased">
        <ProfileProvider>
          <ProfileGate>{children}</ProfileGate>
        </ProfileProvider>
      </body>
    </html>
  );
}
