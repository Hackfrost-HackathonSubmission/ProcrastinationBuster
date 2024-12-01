import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // Add support for audio files
    config.module.rules.push({
      test: /\.(mp3)$/,
      type: "asset/resource",
      generator: {
        filename: "static/media/[name][ext]",
      },
    });

    return config;
  },
  async headers() {
    return [
      {
        source: "/sounds/:path*",
        headers: [
          {
            key: "Content-Type",
            value: "audio/mpeg",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
