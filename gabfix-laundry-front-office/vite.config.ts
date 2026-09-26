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
      name: 'Gabfix Laundry Front Office',
      short_name: 'Laundry FO',
      description: 'Gabfix Laundry Front Office — offline-first counter app',
      display: 'standalone',
      background_color: '#f5f7f5',
      theme_color: '#147d57',
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
    port: 5174,
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