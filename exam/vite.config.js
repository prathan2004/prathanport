import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';
export default defineConfig({
  base: './',
  plugins: [
    tailwindcss(),
    {
      name: 'development-entry',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/' || req.url === '/index.html') req.url = '/source.html';
          next();
        });
      },
    },
  ],
  build: { rollupOptions: { input: 'source.html' } },
  server: { port: 5173, strictPort: true },
});
