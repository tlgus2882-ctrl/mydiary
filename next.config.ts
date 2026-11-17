import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // E2E runs a second dev server (quota project); it needs its own build dir.
  distDir: process.env.NEXT_DIST_DIR || ".next",
};

export default nextConfig;
