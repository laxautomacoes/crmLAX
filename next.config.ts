import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
});

const nextConfig: NextConfig = {
  /* Força o uso do Webpack e silencia o aviso informativo do Turbopack */
  webpack: (config) => {
    return config;
  },
  turbopack: {},
};

export default withPWA(nextConfig);
