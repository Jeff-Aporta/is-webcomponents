// ai.mjs — IA en el navegador: dist/cdn/lib/ai/. Lo llama scripts/build.mjs.
//
//   src/ai/<modulo>.ts        → lib/ai/<modulo>.min.js   un módulo por archivo; los hermanos quedan externos para que el
//                                                        estado (motores cargados, cola del modal) exista una sola vez.
//   src/ai/motores/<id>.ts    → lib/ai/motores/<id>.min.js + chunks   runonweb con todo. Comparten chunks, así un modelo
//                                                        no arrastra 13 copias de transformers.js.
//
// Vive en lib/ (infraestructura) y no en una categoría: nada de esto entra en `load('all')` ni en un barril. Los motores
// los pide `motores.ts` por URL no analizable y solo al usarlos.
import { readdir } from 'node:fs/promises';
import { basename, dirname, join, resolve } from 'node:path';
import { build } from 'esbuild';
import { aliasKit } from '@jeff-aporta/iswc-base/cdn/build/alias.ts';
import { cssVirtual } from '@jeff-aporta/iswc-base/cdn/build/css-virtual.ts';

const barras = (p) => p.replaceAll('\\', '/');

/** Módulo publicado de `src/ai`: directo en la carpeta, ni schemas ni los bundles de `motores/`. */
const esModuloAi = (abs, aiRoot) => dirname(barras(abs)) === barras(aiRoot);

/** Plugin: un módulo de `src/ai` queda externo a quien lo importe desde `desde` (carpeta publicada, relativa). */
export const aiExterno = (aiRoot, desde) => ({
  name: 'ai-externo',
  setup(b) {
    b.onResolve({ filter: /\.(ts|js)$/ }, (args) => {
      if (args.kind === 'entry-point') return null;
      const abs = resolve(args.resolveDir, args.path);
      return esModuloAi(abs, aiRoot) ? { path: `${desde}${basename(abs).replace(/\.(ts|js)$/, '')}.min.js`, external: true } : null;
    });
  },
});

export async function construirAi({ root, dist, componentes, bundleMinJs }) {
  const aiRoot = join(root, 'src', 'ai');
  const out = join(dist, 'lib', 'ai');
  const modulos = (await readdir(aiRoot)).filter((f) => f.endsWith('.ts'));
  for (const f of modulos) {
    await bundleMinJs({ entry: join(aiRoot, f), outfile: join(out, f.replace(/\.ts$/, '.min.js')), plugins: [aiExterno(aiRoot, './'), componentes] });
  }
  const motores = (await readdir(join(aiRoot, 'motores'))).filter((f) => f.endsWith('.ts')).map((f) => join(aiRoot, 'motores', f));
  await build({
    entryPoints: motores,
    outdir: join(out, 'motores'),
    entryNames: '[name]',
    chunkNames: 'chunk-[hash]',
    outExtension: { '.js': '.min.js' },
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
