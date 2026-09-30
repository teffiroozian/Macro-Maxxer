import type { NextConfig } from "next";

const isCapacitorBuild = process.env.CAPACITOR_BUILD === "1";

const nextConfig: NextConfig = {
  ...(isCapacitorBuild ? { output: "export" as const } : {}),
  env: {
    NEXT_PUBLIC_CAPACITOR_BUILD: isCapacitorBuild ? "1" : "0",
  },
  outputFileTracingIncludes: {
    '/restaurant/*/opengraph-image': ['./public/fonts/**/*', './public/logo.svg', './public/restaurants/**/*'],
  },
  images: {
    unoptimized: isCapacitorBuild,
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
