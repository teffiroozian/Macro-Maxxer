import type { NextConfig } from "next";

const isCapacitorBuild = process.env.CAPACITOR_BUILD === "1";
// `npm run dev:ios`: serve the native iOS interface from the dev server. It
// shares the native build flag but not `output: "export"`, which rejects the
// hosted item routes that scripts/build-capacitor.mjs hides at build time.
// The production guard keeps a stray IOS_DEV from leaking into a real build.
const isIosDev = process.env.IOS_DEV === "1" && process.env.NODE_ENV !== "production";
const isNativeTarget = isCapacitorBuild || isIosDev;

const nextConfig: NextConfig = {
  ...(isCapacitorBuild ? { output: "export" as const } : {}),
  // Separate output and tsconfig so dev:ios can run beside `npm run dev`.
  ...(isIosDev
    ? { distDir: ".next-ios", typescript: { tsconfigPath: "tsconfig.ios-dev.json" } }
    : {}),
  env: {
    NEXT_PUBLIC_CAPACITOR_BUILD: isNativeTarget ? "1" : "0",
  },
  outputFileTracingIncludes: {
    '/restaurant/*/opengraph-image': ['./public/fonts/**/*', './public/logo.svg', './public/restaurants/**/*'],
  },
  images: {
    unoptimized: isNativeTarget,
    remotePatterns: [
      // Official Chick-fil-A ordering-menu CDN — the generated Chick-fil-A
      // dataset (data/restaurants/chick-fil-a/generated/restaurant.json) points every
      // item/ingredient image at this host instead of a local asset.
      {
        protocol: "https",
        hostname: "www.cfacdn.com",
      },
      {
        protocol: "https",
        hostname: "www.chipotle.com",
      },
      {
        protocol: "https",
        hostname: "miinternal-cdn.chipotle.com",
      },
      {
        protocol: "https",
        hostname: "cloudassets.starbucks.com",
      },
      {
        protocol: "https",
        hostname: "s7d1.scene7.com",
      },
    ],
  },
};

export default nextConfig;
