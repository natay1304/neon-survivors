import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  build: { target: 'es2020' },
  server: { port: 5174, allowedHosts: true },
  resolve: {
    alias: {
      '@survivors/core': resolve(__dirname, '../../packages/core/src'),
      '@survivors/sdk': resolve(__dirname, '../../packages/sdk/src'),
    },
  },
});
