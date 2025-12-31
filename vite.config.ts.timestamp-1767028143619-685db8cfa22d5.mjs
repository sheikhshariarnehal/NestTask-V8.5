// vite.config.ts
import { defineConfig } from "file:///C:/Users/nehal/Desktop/NestTask-V8.5/node_modules/vite/dist/node/index.js";
import react from "file:///C:/Users/nehal/Desktop/NestTask-V8.5/node_modules/@vitejs/plugin-react/dist/index.mjs";
import { visualizer } from "file:///C:/Users/nehal/Desktop/NestTask-V8.5/node_modules/rollup-plugin-visualizer/dist/plugin/index.js";
import compression from "file:///C:/Users/nehal/Desktop/NestTask-V8.5/node_modules/vite-plugin-compression/dist/index.mjs";
import path from "path";
var __vite_injected_original_dirname = "C:\\Users\\nehal\\Desktop\\NestTask-V8.5";
var isCapacitorBuild = process.env.CAPACITOR_BUILD === "true";
var vite_config_default = defineConfig({
  resolve: {
    // Add aliases for better import paths
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    },
    // Force consistent extensions and improve module resolution
    extensions: [".mjs", ".js", ".ts", ".jsx", ".tsx", ".json"]
  },
  plugins: [
    react(),
    // Disable compression for Capacitor builds to avoid duplicate resources
    ...!isCapacitorBuild ? [
      compression({
        algorithm: "brotliCompress",
        ext: ".br"
      }),
      compression({
        algorithm: "gzip",
        ext: ".gz"
      })
    ] : [],
    visualizer({
      open: false,
      gzipSize: true,
      brotliSize: true
    })
  ],
  build: {
    // Enable minification and tree shaking
    minify: "terser",
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ["console.log", "console.debug", "console.info"],
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
    target: "es2018",
    reportCompressedSize: true,
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes("node_modules/react/") || id.includes("node_modules/react-dom/") || id.includes("node_modules/scheduler/")) {
            return "react-vendor";
          }
          if (id.includes("node_modules/date-fns/")) {
            return "date-utils";
          }
          if (id.includes("node_modules/@radix-ui/") || id.includes("node_modules/framer-motion/")) {
            return "ui-components";
          }
          if (id.includes("node_modules/@supabase/")) {
            return "supabase";
          }
          if (id.includes("node_modules/lucide-react/")) {
            return "icons";
          }
          if (id.includes("node_modules/recharts/") || id.includes("node_modules/d3/")) {
            return "charts";
          }
        },
        // Ensure proper file types and names
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name || "";
          if (info.endsWith(".css")) {
            return "assets/css/[name].[hash][extname]";
          }
          if (info.endsWith(".png") || info.endsWith(".jpg") || info.endsWith(".jpeg") || info.endsWith(".svg") || info.endsWith(".gif")) {
            return "assets/images/[name].[hash][extname]";
          }
          if (info.endsWith(".woff") || info.endsWith(".woff2") || info.endsWith(".ttf") || info.endsWith(".otf") || info.endsWith(".eot")) {
            return "assets/fonts/[name].[hash][extname]";
          }
          return "assets/[name].[hash][extname]";
        },
        // Optimize chunk names
        chunkFileNames: "assets/js/[name].[hash].js",
        entryFileNames: "assets/js/[name].[hash].js"
      }
    },
    // Enable source map optimization
    sourcemap: process.env.NODE_ENV !== "production",
    // Enable chunk size optimization
    chunkSizeWarningLimit: 1e3,
    // Add asset optimization
    assetsInlineLimit: 4096,
    cssCodeSplit: true,
    modulePreload: true
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "date-fns",
      "@radix-ui/react-dialog",
      "framer-motion",
      "react-router-dom",
      "recharts"
    ]
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
    strictPort: true
  },
  // Speed up first dev startup by caching
  cacheDir: "node_modules/.vite"
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCJDOlxcXFxVc2Vyc1xcXFxuZWhhbFxcXFxEZXNrdG9wXFxcXE5lc3RUYXNrLVY4LjVcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIkM6XFxcXFVzZXJzXFxcXG5laGFsXFxcXERlc2t0b3BcXFxcTmVzdFRhc2stVjguNVxcXFx2aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vQzovVXNlcnMvbmVoYWwvRGVza3RvcC9OZXN0VGFzay1WOC41L3ZpdGUuY29uZmlnLnRzXCI7aW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdCc7XHJcbmltcG9ydCB7IHZpc3VhbGl6ZXIgfSBmcm9tICdyb2xsdXAtcGx1Z2luLXZpc3VhbGl6ZXInO1xyXG5pbXBvcnQgY29tcHJlc3Npb24gZnJvbSAndml0ZS1wbHVnaW4tY29tcHJlc3Npb24nO1xyXG5pbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcclxuXHJcbi8vIERlZmluZSBhbGdvcml0aG0gdHlwZSB0byBhdm9pZCB0eXBlIGVycm9yc1xyXG50eXBlIENvbXByZXNzaW9uQWxnb3JpdGhtID0gJ2d6aXAnIHwgJ2Jyb3RsaUNvbXByZXNzJyB8ICdkZWZsYXRlJyB8ICdkZWZsYXRlUmF3JztcclxuXHJcbi8vIENoZWNrIGlmIGJ1aWxkaW5nIGZvciBDYXBhY2l0b3IgKGRpc2FibGUgY29tcHJlc3Npb24gZm9yIG1vYmlsZSlcclxuY29uc3QgaXNDYXBhY2l0b3JCdWlsZCA9IHByb2Nlc3MuZW52LkNBUEFDSVRPUl9CVUlMRCA9PT0gJ3RydWUnO1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICByZXNvbHZlOiB7XHJcbiAgICAvLyBBZGQgYWxpYXNlcyBmb3IgYmV0dGVyIGltcG9ydCBwYXRoc1xyXG4gICAgYWxpYXM6IHtcclxuICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcclxuICAgIH0sXHJcbiAgICAvLyBGb3JjZSBjb25zaXN0ZW50IGV4dGVuc2lvbnMgYW5kIGltcHJvdmUgbW9kdWxlIHJlc29sdXRpb25cclxuICAgIGV4dGVuc2lvbnM6IFsnLm1qcycsICcuanMnLCAnLnRzJywgJy5qc3gnLCAnLnRzeCcsICcuanNvbiddXHJcbiAgfSxcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgLy8gRGlzYWJsZSBjb21wcmVzc2lvbiBmb3IgQ2FwYWNpdG9yIGJ1aWxkcyB0byBhdm9pZCBkdXBsaWNhdGUgcmVzb3VyY2VzXHJcbiAgICAuLi4oIWlzQ2FwYWNpdG9yQnVpbGQgPyBbXHJcbiAgICAgIGNvbXByZXNzaW9uKHtcclxuICAgICAgICBhbGdvcml0aG06ICdicm90bGlDb21wcmVzcycgYXMgQ29tcHJlc3Npb25BbGdvcml0aG0sXHJcbiAgICAgICAgZXh0OiAnLmJyJ1xyXG4gICAgICB9KSxcclxuICAgICAgY29tcHJlc3Npb24oe1xyXG4gICAgICAgIGFsZ29yaXRobTogJ2d6aXAnIGFzIENvbXByZXNzaW9uQWxnb3JpdGhtLFxyXG4gICAgICAgIGV4dDogJy5neidcclxuICAgICAgfSlcclxuICAgIF0gOiBbXSksXHJcbiAgICB2aXN1YWxpemVyKHtcclxuICAgICAgb3BlbjogZmFsc2UsXHJcbiAgICAgIGd6aXBTaXplOiB0cnVlLFxyXG4gICAgICBicm90bGlTaXplOiB0cnVlXHJcbiAgICB9KVxyXG4gIF0sXHJcbiAgYnVpbGQ6IHtcclxuICAgIC8vIEVuYWJsZSBtaW5pZmljYXRpb24gYW5kIHRyZWUgc2hha2luZ1xyXG4gICAgbWluaWZ5OiAndGVyc2VyJyxcclxuICAgIHRlcnNlck9wdGlvbnM6IHtcclxuICAgICAgY29tcHJlc3M6IHtcclxuICAgICAgICBkcm9wX2NvbnNvbGU6IHRydWUsXHJcbiAgICAgICAgZHJvcF9kZWJ1Z2dlcjogdHJ1ZSxcclxuICAgICAgICBwdXJlX2Z1bmNzOiBbJ2NvbnNvbGUubG9nJywgJ2NvbnNvbGUuZGVidWcnLCAnY29uc29sZS5pbmZvJ10sXHJcbiAgICAgICAgcGFzc2VzOiAyXHJcbiAgICAgIH0sXHJcbiAgICAgIG1hbmdsZToge1xyXG4gICAgICAgIHNhZmFyaTEwOiB0cnVlXHJcbiAgICAgIH0sXHJcbiAgICAgIGZvcm1hdDoge1xyXG4gICAgICAgIGNvbW1lbnRzOiBmYWxzZVxyXG4gICAgICB9XHJcbiAgICB9LFxyXG4gICAgY3NzTWluaWZ5OiB0cnVlLFxyXG4gICAgdGFyZ2V0OiAnZXMyMDE4JyxcclxuICAgIHJlcG9ydENvbXByZXNzZWRTaXplOiB0cnVlLFxyXG4gICAgcm9sbHVwT3B0aW9uczoge1xyXG4gICAgICBvdXRwdXQ6IHtcclxuICAgICAgICBtYW51YWxDaHVua3M6IChpZCkgPT4ge1xyXG4gICAgICAgICAgLy8gQ29yZSBSZWFjdCBkZXBlbmRlbmNpZXNcclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL3JlYWN0LycpIHx8IFxyXG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvcmVhY3QtZG9tLycpIHx8IFxyXG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvc2NoZWR1bGVyLycpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAncmVhY3QtdmVuZG9yJztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gRGF0ZSBoYW5kbGluZ1xyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvZGF0ZS1mbnMvJykpIHtcclxuICAgICAgICAgICAgcmV0dXJuICdkYXRlLXV0aWxzJztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgLy8gVUkgY29tcG9uZW50IGxpYnJhcmllc1xyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQHJhZGl4LXVpLycpIHx8IFxyXG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvZnJhbWVyLW1vdGlvbi8nKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gJ3VpLWNvbXBvbmVudHMnO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBTdXBhYmFzZVxyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvQHN1cGFiYXNlLycpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAnc3VwYWJhc2UnO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBJY29uc1xyXG4gICAgICAgICAgaWYgKGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvbHVjaWRlLXJlYWN0LycpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAnaWNvbnMnO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICAvLyBDaGFydHNcclxuICAgICAgICAgIGlmIChpZC5pbmNsdWRlcygnbm9kZV9tb2R1bGVzL3JlY2hhcnRzLycpIHx8IFxyXG4gICAgICAgICAgICAgIGlkLmluY2x1ZGVzKCdub2RlX21vZHVsZXMvZDMvJykpIHtcclxuICAgICAgICAgICAgcmV0dXJuICdjaGFydHMnO1xyXG4gICAgICAgICAgfVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgLy8gRW5zdXJlIHByb3BlciBmaWxlIHR5cGVzIGFuZCBuYW1lc1xyXG4gICAgICAgIGFzc2V0RmlsZU5hbWVzOiAoYXNzZXRJbmZvKSA9PiB7XHJcbiAgICAgICAgICBjb25zdCBpbmZvID0gYXNzZXRJbmZvLm5hbWUgfHwgJyc7XHJcbiAgICAgICAgICBpZiAoaW5mby5lbmRzV2l0aCgnLmNzcycpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiAnYXNzZXRzL2Nzcy9bbmFtZV0uW2hhc2hdW2V4dG5hbWVdJztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIGlmIChpbmZvLmVuZHNXaXRoKCcucG5nJykgfHwgaW5mby5lbmRzV2l0aCgnLmpwZycpIHx8IFxyXG4gICAgICAgICAgICAgIGluZm8uZW5kc1dpdGgoJy5qcGVnJykgfHwgaW5mby5lbmRzV2l0aCgnLnN2ZycpIHx8IFxyXG4gICAgICAgICAgICAgIGluZm8uZW5kc1dpdGgoJy5naWYnKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gJ2Fzc2V0cy9pbWFnZXMvW25hbWVdLltoYXNoXVtleHRuYW1lXSc7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgICBpZiAoaW5mby5lbmRzV2l0aCgnLndvZmYnKSB8fCBpbmZvLmVuZHNXaXRoKCcud29mZjInKSB8fCBcclxuICAgICAgICAgICAgICBpbmZvLmVuZHNXaXRoKCcudHRmJykgfHwgaW5mby5lbmRzV2l0aCgnLm90ZicpIHx8IFxyXG4gICAgICAgICAgICAgIGluZm8uZW5kc1dpdGgoJy5lb3QnKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gJ2Fzc2V0cy9mb250cy9bbmFtZV0uW2hhc2hdW2V4dG5hbWVdJztcclxuICAgICAgICAgIH1cclxuICAgICAgICAgIHJldHVybiAnYXNzZXRzL1tuYW1lXS5baGFzaF1bZXh0bmFtZV0nO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgLy8gT3B0aW1pemUgY2h1bmsgbmFtZXNcclxuICAgICAgICBjaHVua0ZpbGVOYW1lczogJ2Fzc2V0cy9qcy9bbmFtZV0uW2hhc2hdLmpzJyxcclxuICAgICAgICBlbnRyeUZpbGVOYW1lczogJ2Fzc2V0cy9qcy9bbmFtZV0uW2hhc2hdLmpzJyxcclxuICAgICAgfVxyXG4gICAgfSxcclxuICAgIC8vIEVuYWJsZSBzb3VyY2UgbWFwIG9wdGltaXphdGlvblxyXG4gICAgc291cmNlbWFwOiBwcm9jZXNzLmVudi5OT0RFX0VOViAhPT0gJ3Byb2R1Y3Rpb24nLFxyXG4gICAgLy8gRW5hYmxlIGNodW5rIHNpemUgb3B0aW1pemF0aW9uXHJcbiAgICBjaHVua1NpemVXYXJuaW5nTGltaXQ6IDEwMDAsXHJcbiAgICAvLyBBZGQgYXNzZXQgb3B0aW1pemF0aW9uXHJcbiAgICBhc3NldHNJbmxpbmVMaW1pdDogNDA5NixcclxuICAgIGNzc0NvZGVTcGxpdDogdHJ1ZSxcclxuICAgIG1vZHVsZVByZWxvYWQ6IHRydWVcclxuICB9LFxyXG4gIG9wdGltaXplRGVwczoge1xyXG4gICAgaW5jbHVkZTogW1xyXG4gICAgICAncmVhY3QnLFxyXG4gICAgICAncmVhY3QtZG9tJyxcclxuICAgICAgJ2RhdGUtZm5zJyxcclxuICAgICAgJ0ByYWRpeC11aS9yZWFjdC1kaWFsb2cnLFxyXG4gICAgICAnZnJhbWVyLW1vdGlvbicsXHJcbiAgICAgICdyZWFjdC1yb3V0ZXItZG9tJyxcclxuICAgICAgJ3JlY2hhcnRzJ1xyXG4gICAgXSxcclxuICAgIC8vIERvbid0IGV4Y2x1ZGUgVmVyY2VsIEFuYWx5dGljcyBhcyBpdCBjYXVzZXMgNDA0IGVycm9ycyBpbiBkZXYgbW9kZVxyXG4gICAgLy8gZXhjbHVkZTogWydAdmVyY2VsL2FuYWx5dGljcyddXHJcbiAgfSxcclxuICAvLyBJbXByb3ZlIGRldiBzZXJ2ZXIgcGVyZm9ybWFuY2VcclxuICBzZXJ2ZXI6IHtcclxuICAgIGhtcjoge1xyXG4gICAgICBvdmVybGF5OiBmYWxzZVxyXG4gICAgfSxcclxuICAgIHdhdGNoOiB7XHJcbiAgICAgIHVzZVBvbGxpbmc6IGZhbHNlXHJcbiAgICB9LFxyXG4gICAgY29yczogdHJ1ZSxcclxuICAgIGhlYWRlcnM6IHtcclxuICAgICAgXCJBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW5cIjogXCIqXCIsXHJcbiAgICAgIFwiQ3Jvc3MtT3JpZ2luLUVtYmVkZGVyLVBvbGljeVwiOiBcImNyZWRlbnRpYWxsZXNzXCIsXHJcbiAgICAgIFwiQ3Jvc3MtT3JpZ2luLU9wZW5lci1Qb2xpY3lcIjogXCJzYW1lLW9yaWdpblwiLFxyXG4gICAgICBcIkNyb3NzLU9yaWdpbi1SZXNvdXJjZS1Qb2xpY3lcIjogXCJjcm9zcy1vcmlnaW5cIlxyXG4gICAgfVxyXG4gIH0sXHJcbiAgLy8gSW1wcm92ZSBwcmV2aWV3IHNlcnZlciBwZXJmb3JtYW5jZVxyXG4gIHByZXZpZXc6IHtcclxuICAgIHBvcnQ6IDQxNzMsXHJcbiAgICBzdHJpY3RQb3J0OiB0cnVlLFxyXG4gIH0sXHJcbiAgLy8gU3BlZWQgdXAgZmlyc3QgZGV2IHN0YXJ0dXAgYnkgY2FjaGluZ1xyXG4gIGNhY2hlRGlyOiAnbm9kZV9tb2R1bGVzLy52aXRlJ1xyXG59KTsiXSwKICAibWFwcGluZ3MiOiAiO0FBQXdTLFNBQVMsb0JBQW9CO0FBQ3JVLE9BQU8sV0FBVztBQUNsQixTQUFTLGtCQUFrQjtBQUMzQixPQUFPLGlCQUFpQjtBQUN4QixPQUFPLFVBQVU7QUFKakIsSUFBTSxtQ0FBbUM7QUFVekMsSUFBTSxtQkFBbUIsUUFBUSxJQUFJLG9CQUFvQjtBQUd6RCxJQUFPLHNCQUFRLGFBQWE7QUFBQSxFQUMxQixTQUFTO0FBQUE7QUFBQSxJQUVQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLGtDQUFXLE9BQU87QUFBQSxJQUN0QztBQUFBO0FBQUEsSUFFQSxZQUFZLENBQUMsUUFBUSxPQUFPLE9BQU8sUUFBUSxRQUFRLE9BQU87QUFBQSxFQUM1RDtBQUFBLEVBQ0EsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBO0FBQUEsSUFFTixHQUFJLENBQUMsbUJBQW1CO0FBQUEsTUFDdEIsWUFBWTtBQUFBLFFBQ1YsV0FBVztBQUFBLFFBQ1gsS0FBSztBQUFBLE1BQ1AsQ0FBQztBQUFBLE1BQ0QsWUFBWTtBQUFBLFFBQ1YsV0FBVztBQUFBLFFBQ1gsS0FBSztBQUFBLE1BQ1AsQ0FBQztBQUFBLElB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
