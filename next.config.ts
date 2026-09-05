import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      {
        source: "/players/:path*",
        destination: "/",
        permanent: true,
      },
      {
        source: "/players",
        destination: "/",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
