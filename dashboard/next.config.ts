import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  webpack: (config) => {
    config.module.rules.push({
      test: /\.ts$/,
      exclude: /hls-output/,
    });
    return config;
  },
};

export default nextConfig;
