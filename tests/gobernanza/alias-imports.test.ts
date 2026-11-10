// @contexto INDICE.md · tests/gobernanza/README.md
// alias-imports.test.ts — guardián del alias `@jeff-aporta/iswc-base/<ruta>` (specs/plan-carga-modular.md §D3, fase F1;
// regla en specs/typescript/spec.md, uso en specs/cdn.md §Alias).
//   L1 en `src/**` (fuera de `vendor-distributions/`) ningún import relativo SUBE de carpeta (`'../`) hacia un archivo de
//      `src/`: va por alias. Quedan relativos los de la misma carpeta (`./x.js`, `./schemas/…`) y los que salen de `src/`
//      (p. ej. `../../dist/cdn/core/loader.min.mjs`), que el alias no cubre.
//   L2 todo especificador con alias en `src/` y `scripts/` apunta a un archivo que existe (`.js` nombra la fuente `.ts`).
//   L3 `deno.json` mapea el alias a `./src/` y `tsconfig.json` lo declara en `paths` (Deno, tsc y tests lo resuelven igual).
//   L4 el árbol publicado `dist/cdn/` no importa por alias: va con rutas relativas y funciona sin import map. Se mira el
//      especificador de `from`/`import`/`import()` en `.js`/`.mjs`/`.ts`; la clave del alias como DATO (importmap.json,
//      docs, pin-update) es legítima. Fuera: las plantillas de apps (`dist/cdn/skills/<skill>/templates/`, F5a), que
//      son código de un CONSUMIDOR: importan el kit por alias y lo resuelve el import map de su HTML y su `deno.json`.
//   L5 `dist/cdn/importmap.json` publica la entrada del alias a `dist/cdn/` en jsDelivr con un SHA de 40 hex.
//   L6 `src/vendor-distributions/**` no usa el alias (viaja a otros repos: «Sin imports relativos» y sin alias).
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { denoTestCon } from '../_shared/deno-test.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const denoTest = denoTestCon(test);

const KIT = join(import.meta.dirname!, '..', '..');
const SRC = join(KIT, 'src');
const VENDOR = join(SRC, 'vendor-distributions');
const ALIAS = '@jeff-aporta/iswc-base/';
const SALTAR = new Set(['node_modules', 'dist']);
const RELATIVO = /(\bfrom\s*|\bimport\s*\(?\s*)(["'])(\.\.\/[^"'\n]*)\2/g;
const CON_ALIAS = /(\bfrom\s*|\bimport\s*\(?\s*)(["'])@jeff-aporta\/iswc-base\/([^"'\n]*)\2/g;

const barras = (ruta: string) => ruta.replaceAll('\\', '/');

function archivos(dir: string, re: RegExp, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (!SALTAR.has(n) && !n.startsWith('.tmp')) archivos(p, re, out); continue; }
    if (re.test(n)) out.push(p);
  }
  return out;
}

/** El archivo existe tal cual o como `.ts` (el especificador `.js` nombra la fuente `.ts`). */
const existe = (abs: string) => existsSync(abs) || (/\.js$/.test(abs) && existsSync(abs.replace(/\.js$/, '.ts')));

const fuera = (abs: string) => relative(SRC, abs).startsWith('..');

denoTest('alias-imports: L1 en src/ ningún import relativo sube de carpeta hacia src/ (va por @jeff-aporta/iswc-base/)', () => {
  const malos: string[] = [];
  for (const f of archivos(SRC, /\.ts$/)) {
    if (f.startsWith(VENDOR)) continue;
    for (const m of readFileSync(f, 'utf8').matchAll(RELATIVO)) {
      const abs = resolve(dirname(f), m[3]!);
      // Fuera de src/ (dist/) no lo cubre el alias; un destino que no existe es texto de un snippet, no un import.
      if (fuera(abs) || !existe(abs)) continue;
      malos.push(`${barras(relative(KIT, f))}: ${m[3]}`);
    }
  }
  assertEquals(malos, [], `imports relativos que suben de carpeta (correr scripts/codemods/alias-imports.mjs):\n${malos.join('\n')}`);
});

denoTest('alias-imports: L2 todo especificador con alias apunta a un archivo que existe', () => {
  const rotos: string[] = [];
  let vistos = 0;
  for (const f of [...archivos(SRC, /\.ts$/), ...archivos(join(KIT, 'scripts'), /\.(ts|mjs)$/)]) {
    for (const m of readFileSync(f, 'utf8').matchAll(CON_ALIAS)) {
      vistos++;
      if (!existe(join(SRC, m[3]!))) rotos.push(`${barras(relative(KIT, f))}: ${ALIAS}${m[3]}`);
    }
  }
  assert(vistos > 1000, `se esperaban los imports del codemod (más de 1000), hay ${vistos}`);
  assertEquals(rotos, [], rotos.join('\n'));
});

denoTest('alias-imports: L3 deno.json y tsconfig.json declaran el alias a ./src/', () => {
  const deno = JSON.parse(readFileSync(join(KIT, 'deno.json'), 'utf8'));
  assertEquals(deno.imports?.[ALIAS], './src/');
  const tsconfig = JSON.parse(readFileSync(join(KIT, 'tsconfig.json'), 'utf8'));
  assertEquals(tsconfig.compilerOptions?.paths?.[`${ALIAS}*`], ['./src/*']);
});

denoTest('alias-imports: L4 dist/cdn no importa por alias (rutas relativas, sin import map)', () => {
  const dist = join(KIT, 'dist', 'cdn');
  assert(existsSync(dist), 'falta dist/cdn: correr deno task build');
  const malos: string[] = [];
  for (const f of archivos(dist, /\.(js|mjs|ts)$/)) {
    if (/^dist\/cdn\/skills\/[^/]+\/templates\//.test(barras(relative(KIT, f)))) continue;
    if (CON_ALIAS.test(readFileSync(f, 'utf8'))) malos.push(barras(relative(KIT, f)));
    CON_ALIAS.lastIndex = 0;
  }
  assertEquals(malos, [], `publicados con el alias (el build debe reescribirlo a relativo):\n${malos.join('\n')}`);
});

denoTest('alias-imports: L5 dist/cdn/importmap.json publica el alias a dist/cdn/ por SHA', () => {
  const ruta = join(KIT, 'dist', 'cdn', 'importmap.json');
  assert(existsSync(ruta), 'falta dist/cdn/importmap.json: correr deno task build');
  const mapa = JSON.parse(readFileSync(ruta, 'utf8'));
  assertEquals(Object.keys(mapa.imports ?? {}), [ALIAS]);
  assert(/^https:\/\/cdn\.jsdelivr\.net\/gh\/Jeff-Aporta\/is-webcomponents@[0-9a-f]{40}\/dist\/cdn\/$/.test(mapa.imports[ALIAS]), mapa.imports[ALIAS]);
});

denoTest('alias-imports: L6 src/vendor-distributions no usa el alias', () => {
  const malos = archivos(VENDOR, /\.(ts|mjs|js)$/).filter((f) => {
    const hay = CON_ALIAS.test(readFileSync(f, 'utf8'));
    CON_ALIAS.lastIndex = 0;
    return hay;
  });
  assertEquals(malos.map((f) => barras(relative(KIT, f))), []);
});

export default lista();
