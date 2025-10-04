import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  optimizeDeps: {
    include: [
      "react", 
      "react-dom", 
      "react-router",
      "@clerk/clerk-react",
      "convex/react",
      "convex/react-clerk",
      "framer-motion",
      "tesseract.js"
    ],
    exclude: [
      "pdfjs-dist"
    ]
  },
  ssr: {
    noExternal: ["@clerk/clerk-react", "convex"]
  }
});
