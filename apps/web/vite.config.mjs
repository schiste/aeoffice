import { defineConfig } from "vite"

export default defineConfig({
  base: "/app/",
  build: {
    outDir: "dist-app",
    emptyOutDir: true,
  },
  server: {
    host: "127.0.0.1",
    port: 5173,
  },
})
