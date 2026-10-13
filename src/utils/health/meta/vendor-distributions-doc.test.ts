/**
 * Guardián WHAT de la documentación de `src/vendor-distributions/` (todo lo que viaja por vendor):
 *   D1 todo archivo de código (.ts/.mjs) abre con `// @doc <URL CDN>` (jsDelivr o GitHub Pages) que apunta a un .md
 *      que existe en el repo; nunca una ruta local. Delante puede ir la cabecera `// @vendor …` que estampa el hook
 *      pre-commit del kit (scripts/vendor-stamp.mjs).
 *   D5 todo archivo de código lleva en su cabecera `Skill: <ruta .md>` (la skill, común o particular, que lo explica)
 *      y esa ruta existe en el repo; al vendorizar, `vendor.ts` la reescribe a la copia local del consumidor o a la URL del pin.
 *   D2 los .md de la carpeta enlazan otros .md SOLO por CDN (sin rutas relativas ni locales).
 *   D3 el README índice nombra cada archivo de código.
 *   D4 lo publicado en `dist/cdn/vendor-distributions/` (si hay build) es el mismo conjunto de archivos.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = 'src/vendor-distributions';
const DIST = 'dist/cdn/vendor-distributions';
const CDN = /^https:\/\/(cdn\.jsdelivr\.net\/gh\/[^/@]+\/[^/@]+@[^/]+|[\w-]+\.github\.io\/[^/]+)\/(\S+\.md)$/;

function listar(dir: string, base = dir, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) listar(p, base, out);
    else out.push(relative(base, p).replaceAll('\\', '/'));
  }
  return out;
}
const archivos = listar(SRC);
const codigo = archivos.filter((f) => /\.(ts|mjs)$/.test(f));
const mds = archivos.filter((f) => f.endsWith('.md'));

Deno.test('vendor-distributions: D1 todo archivo de código abre con // @doc por CDN a un .md existente', () => {
  assert(codigo.length >= 20, `muy pocos archivos de código: ${codigo.length}`);
  const malos: string[] = [];
  for (const f of codigo) {
    const lineas = readFileSync(join(SRC, f), 'utf8').split('\n', 2);
    const primera = (lineas[0]!.startsWith('// @vendor ') ? lineas[1] ?? '' : lineas[0]!).trim();
    const m = primera.match(/^\/\/ @doc (\S+)$/)?.[1]?.match(CDN);
    if (!m) { malos.push(`${f}: primera línea «${primera.slice(0, 90)}»`); continue; }
    // GitHub Pages publica dist/ en la raíz; jsDelivr sirve el repo tal cual.
    const ruta = m[2]!;
    if (!existsSync(ruta) && !existsSync(join('dist', ruta))) malos.push(`${f}: la doc ${ruta} no existe en el repo`);
  }
  assertEquals(malos, [], malos.join('\n'));
});

Deno.test('vendor-distributions: D2 los .md enlazan otros .md solo por CDN', () => {
  const malos: string[] = [];
  for (const f of mds) {
    const t = readFileSync(join(SRC, f), 'utf8');
    for (const [, url] of t.matchAll(/\]\(([^)\s]+\.md)(?:#[^)]*)?\)/g)) {
      if (!CDN.test(url!)) malos.push(`${f}: ${url}`);
    }
  }
  assertEquals(malos, [], malos.join('\n'));
});

Deno.test('vendor-distributions: D3 el README nombra cada archivo de código', () => {
  const readme = readFileSync(join(SRC, 'README.md'), 'utf8');
  const faltan = codigo.filter((f) => !readme.includes(f.split('/').pop()!));
  assertEquals(faltan, [], `sin documentar en README.md: ${faltan.join(', ')}`);
});

Deno.test('vendor-distributions: D4 dist publica el mismo conjunto que src', () => {
  if (!existsSync(DIST)) return; // sin build no hay nada que comparar
  assertEquals(listar(DIST).sort(), archivos.filter((f) => /\.(ts|mjs|md)$/.test(f)).sort(), 'corre `deno task build`');
});

Deno.test('vendor-distributions: D5 cada archivo de código dice su Skill: y la ruta existe en el repo', () => {
  const malos: string[] = [];
  for (const f of codigo) {
    const m = readFileSync(join(SRC, f), 'utf8').match(/^\s*(?:\*|\/\/)\s*Skill:\s*(\S+)/m);
    if (!m) { malos.push(`${f}: sin línea «Skill: <ruta .md>» en la cabecera`); continue; }
    if (!/\.md$/.test(m[1]!) || !existsSync(m[1]!)) malos.push(`${f}: la skill ${m[1]} no existe en el repo`);
  }
  assertEquals(malos, [], malos.join('\n'));
});
