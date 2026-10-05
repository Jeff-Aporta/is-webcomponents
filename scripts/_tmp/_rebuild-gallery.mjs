import { build } from 'esbuild';
import { stat } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outfile = join(root, 'dist', 'gallery-app.min.js');
await build({
  entryPoints: [join(root, 'src', 'gallery', 'app.ts')],
  outfile,
  bundle: true,
  minify: true,
  format: 'esm',
  // es2022: TLA waitForGalleryShell (host sibling async).
  target: 'es2022',
  legalComments: 'none',
  external: ['node:fs', 'node:url'],
});
console.log('OK', outfile, (await stat(outfile)).size);
