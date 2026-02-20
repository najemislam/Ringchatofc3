import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [
      { source: "/home", destination: "/chats", permanent: true },
      { source: "/home/chats", destination: "/chats", permanent: true },
      { source: "/home/chat/:id", destination: "/chats/:id", permanent: true },
      { source: "/home/friends", destination: "/connect", permanent: true },
      { source: "/home/notifications", destination: "/notifications", permanent: true },
      { source: "/home/profile", destination: "/profile", permanent: true },
      { source: "/home/stories", destination: "/stories", permanent: true },
      { source: "/home/stories/create", destination: "/stories/create", permanent: true },
      { source: "/home/search", destination: "/search", permanent: true },
      { source: "/home/settings", destination: "/settings", permanent: true },
      { source: "/home/community", destination: "/community", permanent: true },
      { source: "/home/community/:id", destination: "/community/:id", permanent: true },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**',
      },
      {
        protocol: 'http',
        hostname: '**',
      },
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
}

export default nextConfig;
