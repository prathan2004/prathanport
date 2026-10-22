import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss(), {
    name: 'lanna-dev-entry',
    configureServer(server) {
      server.middlewares.use((req, _res, next) => {
        const request = req as { url?: string };
        if (request.url?.split('?')[0] === '/') request.url = request.url.replace('/', '/template.html');
        next();
      });
    },
  }],
  build: { rollupOptions: { input: 'template.html' } },
  test: { environment: 'node' },
});
