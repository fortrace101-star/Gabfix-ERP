import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
  },
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:5000",
        changeOrigin: true,
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: "autoUpdate",
      injectRegister: null,
      manifest: false,
      filename: "sw.js",
      devOptions: { enabled: false },
      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/],
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === "navigate",
            handler: "NetworkFirst",
            options: { cacheName: "gabfix-pages", networkTimeoutSeconds: 4 },
          },
          {
            urlPattern: ({ url }) =>
              url.origin === self.location.origin && /\.[a-f0-9]{8,}\.(js|css)$/.test(url.pathname),
            handler: "CacheFirst",
            options: { cacheName: "gabfix-assets" },
          },
        ],
      },
    }),
  ],
});
