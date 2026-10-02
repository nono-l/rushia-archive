import { defineConfig, type Plugin } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { nitro } from "nitro/vite";
import path from "node:path";
import { isPageSource, stampPageDates } from "./scripts/page-dates.mjs";

function pageDatesPlugin(): Plugin {
  return {
    name: "page-dates",
    buildStart() {
      stampPageDates();
    },
    configureServer(server) {
      const on = (file: string) => {
        if (isPageSource(file)) stampPageDates();
      };
      server.watcher.on("change", on);
      server.watcher.on("add", on);
      server.watcher.on("unlink", on);
    },
  };
}

export default defineConfig(({ command }) => ({
  server: { host: "0.0.0.0", port: 8080, strictPort: true },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  plugins: [
    pageDatesPlugin(),
    tailwindcss(),
    tanstackStart(),
    ...(command === "build" ? [nitro({ preset: "vercel" })] : []),
    viteReact(),
  ],
}));
