import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    sourcemap: true,
    minify: 'terser',
    terserOptions: {
      ecma: 2020,
      compress: {
        drop_console: true,
      },
    },
  },
});
