import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        navigateFallback: "/index.html",
        runtimeCaching: [
          {
            urlPattern: /^\/api\/.*/i,
            handler: "NetworkOnly",
          },
        ],
      },
      manifest: {
        name: "Scratch Web",
        short_name: "Scratch",
        description: "Mobile-first web companion for Scratch notes",
        theme_color: "#161413",
        background_color: "#161413",
        display: "standalone",
        scope: "/",
        start_url: "/",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
    }),
  ],
  server: {
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: false,
      },
      "/health": {
        target: "http://127.0.0.1:3000",
        changeOrigin: false,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("/node_modules/")) return;
          if (id.includes("beautiful-mermaid") || id.includes("elkjs")) {
            return "vendor-mermaid";
          }
          if (id.includes("katex")) {
            return "vendor-katex";
          }
          if (id.includes("highlight.js") || id.includes("lowlight")) {
            return "vendor-highlight";
          }
          if (id.includes("marked") || id.includes("dompurify")) {
            return "vendor-markdown";
          }
        },
      },
    },
    chunkSizeWarningLimit: 1700,
  },
});
