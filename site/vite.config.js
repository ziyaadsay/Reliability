import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Builds the single-file dashboard (App.jsx) into dist/, which the GitHub
// Actions workflow pushes to Gizmos (relstrat.telus.gizmos.run).
export default defineConfig({
  plugins: [react()],
  base: "./",
  build: { outDir: "dist", emptyOutDir: true }
});
