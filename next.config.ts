import type { NextConfig } from "next";
import path from "node:path";

const config: NextConfig = {
  reactStrictMode: true,
  // Pin workspace root so the presence of other lockfiles above this repo
  // doesn't trigger Next's workspace inference warning.
  outputFileTracingRoot: path.resolve(__dirname),
  logging: {
    fetches: { fullUrl: false },
  },
};

export default config;
