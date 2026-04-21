import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: process.env.DEV_ORIGIN ? [process.env.DEV_ORIGIN] : undefined,
  serverExternalPackages: ['@lancedb/lancedb', 'langchain', '@langchain/community', 'tesseract.js', 'mammoth', 'pdf-parse'],
};

export default nextConfig;
