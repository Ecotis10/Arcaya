import { defineConfig } from 'vite';

export default defineConfig({
  // Ruta base para GitHub Pages (el sitio vive en /Arcaya/). En local queda '/'.
  base: process.env.GITHUB_ACTIONS ? '/Arcaya/' : '/',
  server: { host: true, port: 5173 },
  build: {
    target: 'es2020',
    assetsInlineLimit: 2048,
  },
});
