import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // pdfkit reads its .afm font metrics from disk at require time, which breaks
  // when webpack bundles it. Keeping it external means Node resolves the real
  // package and its data files at runtime.
  serverExternalPackages: ["pdfkit"],
};
export default nextConfig;
