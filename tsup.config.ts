import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['./src/**/*.ts'],
  outDir: './dist',
  clean: true,
  dts: true,
  minify: false,
  bundle: false,
  splitting: false,
  sourcemap: false,
  skipNodeModulesBundle: true,
});
