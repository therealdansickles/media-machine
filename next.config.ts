import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    return [{ source: "/editions", destination: "https://media-machine-editions.sickles.chatgpt.site", permanent: false }];
  },
};

export default nextConfig;
