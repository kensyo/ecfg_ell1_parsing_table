import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath: '/ecfg_ell1_parsing_table',
  assetPrefix: '/ecfg_ell1_parsing_table',
  webpack: (config) => {
    config.resolve.extensions = [...config.resolve.extensions, ".wasm"];

    config.experiments = {
      ...(config.experiments || {}),
      asyncWebAssembly: true,
      syncWebAssembly: true,
    };
    config.module.rules.push({
      test: /\.wasm$/,
      type: "webassembly/async",
    });
    return config;
  },
};

export default nextConfig;
