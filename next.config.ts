import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "genkit",
    "@genkit-ai/core",
    "express",
    "import-in-the-middle",
    "require-in-the-middle",
  ],
};

export default nextConfig;
