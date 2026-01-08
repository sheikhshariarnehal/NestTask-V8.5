import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression';
import path from 'path';

// Define algorithm type to avoid type errors
type CompressionAlgorithm = 'gzip' | 'brotliCompress' | 'deflate' | 'deflateRaw';

// Check if building for Capacitor (disable compression for mobile)
const isCapacitorBuild = process.env.CAPACITOR_BUILD === 'true';

// Disable manual chunking for web to avoid TDZ errors
// Vite's automatic chunking is safer and prevents circular dependency issues
const useManualChunks = isCapacitorBuild ? false : false; // Disabled for all builds

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
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // Disable manual chunking to prevent TDZ errors and circular dependency issues
        // Vite's automatic chunking handles dependencies correctly
        manualChunks: useManualChunks ? (id) => {
          // This code path is currently disabled
          // Manual chunking can cause "Cannot access before initialization" errors
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