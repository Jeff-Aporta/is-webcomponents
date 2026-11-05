// build-lote.mjs — lote ESM opcional (plan F7, tarea 0.3 ii): UN `.min.mjs` autosuficiente con el cierre de varios tags.
//
//   deno task build:lote -- iswc-button,iswc-dialog,… [--out=<archivo>] [--zod=<especificador>]
//
// Un solo `esbuild` sin splitting: los tags pedidos y todo lo que importan (core incluido) en un archivo; `zod` queda
// externo (por defecto el especificador `zod`, que resuelve el import map del consumidor; `--zod=<url>` lo fija).
// Lo publica el CONSUMIDOR en su propio dist (no forma parte de `dist/cdn` del kit ni del catálogo). Exporta `tags`
// (los incluidos) para que la app los registre con `iswcLoader.registerApp({ <tag>: <href del lote> })`: así
// `load()`/`ensure()` y las `static deps` de los padres usan el lote en vez de pedir cada módulo. El lote debe
// incluir los hijos de sus padres (`static deps`): un hijo que falte se pide al kit y trae otra copia del core.
// Medición y decisión: specs/cdn.md §Lote ESM opcional.
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { aliasKit } from '@jeff-aporta/iswc-base/cdn/build/alias.ts';
import { cssVirtual } from '@jeff-aporta/iswc-base/cdn/build/css-virtual.ts';
import { entradasKit } from '@jeff-aporta/iswc-base/cdn/build/bundle-kit.ts';
import { zodExterno } from '@jeff-aporta/iswc-base/cdn/build/bundle-kit.ts';
import manifest from '@jeff-aporta/iswc-base/manifest.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Fuente de cada tag pedido (`iswc-x` o `x`); lanza si alguno no es un tag del catálogo con módulo propio. */
async function fuentesDe(tags) {
  const entradas = await entradasKit(RAIZ, manifest);
  const porSalida = new Map(entradas.map((e) => [e.out, e.in]));
  const out = [];
  for (const pedido of tags) {
    const corto = String(pedido).trim().replace(/^iswc-/, '');
    const item = manifest.find((m) => m.tag === `iswc-${corto}`);
    const fuente = item && porSalida.get(`${item.category}/${corto}.min`);
    if (!fuente) throw new Error(`build:lote: ${pedido} no es un tag del catálogo con módulo propio`);
    out.push({ tag: `iswc-${corto}`, fuente });
  }
  return out;
}

/** Construye el lote. Devuelve `{ outfile, bytes, tags }`. */
export async function construirLote({ tags, outfile = join(RAIZ, '.tmp', 'lote', 'lote.min.mjs'), zod = 'zod' }) {
  const fuentes = await fuentesDe(tags);
  const contents = [
    ...fuentes.map((f) => `import ${JSON.stringify(f.fuente.replaceAll('\\', '/'))};`),
    `export const tags = ${JSON.stringify(fuentes.map((f) => f.tag))};`,
  ].join('\n');
  await mkdir(dirname(outfile), { recursive: true });
  await build({
    stdin: { contents, resolveDir: RAIZ, sourcefile: 'lote.ts', loader: 'ts' },
    outfile,
    bundle: true,
    minify: true,
    format: 'esm',
    target: 'es2020',
    legalComments: 'none',
    logLevel: 'error',
    // El `sideEffects` del package.json de la raíz nombra rutas de dist: visto desde src/ cada módulo parecería sin
    // efectos y esbuild soltaría sus `define()`. El lote incluye cada módulo entero.
    ignoreAnnotations: true,
    plugins: [aliasKit(), cssVirtual({ staging: join(RAIZ, '.tmp-scss', 'src') }), zodExterno(zod)],
  });
  return { outfile, bytes: (await stat(outfile)).size, tags: fuentes.map((f) => f.tag) };
}

if (import.meta.main) {
  const args = Deno.args.filter((a) => a !== '--');
  const opt = (k) => args.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
  const tags = args.filter((a) => !a.startsWith('--')).flatMap((a) => a.split(',')).filter(Boolean);
  if (!tags.length) {
    console.error('uso: deno task build:lote -- tag1,tag2,… [--out=<archivo>] [--zod=<especificador>]');
    Deno.exit(2);
  }
  const out = opt('out');
  const r = await construirLote({ tags, outfile: out ? resolve(out) : undefined, zod: opt('zod') ?? 'zod' });
  console.log(`build:lote ${r.tags.length} tags → ${r.outfile} (${r.bytes} B)`);
  if (opt('json')) await writeFile(resolve(opt('json')), JSON.stringify(r, null, 2) + '\n');
}
