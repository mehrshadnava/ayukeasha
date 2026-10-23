import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/shop", destination: "/product/ritual-box", permanent: false }];
  },
  async rewrites() {
    return [{ source: "/", destination: "/landing.html" }];
  },
};

export default nextConfig;
