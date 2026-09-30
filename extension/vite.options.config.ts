import { defineConfig } from 'vite';

/** Builds the options page script as a single self-contained IIFE. */
export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    target: 'chrome114',
    minify: 'esbuild',
    sourcemap: false,
    rollupOptions: {
      input: 'src/options/options.ts',
      output: {
        format: 'iife',
        inlineDynamicImports: true,
        entryFileNames: 'options.js',
      },
    },
  },
});
