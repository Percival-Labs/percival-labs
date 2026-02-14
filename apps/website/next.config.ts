import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  async rewrites() {
    const registryUrl = process.env.REGISTRY_URL || "http://localhost:3100";
    const agentsUrl = process.env.AGENTS_URL || "http://localhost:3200";
    return [
      {
        source: "/api/registry/:path*",
        destination: `${registryUrl}/:path*`,
      },
      {
        source: "/api/agents/:path*",
        destination: `${agentsUrl}/:path*`,
      },
    ];
  },
};

export default nextConfig;
