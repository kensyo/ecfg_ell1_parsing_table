import type { NextConfig } from "next";
import { access, symlink } from "fs/promises";
import { join } from "path";

const nextConfig: NextConfig = {
  /* config options here */
  output: "export",
  images: {
    unoptimized: true,
  },
  basePath: '/ecfg_ell1_parsing_table',
  assetPrefix: '/ecfg_ell1_parsing_table',
  webpack: (config, {isServer}) => {
    config.resolve.extensions = [...config.resolve.extensions, ".wasm"];

    // https://github.com/vercel/next.js/issues/25852
    config.plugins.push(
      new (class {
        apply(compiler: any) {
          compiler.hooks.afterEmit.tapPromise(
            'SymlinkWebpackPlugin',
            async (compiler: any) => {
              if (isServer) {
                const from = join(compiler.options.output.path, '../static');
                const to = join(compiler.options.output.path, 'static');

                try {
                  await access(from);
                  console.log(`${from} already exists`);
                  return;
                } catch (error: any) {
                  if (error.code === 'ENOENT') {
                    // No link exists
                  } else {
                    throw error;
                  }
                }

                await symlink(to, from, 'junction');
                console.log(`created symlink ${from} -> ${to}`);
              }
            },
          );
        }
      })(),
    );

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
