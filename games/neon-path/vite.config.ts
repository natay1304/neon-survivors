import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        editor: resolve(__dirname, 'editor.html'),
      },
    },
  },
  server: { port: 5178, allowedHosts: true },
  resolve: {
    alias: {
      '@survivors/core': resolve(__dirname, '../../packages/core/src'),
      '@survivors/sdk': resolve(__dirname, '../../packages/sdk/src'),
    },
  },
});
