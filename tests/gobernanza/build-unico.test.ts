// @contexto INDICE.md · tests/gobernanza/README.md
/**
 * build-unico.test.ts — ningún script arma un componente del kit por su cuenta (plan carga modular D5, F7 tarea 4).
 *
 * Los componentes del catálogo salen de UN build con splitting (`bundleKit`, src/cdn/build/bundle-kit.ts): el core va
 * una vez, en chunks compartidos. Un build por archivo (`bundleMinJs` o `esbuild.build/context` con un tag como
 * entrada) inlinea el core en cada salida: es lo que hacían `scripts/builds/{overlays,phase8,no-clean,demos}`,
 * borrados en F7b porque nadie los usaba.
 *
 * Regla: en `scripts/`, `labs/` y `src/cdn/build/`, un archivo que importe esbuild o llame a `bundleMinJs` no nombra
 * la fuente de un tag (`components/<cat>/<tag>.ts|js`, o `'<cat>', '<tag>.ts'` en un `join`). Excepciones con motivo:
 * `bundle-kit.ts` (el build único), `build-classic.mjs` (artefacto IIFE opcional, D1) y `build-lote.mjs` (lote ESM
 * opcional que publica la app: un archivo, el core una vez). `lab-componente.mjs` recibe la entrada por argumento
 * (lab local, no publica nada) y no nombra ninguna.
 */
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const RAIZ = join(import.meta.dirname ?? '.', '..', '..');
const CARPETAS = ['scripts', 'labs', join('src', 'cdn', 'build')];
const PERMITIDOS = new Set(['src/cdn/build/bundle-kit.ts', 'scripts/build-classic.mjs', 'scripts/build-lote.mjs']);
/** Empaqueta (`build`/`context` de esbuild o `bundleMinJs`); `transform` solo compila un texto y no cuenta. */
const USA_BUILD = /import\s*\{[^}]*\b(?:build|context)\b[^}]*\}\s*from\s*['"](?:npm:)?esbuild|\besbuild\.(?:build|context)\s*\(|\bbundleMinJs\s*\(/;
/** Sin las líneas de comentario (los usos de ejemplo en la cabecera no son entradas). */
const sinComentarios = (t: string) => t.split('\n').map((l) => (/^\s*(?:\/\/|\/\*|\*)/.test(l) ? '' : l)).join('\n');

/** `<cat>/<tag>` de cada fuente de tag (archivos `.ts` directos de `src/components/<cat>/`). */
function fuentesDeTag(): Set<string> {
  const out = new Set<string>();
  const comp = join(RAIZ, 'src', 'components');
  for (const cat of readdirSync(comp)) {
    const dir = join(comp, cat);
    if (cat.startsWith('_') || !statSync(dir).isDirectory()) continue;
    for (const f of readdirSync(dir)) {
      if (/\.ts$/.test(f) && !/\.(?:schemas|d)\.ts$/.test(f)) out.add(`${cat}/${f.replace(/\.ts$/, '')}`);
    }
  }
  return out;
}

function archivos(dir: string, out: string[] = []): string[] {
  let nombres: string[];
  try { nombres = readdirSync(dir); } catch { return out; }
  for (const n of nombres) {
    if (n === 'node_modules' || n.startsWith('.')) continue;
    const p = join(dir, n);
    if (statSync(p).isDirectory()) archivos(p, out);
    else if (/\.(?:m?js|ts)$/.test(n)) out.push(p);
  }
  return out;
}

test('gobernanza/build-unico: ningún script construye un componente del kit fuera de bundleKit (ni build-classic/build-lote)', () => {
  const tags = fuentesDeTag();
  assert.ok(tags.size > 150, `solo ${tags.size} fuentes de tag`);
  const fallos: string[] = [];
  let revisados = 0;
  for (const carpeta of CARPETAS) {
    for (const abs of archivos(join(RAIZ, carpeta))) {
      const rel = abs.slice(RAIZ.length + 1).replaceAll('\\', '/');
      const texto = sinComentarios(readFileSync(abs, 'utf8'));
      if (!USA_BUILD.test(texto) || PERMITIDOS.has(rel)) continue;
      revisados++;
      const nombrados = new Set<string>();
      for (const m of texto.matchAll(/components\/([a-z-]+)\/([a-z0-9-]+)\.(?:ts|js)\b/g)) nombrados.add(`${m[1]}/${m[2]}`);
      for (const m of texto.matchAll(/['"]([a-z-]+)['"]\s*,\s*['"]([a-z0-9-]+)\.(?:ts|js)['"]/g)) nombrados.add(`${m[1]}/${m[2]}`);
      const deTag = [...nombrados].filter((n) => tags.has(n));
      if (deTag.length) fallos.push(`${rel}: build por archivo de ${deTag.slice(0, 5).join(', ')}${deTag.length > 5 ? '…' : ''}`);
    }
  }
  console.log(`  ${revisados} scripts con esbuild/bundleMinJs revisados · ${fallos.length} con un tag como entrada`);
  assert.deepEqual(fallos, [], 'builds por archivo que inlinean el core: pásalos a bundleKit o bórralos');
});

export default lista();
