import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  build: { target: 'es2020' },
  server: { allowedHosts: true, port: 5176 },
  resolve: {
    alias: {
      '@survivors/core': resolve(__dirname, '../../packages/core/src'),
      '@survivors/sdk': resolve(__dirname, '../../packages/sdk/src'),
    },
  },
});
