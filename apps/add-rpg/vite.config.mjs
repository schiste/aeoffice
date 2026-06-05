import { fileURLToPath } from "node:url"

import { defineConfig } from "vite"

const root = fileURLToPath(new URL("../..", import.meta.url))
const packageSource = (packagePath) =>
  fileURLToPath(new URL(`../../packages/${packagePath}/src`, import.meta.url))

export default defineConfig({
  base: "/app/",
  resolve: {
    alias: {
      "@aedventure/add-domain": packageSource("add-domain"),
      "@aedventure/game-assets": packageSource("game-assets"),
      "@aedventure/game-renderer-phaser": packageSource("game-renderer-phaser"),
      "@aedventure/game-topology": packageSource("game-topology"),
      "@aedventure/game-visibility": packageSource("game-visibility"),
      "@aedventure/game-world": packageSource("game-world"),
    },
  },
  build: {
    outDir: "dist-app",
    emptyOutDir: true,
  },
  server: {
    host: "127.0.0.1",
    port: 5176,
    fs: {
      allow: [root],
    },
  },
})
