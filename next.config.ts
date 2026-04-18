import type { NextConfig } from "next";

const withPWA = require("@ducanh2912/next-pwa").default({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: true,
  runtimeCaching: [
    {
      urlPattern: /^https:\/\/.*supabase\.co\/storage\/v1\/object\/public\/.*$/,
      handler: "CacheFirst",
      options: {
        cacheName: "offline-images",
        expiration: {
          maxEntries: 500,
          maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
        },
        cacheableResponse: {
          statuses: [0, 200],
        },
      },
    },
    // Default fallback needed? next-pwa has defaults.
  ],
});

const nextConfig: NextConfig = {
  /* Força o uso do Webpack e silencia o aviso informativo do Turbopack */
  webpack: (config) => {
    return config;
  },
  turbopack: {},
};

export default withPWA(nextConfig);
