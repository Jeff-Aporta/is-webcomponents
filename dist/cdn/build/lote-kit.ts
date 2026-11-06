/**
 * lote-kit.ts — lote ESM del armazón de una app: UN módulo con varios `iswc-*` y todo lo que importan, armado desde el
 * kit PUBLICADO al pin (jsDelivr por SHA, inmutable), nunca desde un checkout local (proyectos herméticos). Variante
 * «lote» del plan de carga (F7); lo usa `construirApp` con la opción `lote` (F10, antes `scripts/build/lote-kit.ts` de
 * Avatar).
 *
 *   construirLoteKit({ cdn, deps, tags, salida, cache }) → { bytes, modulos, tags }
 *
 * - Entradas: el módulo de cada tag (`<cat>/<tag>.min.mjs`, de `deps.tags`). Lo que importan se baja por HTTP del mismo
 *   pin y se empaqueta en el archivo.
 * - Externos (misma URL que usa el resto de la página = una sola instancia): el cierre del loader (`deps.core.loader`,
 *   que el HTML carga por `<script src>`), `lib/zod.min.mjs` (destino del `zod` del import map) y todo `import()`.
 * - `import.meta.url` de cada módulo se fija a SU URL en el pin: el kit ubica temas, hojas y librerías relativas a ella.
 * - El lote exporta `tags`; el registrador de la app los registra hacia el lote (`registerApp`), así `load`/`ensure` y
 *   las `static deps` de los padres usan el lote y no piden los chunks.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { build, type Plugin } from 'esbuild';
import type { LoteKitOpts, LoteKitResult } from './lote-kit.schemas.ts';

/** Módulo propio de `tag` dentro de su cierre (`<cat>/<nombre>.min.mjs`). */
function moduloDe(deps: LoteKitOpts['deps'], tag: string): string {
  const nombre = tag.replace(/^iswc-/, '');
  const propio = (deps.tags[tag] ?? []).find((r) => r.endsWith(`/${nombre}.min.mjs`) && !r.startsWith('_chunks/'));
  if (!propio) throw new Error(`lote-kit: ${tag} no está en el deps.json del pin`);
  return propio;
}

async function bajar(url: string, cache: string): Promise<string> {
  const archivo = join(cache, url.replace(/^https?:\/\//, '').replace(/[?#].*$/, '').replace(/:/g, '_'));
  if (existsSync(archivo)) return readFileSync(archivo, 'utf8');
  const r = await fetch(url, { signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(`lote-kit: ${url} → ${r.status}`);
  const texto = await r.text();
  mkdirSync(dirname(archivo), { recursive: true });
  writeFileSync(archivo, texto);
  return texto;
}

export async function construirLoteKit(o: LoteKitOpts): Promise<LoteKitResult> {
  const externos = new Set([...(o.deps.core['loader'] ?? ['core/loader.min.mjs']), 'lib/zod.min.mjs'].map((r) => o.cdn + r));
  const tags = [...o.tags];
  const contenido = [
    ...tags.map((t) => `import ${JSON.stringify(o.cdn + moduloDe(o.deps, t))};`),
    `export const tags = ${JSON.stringify(tags)};`,
  ].join('\n');
  let modulos = 0;
  const pin: Plugin = {
    name: 'kit-pin',
    setup(b) {
      b.onResolve({ filter: /.*/ }, (a) => {
        const desdeKit = a.namespace === 'kit';
        if (!desdeKit && !/^https?:\/\//.test(a.path)) return undefined;
        const url = new URL(a.path, desdeKit ? a.importer : undefined).href;
        if (!url.startsWith(o.cdn) || externos.has(url.replace(/[?#].*$/, '')) || a.kind === 'dynamic-import') return { path: url, external: true };
        return { path: url, namespace: 'kit' };
      });
      b.onLoad({ filter: /.*/, namespace: 'kit' }, async (a) => {
        modulos++;
        const texto = await bajar(a.path, o.cache);
        return { contents: texto.replaceAll('import.meta.url', JSON.stringify(a.path)), loader: 'js' };
      });
    },
  };
  const r = await build({
    stdin: { contents: contenido, sourcefile: 'kit-lote.js', loader: 'js' },
    bundle: true,
    write: false,
    format: 'esm',
    target: 'es2022',
    minify: true,
    legalComments: 'none',
    logLevel: 'error',
    plugins: [pin],
  });
  const codigo = `// Lote del armazón: ${tags.length} tags del kit (${o.cdn}). Lo arma construirApp; no editar.\n${r.outputFiles[0]!.text}`;
  mkdirSync(dirname(o.salida), { recursive: true });
  writeFileSync(o.salida, codigo);
  return { bytes: codigo.length, modulos, tags };
}
