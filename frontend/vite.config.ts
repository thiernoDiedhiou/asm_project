import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 3000,
    host: true, // Accepte tous les hostnames (*.localhost, 0.0.0.0...)
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: false, // Garde le Host original (ex: boucotteauto.localhost)
        // → le backend peut résoudre le tenant depuis req.hostname en dev subdomaine
      },
      '/uploads': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: false,
      },
    },
  },
});
