import * as esbuild from 'esbuild';
import { glob } from 'glob';
import path from 'path';

// Find all e2e test files
const entryPoints = await glob('test/e2e/**/*.ts');

await esbuild.build({
  entryPoints,
  bundle: true, // Required for alias resolution
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outdir: 'out/test/e2e',
  outbase: 'test/e2e',
  sourcemap: true,
  // Path alias resolution
  alias: {
    '@': path.resolve('src'),
    '@domain': path.resolve('src/domain'),
    '@application': path.resolve('src/application'),
    '@infrastructure': path.resolve('src/infrastructure'),
    '@presentation': path.resolve('src/presentation'),
    '@shared': path.resolve('src/shared'),
  },
  // External dependencies (not bundled)
  external: [
    'vscode',
    'mocha',
    'glob',
    'assert',
    'path',
    'os',
    'fs',
  ],
});

console.log('E2E tests compiled successfully');
