import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: false,
  images: {
    qualities: [75, 95],
  },
  devIndicators: false,
  // The app is opened at 127.0.0.1 while the dev server is bound to 0.0.0.0.
  // Without this, Next blocks the HMR socket and client components never hydrate.
  allowedDevOrigins: ["127.0.0.1"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
