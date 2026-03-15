import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      selfDestroying: true,
      registerType: 'autoUpdate',
      includeAssets: ['soz-icon.svg', 'icons/*.png'],
      manifest: {
        id: '/',
        name: 'ShiftOneZero Marketing Platforma',
        short_name: 'ShiftOneZero',
        description: 'AI-powered marketing platforma. Kreirajte sadržaj, upravljajte kampanjama, analizirajte performanse.',
        lang: 'hr',
        dir: 'ltr',
        theme_color: '#F0F7FF',
        background_color: '#F5F9FF',
        display: 'standalone',
        display_override: ['standalone', 'minimal-ui'],
        orientation: 'any',
        scope: '/',
        start_url: '/',
        categories: ['sports', 'marketing', 'productivity'],
        icons: [
          { src: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
          { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
        shortcuts: [
          { name: 'Studio', short_name: 'Studio', url: '/studio' },
          { name: 'Mediji', short_name: 'Mediji', url: '/media' },
          { name: 'Analitika', short_name: 'Analitika', url: '/analytics' },
        ],
        launch_handler: { client_mode: 'navigate-existing' },
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
        cleanupOutdatedCaches: true,
        // Exclude html from precache — index.html is always fetched from the
        // server (nginx sends no-cache headers) so every normal refresh shows
        // the latest deployed version.  Only cache JS/CSS (hashed, immutable).
        globPatterns: ['**/*.{js,css,ico,png,svg,woff,woff2}'],
        // Block the default NavigationRoute — let navigation requests go to the
        // network so nginx's try_files handles SPA routing with no-cache headers.
        navigateFallback: null as unknown as undefined,
        navigateFallbackDenylist: [/./],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /\/api\/v1\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'api-cache',
              expiration: { maxEntries: 150, maxAgeSeconds: 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ['recharts'],
          'dnd-kit': ['@dnd-kit/core', '@dnd-kit/sortable', '@dnd-kit/utilities'],
          vendor: ['react', 'react-dom', 'react-router-dom'],
        },
      },
    },
  },
  server: {
    host: true,
    port: Number(process.env.VITE_PORT || 3001),
    allowedHosts: ['shiftonezero.xyler.ai'],
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://localhost:8001',
        changeOrigin: true,
      },
      '/media': {
        target: process.env.VITE_API_URL || 'http://localhost:8001',
        changeOrigin: true,
      },
    },
  },
})
