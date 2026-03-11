import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { copyFileSync } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));

export default {
  build: {
    lib: {
      entry: resolve(__dirname, 'src/frame-engine.js'),
      name: 'FrameEngine',
      formats: ['umd', 'es'],
      fileName: (format) => format === 'es' ? 'frame-engine.esm.js' : 'frame-engine.min.js',
    },
    outDir: 'dist',
    esbuild: {
      keepNames: true,
    },
    copyPublicDir: false,
  },
  server: {
    port: 3009,
    open: '/demo/index.html',
  },
  plugins: [
    {
      name: 'copy-types',
      closeBundle() {
        copyFileSync('src/frame-engine.d.ts', 'dist/frame-engine.d.ts');
      },
    },
  ],
};
