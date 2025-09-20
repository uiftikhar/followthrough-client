import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  output: "standalone",
  experimental: {
    // This is needed for the standalone output to work correctly
    outputFileTracingRoot: __dirname,
  },

  // Add environment variables to make available to the client
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001",
    NEXT_PUBLIC_BROWSER_API_URL: process.env.NEXT_PUBLIC_BROWSER_API_URL || "http://localhost:3001",
    NEXT_PUBLIC_WS_URL: process.env.NEXT_PUBLIC_WS_URL || "ws://localhost:3001",
    NEXT_PUBLIC_BROWSER_WS_URL: process.env.NEXT_PUBLIC_BROWSER_WS_URL || "ws://localhost:3001",
    NEXT_PUBLIC_API_HOST: process.env.NEXT_PUBLIC_API_HOST || "localhost:3001",
    // GOOGLE_AUTH_CLIENT_ID: process.env.GOOGLE_AUTH_CLIENT_ID || "",
    // GOOGLE_AUTH_CLIENT_SECRET: process.env.GOOGLE_AUTH_CLIENT_SECRET || "",
    // NEXT_PUBLIC_GOOGLE_AUTH_CLIENT_ID: process.env.NEXT_PUBLIC_GOOGLE_AUTH_CLIENT_ID || "",
  },

  // Add API proxy configuration
  async rewrites() {
    return [
      // Proxy meeting analysis API requests to the server
      {
        source: "/api/v1/:path*",
        destination: "http://localhost:3001/api/v1/:path*",
      },
      // Proxy other API requests to the server when bypass header is present
      {
        source: "/api/:path*",
        has: [
          {
            type: "header",
            key: "x-bypass-auth",
            value: "1",
          },
        ],
        destination: "http://localhost:3001/api/:path*",
      },
    ];
  },
};

export default nextConfig;
