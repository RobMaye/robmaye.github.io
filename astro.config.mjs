// @ts-check
import { defineConfig } from "astro/config";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  site: "https://robertmaye.co.uk",
  output: "static",
  vite: {
    plugins: [tailwindcss()],
  },
});
