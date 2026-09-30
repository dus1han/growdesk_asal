import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

/** Builds the content script (React toolbar) as a single self-contained IIFE. */
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'chrome114',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      input: 'src/content/contentScript.tsx',
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'content.js',
        assetFileNames: 'assets/[name][extname]',
      },
    },
  },
});
