import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
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
