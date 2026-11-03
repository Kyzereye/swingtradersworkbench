import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        // API_TARGET lets the e2e tests point at the test backend.
        target: process.env.API_TARGET || "http://localhost:3001",
        changeOrigin: true,
      },
    },
  },
});
