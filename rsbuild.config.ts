import path from 'node:path';
import { defineConfig } from '@rsbuild/core';
import { pluginReact } from '@rsbuild/plugin-react';

// Docs: https://rsbuild.rs/config/
export default defineConfig({
  plugins: [pluginReact()],
  tools: {
    // Prevent css-loader from trying to bundle /images/... absolute URLs.
    // They are served directly from the public/ folder at runtime.
    cssLoader: {
      url: false,
    },
  },
  html: {
    title: 'Agriculture',
    favicon: './public/images/icon.png',
  },
  resolve: {
    alias: {
      '@app': path.resolve(__dirname, 'src/app'),
      '@features': path.resolve(__dirname, 'src/features'),
      '@shared': path.resolve(__dirname, 'src/shared'),
      '@lib': path.resolve(__dirname, 'src/shared/lib'),
      '@store': path.resolve(__dirname, 'src/shared/store'),
    },
  },
  server: {
    proxy: {
      '/cctv-proxy': {
        target: 'https://cctv.disaster.go.th',
        changeOrigin: true,
        ws: true,
        secure: false,
        pathRewrite: { '^/cctv-proxy': '' },
        headers: {
          Origin: 'https://cctv.disaster.go.th',
        },
      },
    },
  },
});
