import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [
      react(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['logo.jpg', 'icon.svg'],
        manifest: {
          name: 'BÉBÉ-DÉPÔT Admin',
          short_name: 'Bébé-Dépôt',
          description: 'Application mobile admin BÉBÉ-DÉPÔT — produits, scan, commandes',
          theme_color: '#7c3aed',
          background_color: '#faf5ff',
          display: 'standalone',
          orientation: 'portrait',
          lang: 'fr',
          start_url: '/',
          scope: '/',
          icons: [
            { src: '/logo.jpg', sizes: '192x192', type: 'image/jpeg', purpose: 'any' },
            { src: '/logo.jpg', sizes: '512x512', type: 'image/jpeg', purpose: 'any maskable' },
          ],
        },
        workbox: {
          navigateFallback: '/index.html',
          runtimeCaching: [
            {
              urlPattern: ({ url }) => url.pathname.startsWith('/uploads'),
              handler: 'CacheFirst',
              options: {
                cacheName: 'uploads-cache',
                expiration: { maxEntries: 200, maxAgeSeconds: 60 * 60 * 24 * 7 },
              },
            },
          ],
        },
      }),
    ],
    server: {
      port: 5171,
      proxy: {
        '/api': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
          rewrite: (path) => path.replace(/^\/api/, ''),
        },
        '/uploads': {
          target: env.VITE_API_URL || 'http://localhost:3000',
          changeOrigin: true,
        },
      },
    },
  };
});
