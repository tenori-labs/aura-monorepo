import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  serverExternalPackages: [
    'genkit',
    '@genkit-ai/core',
    'express',
    'import-in-the-middle',
    'require-in-the-middle',
  ],
  experimental: {
    // Incident reports embed an image (up to MAX_FILE_SIZE = 5MB) as base64 in the
    // server-action payload; base64 inflates ~33%, so the request can reach ~7MB.
    // The default server-action body limit is 1MB, which rejects photo uploads with
    // an opaque "Application error". Raise it to fit a 5MB file with headroom.
    serverActions: {
      bodySizeLimit: '8mb',
    },
  },
};

export default nextConfig;
