import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // Products are sold from the homepage's order section; old shop/product links land there.
    return [
      { source: "/shop", destination: "/#order", permanent: false },
      { source: "/product/:slug*", destination: "/#order", permanent: false },
    ];
  },
  async rewrites() {
    return [{ source: "/", destination: "/landing.html" }];
  },
};

export default nextConfig;
