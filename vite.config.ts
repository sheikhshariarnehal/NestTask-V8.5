import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// Define algorithm type to avoid type errors
type CompressionAlgorithm = 'gzip' | 'brotliCompress' | 'deflate' | 'deflateRaw';

// Check if building for Capacitor (disable compression for mobile)
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';

// IMPORTANT: Manual chunking is DISABLED for Capacitor builds
// It causes circular dependency issues ("Cannot access 'X' before initialization")
// in Android WebView due to unpredictable chunk loading order.
// Vite's automatic chunking is safer for Capacitor.
const useManualChunks = false;

// https://vitejs.dev/config/
export default defineConfig({
  resolve: {
    // Add aliases for better import paths
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
    // Force consistent extensions and improve module resolution
    extensions: ['.mjs', '.js', '.ts', '.jsx', '.tsx', '.json']
  },
  plugins: [
    react(),
    // PWA Plugin Configuration - Disabled for Capacitor builds (native apps don't need PWA)
    ...(!isCapacitorBuild ? [VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/icon-192x192.png', 'icons/icon-512x512.png', 'icons/favicon.svg'],
      manifest: {
        name: 'NestTask',
        short_name: 'NestTask',
        description: 'Smart task management for teams and individuals',
        theme_color: '#0284c7',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        categories: ['productivity', 'utilities'],
        icons: [
          {
            src: '/icons/icon-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: '/icons/icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ],
        screenshots: [
          {
            src: '/icons/add-task.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'Add new tasks'
          },
          {
            src: '/icons/view-tasks.png',
            sizes: '1080x1920',
            type: 'image/png',
            form_factor: 'narrow',
            label: 'View your tasks'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2,woff,ttf}'],
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'gstatic-fonts-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 365 days
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /^https:\/\/.*\.supabase\.co\/.*/i,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'supabase-api-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 // 1 hour
              },
              networkTimeoutSeconds: 10,
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 100,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          }
        ]
      },
      devOptions: {
        enabled: true,
        type: 'module',
        navigateFallback: 'index.html',
        suppressWarnings: false // Show workbox warnings for debugging
      }
    })] : []),
    // Disable compression for Capacitor builds to avoid duplicate resources
    ...(!isCapacitorBuild ? [
      compression({
        algorithm: 'brotliCompress' as CompressionAlgorithm,
        ext: '.br'
      }),
      compression({
        algorithm: 'gzip' as CompressionAlgorithm,
        ext: '.gz'
      })
    ] : []),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true
    })
  ],
  build: {
    // For Capacitor, prefer maximum runtime compatibility over aggressive minification.
    // (Prevents rare TDZ/circular-init crashes like "Cannot access 'E' before initialization" in WebView.)
    minify: isCapacitorBuild ? 'esbuild' : 'terser',
    terserOptions: isCapacitorBuild ? undefined : {
      compress: {
        drop_console: false,  // Keep console logs for debugging on Vercel
        drop_debugger: true,
        passes: 2
      },
      mangle: {
        safari10: true
      },
      format: {
        comments: false
      }
    },
    cssMinify: true,
    target: 'es2018',
    reportCompressedSize: true,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Smart manual chunking for Capacitor builds to optimize loading
        // Splits large vendor libraries for better caching and parallel loading
        manualChunks: useManualChunks ? (id: string) => {
          // Core React - highest priority, smallest chunk
          if (id.includes('node_modules/react-dom') || 
              id.includes('node_modules/react/') ||
              id.includes('node_modules/scheduler')) {
            return 'vendor-react';
          }
          
          // Router - needed early for navigation
          if (id.includes('node_modules/react-router')) {
            return 'vendor-router';
          }
          
          // Capacitor plugins - essential for native functionality
          if (id.includes('node_modules/@capacitor/')) {
            return 'vendor-capacitor';
          }
          
          // Supabase client - needed for auth
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase';
          }
          
          // Ionic framework - large, can load after initial paint
          if (id.includes('node_modules/@ionic/') || 
              id.includes('node_modules/ionicons')) {
            return 'vendor-ionic';
          }
          
          // Lucide icons - large bundle, lazy load
          if (id.includes('node_modules/lucide-react')) {
            return 'vendor-icons';
          }
          
          // Charts libraries - only needed for specific pages
          if (id.includes('node_modules/recharts') || 
              id.includes('node_modules/chart.js') ||
              id.includes('node_modules/react-chartjs') ||
              id.includes('node_modules/d3-')) {
            return 'vendor-charts';
          }
          
          // Animation library - can be deferred
          if (id.includes('node_modules/framer-motion')) {
            return 'vendor-animation';
          }
          
          // Radix UI components - used throughout the app
          if (id.includes('node_modules/@radix-ui/')) {
            return 'vendor-radix';
          }
          
          // DnD Kit - only needed for specific features
          if (id.includes('node_modules/@dnd-kit/')) {
            return 'vendor-dnd';
          }
          
          // Date utilities
          if (id.includes('node_modules/date-fns')) {
            return 'vendor-date';
          }
          
          // All other vendor modules
          if (id.includes('node_modules/')) {
            return 'vendor-other';
          }
          
          return undefined;
        } : undefined,
        // Ensure proper file types and names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name || '';
          if (info.endsWith('.css')) {
            return 'assets/css/[name].[hash][extname]';
          }
          if (info.endsWith('.png') || info.endsWith('.jpg') || 
              info.endsWith('.jpeg') || info.endsWith('.svg') || 
              info.endsWith('.gif')) {
            return 'assets/images/[name].[hash][extname]';
          }
          if (info.endsWith('.woff') || info.endsWith('.woff2') || 
              info.endsWith('.ttf') || info.endsWith('.otf') || 
              info.endsWith('.eot')) {
            return 'assets/fonts/[name].[hash][extname]';
          }
          return 'assets/[name].[hash][extname]';
        },
        // Optimize chunk names - ensure all output files have .js extension
        chunkFileNames: 'assets/js/[name].[hash].js',
        // Force .js extension for entry files (fixes Capacitor MIME type issues with .tsx)
        entryFileNames: (chunkInfo) => {
          // Remove any .tsx/.ts extension from the name and always use .js
          const name = chunkInfo.name.replace(/\.(tsx?|jsx?)$/, '');
          return `assets/js/${name}.[hash].js`;
        },
      }
    },
    // Enable source map optimization
    sourcemap: process.env.NODE_ENV !== 'production',
    // Add asset optimization
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    modulePreload: true
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-dom/client',
      'react-router-dom',
      'date-fns',
      '@ionic/react',
      '@supabase/supabase-js',
      'lucide-react',
      'framer-motion',
      '@radix-ui/react-dialog',
      '@capacitor/core',
      '@capacitor/app',
      '@capacitor/network',
      '@capacitor/status-bar'
    ],
    // Force pre-bundling of these dependencies for faster cold starts
    esbuildOptions: {
      target: 'es2020',
    }
    // Don't exclude Vercel Analytics as it causes 404 errors in dev mode
    // exclude: ['@vercel/analytics']
  },
  // Improve dev server performance
  server: {
    hmr: {
      overlay: false
    },
    watch: {
      usePolling: false
    },
    cors: true,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cross-Origin-Embedder-Policy": "credentialless",
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Resource-Policy": "cross-origin",
      // Enable compression hints for the browser
      "Accept-Encoding": "gzip, deflate, br"
    },
    // Enable compression for faster dev server responses
    // Note: Full gzip/brotli compression is only applied in production builds
    // For dev, browsers handle this via Accept-Encoding
  },
  // Improve preview server performance
  preview: {
    port: 4173,
    strictPort: true,
  },
  // Speed up first dev startup by caching
  cacheDir: 'node_modules/.vite'
});