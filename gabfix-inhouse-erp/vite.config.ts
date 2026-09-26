import { defineConfig, Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// PWA plugin is optional during scaffold — install with `npm install` to enable.
let pwaPlugin: Plugin[] = [];
try {
  const { VitePWA } = await import('vite-plugin-pwa');
  pwaPlugin = [VitePWA({
    registerType: 'autoUpdate',
    manifest: {
      name: 'Gabfix Portal',
      short_name: 'Portal',
      description: 'Gabfix Portal — field technician app',
      display: 'standalone',
      background_color: '#f5f7f5',
      theme_color: '#4088b5',
      icons: [
        { src: '/icons/logo-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/logo-512.png', sizes: '512x512', type: 'image/png' },
  ],
    },
    workbox: {
      cleanupOutdatedCaches: true,
      runtimeCaching: [
        {
          urlPattern: ({ url }) => url.pathname.startsWith('/api/'),
          handler: 'NetworkFirst',
          options: {
            cacheName: 'api-cache',
            expiration: { maxAgeSeconds: 300 },
          },
        },
        {
          urlPattern: ({ url }) => url.pathname.startsWith('/api/beacon'),
          handler: 'BackgroundSync',
          options: {
            backgroundSync: {
              name: 'beacon-outbox',
              maxRetentionTime: 1440, // 24 hours
            },
          },
        },
      ],
    },
  })];
} catch {
  console.warn('[vite] vite-plugin-pwa not installed — PWA features disabled');
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    ...pwaPlugin,
  ],
  server: {
    port: 5175,
    strictPort: true,
    proxy: {
      '/api': 'http://localhost:4000',
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
});