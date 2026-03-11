import { copyFileSync } from 'fs';
import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import terser from '@rollup/plugin-terser';
import serve from 'rollup-plugin-serve';
import livereload from 'rollup-plugin-livereload';

const isProd = process.env.NODE_ENV === 'production';


export default {
  input: 'src/frame-engine.js',
  output: [
    {
      file: 'dist/frame-engine.min.js',
      format: 'umd',
      name: 'FrameEngine',
      sourcemap: !isProd
    },
    {
      file: 'dist/frame-engine.esm.js',
      format: 'es',
      sourcemap: !isProd
    },
    {
      file: 'demo/frame-engine.min.js',
      format: 'umd',
      name: 'FrameEngine',
      sourcemap: !isProd
    }
  ],
  plugins: [
    {
      name: 'copy-types',
      writeBundle() {
        copyFileSync('src/frame-engine.d.ts', 'dist/frame-engine.d.ts');
      }
    },
    resolve(),
    commonjs(),
    isProd && terser({
      mangle: {
        keep_classnames: true,  // Preserve class names during minification
        keep_fnames: false       // Optionally preserve function names
      }
    }),
    !isProd && serve({
      open: true,
      contentBase: 'demo',
      port: 3009,
    }),
    !isProd && livereload({
      watch: 'demo',
    }),
  ],

};