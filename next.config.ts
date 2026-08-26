import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      // Official Chick-fil-A ordering-menu CDN — the generated Chick-fil-A
      // dataset (data/generated/chick-fil-a/restaurant.json) points every
      // item/ingredient image at this host instead of a local asset.
      {
        protocol: "https",
        hostname: "www.cfacdn.com",
      },
    ],
  },
};

export default nextConfig;
