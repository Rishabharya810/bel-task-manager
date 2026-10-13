import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  envPrefix: 'VITE_',
  server: {
    port: 5173,
    host: true
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    assetsDir: 'assets',
    sourcemap: true
  }
});
