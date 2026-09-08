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
  async headers() {
    return [
      {
        // Stockfish WASM must be served with the correct MIME type or the
        // engine worker refuses to initialise.
        source: "/engine/:path*.wasm",
        headers: [{ key: "Content-Type", value: "application/wasm" }],
      },
      {
        // Never let browsers cache a stale engine binary across deploys.
        source: "/engine/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Cross-Origin-Embedder-Policy", value: "credentialless" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

export default nextConfig;