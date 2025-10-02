import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 9090,
  },
  css: {
    postcss: './postcss.config.js',
  },
  build: {
    // Ensure external dependencies are bundled for Tauri
    rollupOptions: {
      external: [],
    },
  },
});
