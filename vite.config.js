import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // Injects <link rel="manifest"> + theme-color + SW registration automatically.
      // Manifest is plugin-owned (single source of truth).
      // Icons live under public/icons/ (generated from "resonance icon.png").
      includeAssets: ['icons/favicon-32x32.png', 'icons/apple-touch-icon-180x180.png'],
      manifest: {
        name: 'Resonance 2026',
        short_name: 'Resonance',
        description: 'Resonance — Inter-house competition management dashboard',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait-primary',
        background_color: '#F7F0DF',
        theme_color: '#F7F0DF',
        icons: [
          {
            src: '/icons/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/icons/pwa-maskable-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // SPA: serve index.html for navigations so /dashboard/* etc. work offline from cache.
        navigateFallback: '/index.html',
        globPatterns: ['**/*.{js,css,html,woff2}'],
        // Installable-only scope: precache app shell only.
        // No runtime API caching — dashboard data stays online-only by design.
        // (Full offline reads/writes would be a separate follow-up.)
        cleanupOutdatedCaches: true,
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-select', '@radix-ui/react-tabs', '@radix-ui/react-avatar', '@radix-ui/react-checkbox', '@radix-ui/react-collapsible', '@radix-ui/react-label', '@radix-ui/react-popover', '@radix-ui/react-separator', '@radix-ui/react-slot', '@radix-ui/react-alert-dialog'],
          'vendor-utils': ['clsx', 'tailwind-merge', 'class-variance-authority', 'lucide-react', 'framer-motion', 'recharts', 'papaparse', 'xlsx'],
          'vendor-hooks': ['react-hot-toast'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
})
