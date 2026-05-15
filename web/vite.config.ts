import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: process.env.GITHUB_PAGES ? "/via-token-advisor/" : "/",
  plugins: [react()],
  server: {
    fs: {
      allow: [".."],
    },
  },
  resolve: {
    alias: {
      "@data": "../data/generated",
    },
  },
});
