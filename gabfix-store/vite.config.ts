import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath, URL } from 'node:url';

// PWA plugin is optional during scaffold — install with `npm install` to enable.
let pwaPlugin: any = [];
try {
  const { VitePWA } = await import('vite-plugin-pwa');
  pwaPlugin = [VitePWA({
    registerType: 'autoUpdate',
    manifest: {
      name: 'Gabfix Store',
      short_name: 'Store',
      description: 'Gabfix Store — inventory and supplier management',
      display: 'standalone',
      background_color: '#f5f7f5',
      theme_color: '#c88728',
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