import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Allows the dev server to accept requests from your Tailscale IP,
  // not just localhost — without this, API calls made from your phone
  // get silently blocked and everything hangs on "Loading..."
  allowedDevOrigins: ['100.112.38.43', 'desktop-25aii3l.tail2a8954.ts.net'],
};

export default nextConfig;