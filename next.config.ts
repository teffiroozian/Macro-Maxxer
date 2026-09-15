import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    '/restaurant/*/opengraph-image': ['./public/fonts/**/*', './public/logo.svg', './public/restaurants/**/*'],
  },
  images: {
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
    ],
  },
};

export default nextConfig;
