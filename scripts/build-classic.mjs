// build-classic.mjs — artefacto clásico opcional (plan D1/D2, fase F3): `dist/cdn/<cat>/<tag>.classic.js`.
//
//   deno task build:classic -- <tag> [<tag>…] [--out <carpeta>]
//
// Un `esbuild` por tag con `format: 'iife'`, sin splitting y con TODO dentro (core, zod, src/ai): un archivo
// autosuficiente para `<script src>` sin `type="module"` (p. ej. incrustar un componente en un CMS). El nombre lleva
// `.classic` para que nunca se confunda con un módulo; el loader lo reconoce por `.js` y lo carga con `<script src>`.
// No forma parte de `deno task build` ni del catálogo: se genera a demanda.
import { mkdir, stat } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { aliasKit } from '@jeff-aporta/iswc-base/cdn/build/alias.ts';
import { cssVirtual } from '@jeff-aporta/iswc-base/cdn/build/css-virtual.ts';
import { entradasKit } from '@jeff-aporta/iswc-base/cdn/build/bundle-kit.ts';
import manifest from '@jeff-aporta/iswc-base/manifest.js';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');

/** Construye el artefacto clásico de cada tag en `outdir` (por defecto dist/cdn). Devuelve las rutas escritas. */
export async function construirClasico({ tags, outdir = join(RAIZ, 'dist', 'cdn') }) {
  const entradas = await entradasKit(RAIZ, manifest);
  const porSalida = new Map(entradas.map((e) => [e.out, e.in]));
  const escritos = [];
  for (const pedido of tags) {
    const corto = String(pedido).replace(/^iswc-/, '');
    const item = manifest.find((m) => m.tag === `iswc-${corto}`);
    const fuente = item && porSalida.get(`${item.category}/${corto}.min`);
    if (!fuente) throw new Error(`build:classic: ${pedido} no es un tag del catálogo con módulo propio`);
    const outfile = join(outdir, item.category, `${corto}.classic.js`);
    await mkdir(dirname(outfile), { recursive: true });
    await build({
      entryPoints: [fuente],
      outfile,
      bundle: true,
      minify: true,
      format: 'iife',
      target: 'es2020',
      legalComments: 'none',
      logLevel: 'error',
      // `import.meta` no existe en un script clásico: esbuild lo deja vacío y el código del kit ya cae en sus
      // valores por defecto (sin URL propia → carpeta de la página).
      plugins: [aliasKit(), cssVirtual()],
    });
    escritos.push(outfile);
  }
  return escritos;
}

if (import.meta.main) {
  const args = Deno.args.filter((a) => a !== '--');
  const iOut = args.indexOf('--out');
  const outdir = iOut >= 0 ? resolve(args[iOut + 1]) : undefined;
  const tags = args.filter((a, i) => !a.startsWith('--') && (iOut < 0 || i !== iOut + 1));
  if (!tags.length) {
    console.error('uso: deno task build:classic -- <tag> [<tag>…] [--out <carpeta>]');
    Deno.exit(2);
  }
  for (const f of await construirClasico({ tags, outdir })) console.log(`  ${f}  ${(await stat(f)).size} B (iife)`);
}
