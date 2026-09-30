import { defineConfig } from 'vite';

/** Builds the MV3 service worker as a single self-contained IIFE. */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'chrome114',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      input: 'src/background/serviceWorker.ts',
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'background.js',
      },
    },
  },
});
