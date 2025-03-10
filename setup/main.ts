import { defineAppSetup } from "@slidev/types";
import { useDarkMode } from "@slidev/client";
import { watchEffect } from "vue";

export default defineAppSetup(() => {
  const { isDark } = useDarkMode();

  watchEffect(() => {
    if (isDark.value) {
      document.documentElement.classList.add("sl-theme-dark");
    } else {
      document.documentElement.classList.remove("sl-theme-dark");
    }
  });
});
