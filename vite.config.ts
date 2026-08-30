import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  worker: { format: 'es' },
  server: { port: 5173, host: true },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        // Three.js is ~600 kB of the bundle and changes only when the
        // dependency is upgraded; the app code changes constantly. Splitting
        // them means an edit to the solver does not invalidate the renderer in
        // everyone's cache, and it is what took the entry chunk back under
        // Vite's 500 kB warning threshold.
        manualChunks: {
          three: ['three'],
          react: ['react', 'react-dom'],
        },
      },
    },
  },
});
