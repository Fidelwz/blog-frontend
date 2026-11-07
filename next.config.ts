import type { NextConfig } from "next";

const config: NextConfig = {
  poweredByHeader: false,
  experimental: { cpus: 2 },
  async headers() {
    return [{ source: "/recuperar/:path*", headers: [{ key: "Referrer-Policy", value: "no-referrer" }] }];
  },
};
export default config;
