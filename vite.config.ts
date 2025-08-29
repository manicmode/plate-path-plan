import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  define: {
    // Development debug flags - set to 'false' for production
    ...(mode === 'development' && {
      'import.meta.env.VITE_HEALTH_DEBUG_SAFE': '"true"',
      'import.meta.env.VITE_DEBUG_PERF': '"true"'
    })
  }
}));
