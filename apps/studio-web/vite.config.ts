import {fileURLToPath, URL} from 'node:url';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  base: './',
  plugins: [react()],
  server: {proxy: {'/api': 'http://127.0.0.1:4180'}},
  resolve: {
    alias: {
      '@motion-master/schema': fileURLToPath(new URL('../../packages/motion-schema/src/index.ts', import.meta.url)),
      '@motion-master/core/timing': fileURLToPath(new URL('../../packages/motion-core/src/timing.ts', import.meta.url)),
      '@motion-master/core': fileURLToPath(new URL('../../packages/motion-core/src/index.ts', import.meta.url)),
      '@motion-master/cards-starter': fileURLToPath(new URL('../../card-packs/starter/src/index.tsx', import.meta.url)),
    },
  },
});
