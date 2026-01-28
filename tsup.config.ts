import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli/index.ts', 'src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'node20',
  outDir: 'dist',
  splitting: false,
  treeshake: true,
  external: ['react', 'ink'],
});
