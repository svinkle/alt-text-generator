import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: process.env.VITE_API_URL || 'http://127.0.0.1:5001/alt-text-generator-app/us-central1',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/generate-alt/, '/generateAlt'),
      },
    },
  },
});
