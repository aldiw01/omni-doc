import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ['@lancedb/lancedb', 'langchain', '@langchain/community', 'tesseract.js', 'mammoth', 'pdf-parse'],
};

export default nextConfig;
