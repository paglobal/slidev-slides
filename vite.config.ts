import { defineConfig } from "vite";

export default defineConfig({
  slidev: {
    vue: {
      template: {
        compilerOptions: {
          isCustomElement: (tag) => tag.startsWith("sl-"),
        },
      },
    },
  },
});
