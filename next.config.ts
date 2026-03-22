import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["remotion", "@remotion/player", "@remotion/media-utils"],
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "img.clerk.com" },
      { protocol: "https", hostname: "images.clerk.dev" },
      { protocol: "https", hostname: "*.supabase.co" },
      { protocol: "https", hostname: "openrouter.ai" },
    ],
  },
};

export default nextConfig;
