import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Relative base, so dist/ works from any folder or sub-path (GitHub Pages, Netlify, a plain file server).
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
    rollupOptions: {
      output: { manualChunks: { three: ['three'], r3f: ['@react-three/fiber', '@react-three/postprocessing', 'postprocessing'] } },
    },
  },
});
