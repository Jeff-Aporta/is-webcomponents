// Build temporal (fuera del repo) para validar el comportamiento en navegador.
import { build } from 'esbuild';
import { aliasKit } from '@jeff-aporta/iswc-base/cdn/build/alias.ts';
import { cssVirtual } from '@jeff-aporta/iswc-base/cdn/build/css-virtual.ts';
import { join } from 'node:path';

const RAIZ = 'D:/VPS/transversales/iswc-base';
const outdir = process.argv[2];
const r = await build({
  entryPoints: [
    join(RAIZ, 'src/components/forms/input.ts'),
    join(RAIZ, 'src/components/forms/textarea.ts'),
    join(RAIZ, 'src/components/forms/file-input.ts'),
    join(RAIZ, 'src/components/forms/inline-edit.ts'),
  ],
  outdir,
  bundle: true,
  format: 'esm',
  splitting: true,
  minify: true,
  target: 'es2022',
  platform: 'browser',
  entryNames: '[name].min',
  chunkNames: '_chunks/chunk-[hash]',
  outExtension: { '.js': '.mjs' },
  metafile: true,
  plugins: [aliasKit({ raiz: join(RAIZ, 'src') }), cssVirtual({ staging: join(RAIZ, '.tmp-scss/src'), fuentes: join(RAIZ, 'src') })],
});
console.log('OK', Object.keys(r.metafile.outputs).length, 'salidas');
