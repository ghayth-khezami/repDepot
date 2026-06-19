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
        includeAssets: [
          'logo.png',
          'Baby loading.json',
          'sticker 4.png',
          'sticker 5.png',
          'sticker 6.png',
          'sticker 7.png',
          'sticker 9.png',
          'sticker 10.png',
          'sticker 11.png',
          'sticket 1 .png',
        ],
        manifest: {
          name: 'BÉBÉ-DÉPÔT Admin',
          short_name: 'Bébé-Dépôt',
          description: 'Application mobile admin BÉBÉ-DÉPÔT — produits, scan, commandes',
          theme_color: '#7c3aed',
          background_color: '#1e1035',
          display: 'standalone',
          orientation: 'portrait',
          lang: 'fr',
          start_url: '/',
          scope: '/',
          icons: [
            { src: '/logo.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: '/logo.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
          ],
        },
        workbox: {
          navigateFallback: '/index.html',
          importScripts: ['push-sw.js'],
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
