import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';

// Define algorithm type to avoid type errors
type CompressionAlgorithm = 'gzip' | 'brotliCompress' | 'deflate' | 'deflateRaw';

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
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'icons/*.png',
        'manifest.json',
        'offline.html'
      ],
      manifest: false, // Use manual manifest.json in public folder
      workbox: {
        // Clean URLs for SPA
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: true,
        
        // Assets to precache
        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,woff2}'
        ],
        
        // Ignore specific patterns
        globIgnores: [
          '**/node_modules/**',
          'sw.js',
          'workbox-*.js'
        ],
        
        // Runtime caching strategies
        runtimeCaching: [
          // Google Fonts stylesheets
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          // Google Fonts webfonts
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 20,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },
          // Static assets
          {
            urlPattern: /\.(?:png|jpg|jpeg|svg|gif|webp|ico)$/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'images-cache',
              expiration: {
                maxEntries: 50,
                maxAgeSeconds: 60 * 60 * 24 * 30 // 30 days
              }
            }
          },
          // JS/CSS assets
          {
            urlPattern: /\.(?:js|css)$/i,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'static-resources',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 7 // 7 days
              }
            }
          }
        ],
        
        // Navigation fallback
        navigateFallback: '/index.html',
        navigateFallbackDenylist: [
          /^\/api\//,
          /^\/auth/,
          /^\/_vercel/
        ]
      },
      devOptions: {
        enabled: false // Disable in development for faster builds
      }
    }),
    compression({
      algorithm: 'brotliCompress' as CompressionAlgorithm,
      ext: '.br'
    }),
    compression({
      algorithm: 'gzip' as CompressionAlgorithm,
      ext: '.gz'
    }),
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true
    })
  ],
  build: {
    // Enable minification and tree shaking
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.debug', 'console.info'],
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
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // Core React dependencies
          if (id.includes('node_modules/react/') || 
              id.includes('node_modules/react-dom/') || 
              id.includes('node_modules/scheduler/')) {
            return 'react-vendor';
          }
          
          // Date handling
          if (id.includes('node_modules/date-fns/')) {
            return 'date-utils';
          }
          
          // UI component libraries
          if (id.includes('node_modules/@radix-ui/') || 
              id.includes('node_modules/framer-motion/')) {
            return 'ui-components';
          }
          
          // Supabase
          if (id.includes('node_modules/@supabase/')) {
            return 'supabase';
          }
          
          // Icons
          if (id.includes('node_modules/lucide-react/')) {
            return 'icons';
          }
          
          // Charts
          if (id.includes('node_modules/recharts/') || 
              id.includes('node_modules/d3/')) {
            return 'charts';
          }
        },
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
        // Optimize chunk names
        chunkFileNames: 'assets/js/[name].[hash].js',
        entryFileNames: 'assets/js/[name].[hash].js',
      }
    },
    // Enable source map optimization
    sourcemap: process.env.NODE_ENV !== 'production',
    // Enable chunk size optimization
    chunkSizeWarningLimit: 1000,
    // Add asset optimization
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    modulePreload: true
  },
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'date-fns',
      '@radix-ui/react-dialog',
      'framer-motion',
      'react-router-dom',
      'recharts'
    ],
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
      "Cross-Origin-Resource-Policy": "cross-origin"
    }
  },
  // Improve preview server performance
  preview: {
    port: 4173,
    strictPort: true,
  },
  // Speed up first dev startup by caching
  cacheDir: 'node_modules/.vite'
});