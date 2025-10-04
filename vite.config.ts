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
      "tesseract.js",
      "posthog-js"
    ],
    exclude: [
      "pdfjs-dist"
    ]
  },
  ssr: {
    noExternal: ["@clerk/clerk-react", "convex", "posthog-js", "posthog-js/react"]
  },
  server: {
    headers: {
      // Allow PostHog scripts and assets
      'Content-Security-Policy': [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://us.i.posthog.com https://us-assets.i.posthog.com",
        "connect-src 'self' https://us.i.posthog.com https://us-assets.i.posthog.com wss: ws:",
        "img-src 'self' data: https:",
        "style-src 'self' 'unsafe-inline'",
        "font-src 'self' data:",
      ].join('; '),
    },
  },
});
