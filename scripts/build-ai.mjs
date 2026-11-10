// @contexto INDICE.md · scripts/README.md
// ai.mjs — IA en el navegador: dist/cdn/lib/ai/. Lo llama scripts/build.mjs.
//
//   src/ai/<modulo>.ts        → lib/ai/<modulo>.min.mjs  un módulo por archivo; los hermanos quedan externos para que el
//                                                        estado (motores cargados, cola del modal) exista una sola vez.
//   src/ai/motores/<id>.ts    → lib/ai/motores/<id>.min.mjs + chunks   runonweb con todo. Comparten chunks, así un modelo
//                                                        no arrastra 13 copias de transformers.js.
//
// Vive en lib/ (infraestructura) y no en una categoría: nada de esto entra en `load('all')` ni en un barril. Los motores
// los pide `motores.ts` por URL no analizable y solo al usarlos.
import { readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { build } from 'esbuild';
import { aliasKit } from '@jeff-aporta/iswc-base/cdn/build/alias.ts';
import { cssVirtual } from '@jeff-aporta/iswc-base/cdn/build/css-virtual.ts';
// Mismo plugin que el build único (src/cdn/build/bundle-kit.ts): un módulo de `src/ai` queda externo como `.min.mjs`.
import { aiExterno } from '@jeff-aporta/iswc-base/cdn/build/bundle-kit.ts';

export async function construirAi({ root, dist, componentes, bundleMinJs }) {
  const aiRoot = join(root, 'src', 'ai');
  const out = join(dist, 'lib', 'ai');
  const modulos = (await readdir(aiRoot)).filter((f) => f.endsWith('.ts'));
  for (const f of modulos) {
    await bundleMinJs({ entry: join(aiRoot, f), outfile: join(out, f.replace(/\.ts$/, '.min.mjs')), plugins: [aiExterno(aiRoot, './'), componentes] });
  }
  const motores = (await readdir(join(aiRoot, 'motores'))).filter((f) => f.endsWith('.ts')).map((f) => join(aiRoot, 'motores', f));
  await build({
    entryPoints: motores,
    outdir: join(out, 'motores'),
    entryNames: '[name]',
    chunkNames: 'chunk-[hash]',
    outExtension: { '.js': '.min.mjs' },
    bundle: true,
    splitting: true,
    minify: true,
    format: 'esm',
    target: 'es2022',
    legalComments: 'none',
    plugins: [aliasKit(), cssVirtual(), aiExterno(aiRoot, '../')],
  });
  console.log(`  ${'lib/ai/'.padEnd(18)} ${modulos.length} módulos + ${motores.length} motores (fuera de los barriles)`);
}
