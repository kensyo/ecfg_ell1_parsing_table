import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath: '/ecfg_ell1_parsing_table',
  assetPrefix: '/ecfg_ell1_parsing_table'
};

export default nextConfig;
