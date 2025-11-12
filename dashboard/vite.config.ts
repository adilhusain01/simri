import { defineConfig } from 'vite'
import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [viteReact(), tailwindcss()],

  // Test configuration for Vitest
  test: {
    globals: true,
    environment: 'jsdom',
  },

  // Path resolution
  resolve: {
    alias: {
      '@': path.resolve(process.cwd(), './src'),
    },
  },

  // Build configuration with optimizations
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 1000,
    sourcemap: false, // Disable sourcemaps for production
    minify: 'esbuild', // Use esbuild for faster builds

    rollupOptions: {
      output: {
        // Optimized chunk splitting for better caching
        manualChunks: {
          // Core React libraries
          'react-vendor': ['react', 'react-dom'],

          // TanStack ecosystem
          'router-vendor': ['@tanstack/react-router', '@tanstack/react-query'],

          // UI component libraries (Radix UI)
          'ui-vendor': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-select',
            '@radix-ui/react-popover',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-label',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-slot',
            '@radix-ui/react-switch'
          ],

          // Animation libraries
          'animation-vendor': ['framer-motion'],

          // Date handling libraries
          'date-vendor': ['date-fns', 'react-datepicker'],

          // Form handling libraries
          'form-vendor': ['react-hook-form', '@hookform/resolvers', 'zod'],

          // Icon libraries
          'icon-vendor': ['lucide-react'],

          // State management
          'state-vendor': ['zustand', '@tanstack/react-store', '@tanstack/store'],

          // Utilities
          'utils-vendor': ['axios', 'class-variance-authority', 'clsx', 'tailwind-merge', 'sonner']
        },

        // Clean file naming
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash].[ext]',
      }
    }
  },

  // Development server configuration
  server: {
    port: 3001,
    host: true,
    open: false,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },

  // Preview server configuration
  preview: {
    port: 3001,
    host: true,
  },
})
