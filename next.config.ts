import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* Strict mode catches lifecycle bugs early */
  reactStrictMode: true,

  /* Allow images from external domains as needed */
  images: {
    remotePatterns: [],
  },

  /* Expose only NEXT_PUBLIC_ prefixed env vars to the browser */
  env: {},
};

export default nextConfig;
