import { defineConfig } from 'vite';

export default defineConfig({
  root: '.',
  server: { open: '/demo/index.html' },
  build: {
    lib: {
      entry: 'src/index.ts',
      formats: ['es'],
      fileName: () => 'taso-player.js',
    },
    target: 'es2022',
    minify: 'esbuild',
    sourcemap: true,
    emptyOutDir: false,
  },
});
