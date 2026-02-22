import type { NextConfig } from "next";
import { resolve } from "path";

const nextConfig: NextConfig = {
  transpilePackages: ["three"],
  turbopack: {
    root: resolve(__dirname, "../.."),
  },
};

export default nextConfig;
