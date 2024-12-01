import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    unoptimized: true,
  },

  // Webpack configuration for all static assets
  webpack: (config, { isServer }) => {
    config.module.rules.push({
      test: /\.(mp3|json)$/,
      type: "asset/resource",
      generator: {
        filename: "static/[name][ext]",
      },
    });

    return config;
  },
};

export default nextConfig;
