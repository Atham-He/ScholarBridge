import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  experimental: {
    externalDir: true,
  },
  turbopack: {
    root: path.join(__dirname),
  },
  allowedDevOrigins: [
    '127.0.0.1',
    'localhost',
    'run-agent-6a1beb2e2edba8754a5503d2-mptpq8mj-preview.agent-sandbox-my-b1-gw.trae.ai',
    '*.trae.ai'
  ],
};

export default nextConfig;
