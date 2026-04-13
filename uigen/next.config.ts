import type { NextConfig } from "next";

// ✅ ADD THIS LINE AT THE VERY TOP
require('./node-compat.cjs');

const nextConfig: NextConfig = {
  devIndicators: false,
};

export default nextConfig;