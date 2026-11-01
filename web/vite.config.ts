import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  build: {
    rollupOptions: {
      output: {
        // route-level code splitting happens via React.lazy; keep vendor chunk separate
        manualChunks: { vendor: ["react", "react-dom", "react-router-dom"] },
      },
    },
  },
  test: {
    include: ["tests/**/*.test.ts"],
  },
});
