import path from "path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: "./src/test/setup.ts",
    css: true,
    include: ["src/**/*.test.{ts,tsx}"],
    coverage: {
      provider: "v8",
      include: [
        "src/lib/utils.ts",
        "src/lib/api/client.ts",
        "src/lib/api/follows.ts",
        "src/routes/RequireAuth.tsx",
        "src/routes/RedirectIfAuthed.tsx",
      ],
      thresholds: {
        lines: 80,
        functions: 85,
        branches: 60,
        statements: 80,
      },
    },
  },
});
