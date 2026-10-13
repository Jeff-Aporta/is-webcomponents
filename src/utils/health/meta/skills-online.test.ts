/**
 * Guardián WHAT de los scripts ONLINE del kit (Jeff, 2026-10-13): los CLI que los consumidores corren con Deno
 * desde `@main` con `--reload` son BUNDLES autocontenidos en `dist/cdn/…` (scripts/build-online.mjs) y NUNCA se vendorizan.
 *   O1 cada bundle online existe en dist (vendor, pin-update, download-iconify, render-lote y `skills/<skill>/tools/*`),
 *      no contiene imports relativos ni `import.meta.url` convertido a ruta (`fileURLToPath(import.meta.url)`,
 *      `dirname(fileURLToPath(…import.meta.url…))`), y `vendor.mjs` lleva pin-update inlineado (sin spawn de hermanos).
 *   O2 cada script de `skills/<skill>/tools/*.{ts,mjs}` y cada CLI online aparece en alguna skill (`skills/**\/*.md`)
 *      con la URL exacta de su bundle `https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/dist/cdn/<ruta>.mjs`
 *      y, en esa skill, la forma canónica `--reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/`.
 *   O3 ninguna skill invoca un tools/ por ruta local del checkout, por SHA ni por la fuente `.ts` (va el bundle de main).
 *   O4 `vendor.ts` al traer una skill (`carpeta: true`) salta `tools/**` y los scripts (archivosDeSkill).
 * Excepción documentada: `probar-foundation` y `manifest` operan sobre el checkout del kit (git, templates/) y conservan
 * `fileURLToPath`; su bundle existe y se documenta igual, pero no se exige O1 sobre ellos.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const RAW = 'https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents';
const RELOAD = `--reload=${RAW}/`;
const KIT_ONLY = new Set(['skills/iswc-foundation/tools/probar-foundation.ts', 'skills/iswc-foundation/tools/manifest.ts']);

function listar(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) listar(p, out); else out.push(p.replaceAll('\\', '/'));
  }
  return out;
}
const mds = listar('skills').filter((f) => f.endsWith('.md')).map((f) => ({ f, t: readFileSync(f, 'utf8') }));
const { entradasOnline } = await import('../../../../scripts/build-online.mjs');
const entradas = await entradasOnline();

Deno.test('skills-online: O1 cada bundle online existe, es autocontenido y no se localiza por ruta', () => {
  assert(entradas.length >= 5, `pocas entradas online: ${entradas.length}`);
  const malos: string[] = [];
  for (const [desde, hacia] of entradas) {
    const bundle = join('dist/cdn', hacia);
    if (!existsSync(bundle)) { malos.push(`${hacia}: falta en dist (deno task build:online)`); continue; }
    if (KIT_ONLY.has(desde)) continue;
    const t = readFileSync(bundle, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    for (const m of t.matchAll(/\bfrom\s*["']([^"']+)["']|\bimport\s*\(\s*["']([^"']+)["']\s*\)/g)) {
      const spec = m[1] ?? m[2] ?? '';
      if (/^\.\.?\//.test(spec)) malos.push(`${hacia}: import relativo «${spec}»`);
      if (!/^(node:|npm:|jsr:|https?:)/.test(spec) && !/^\.\.?\//.test(spec)) malos.push(`${hacia}: specifier sin resolver «${spec}» (debe ser node:/npm:/https:)`);
    }
    if (/fileURLToPath\(\s*import\.meta\.url\s*\)|dirname\([^)]*import\.meta\.url/.test(t)) malos.push(`${hacia}: convierte import.meta.url a ruta`);
    if (hacia.endsWith('/vendor.mjs') && (/spawnSync\([^)]*pin-update/.test(t) || !/function protocolo\(/.test(t))) malos.push(`${hacia}: pin-update debe ir inlineado como función, no lanzado como archivo`);
  }
  assertEquals(malos, [], malos.join('\n'));
});

Deno.test('skills-online: O2 cada script de tools/ y cada CLI online está documentado con la URL @main de su bundle y --reload', () => {
  const malos: string[] = [];
  for (const [desde, hacia] of entradas) {
    const url = `${RAW}/main/dist/cdn/${hacia}`;
    const donde = mds.filter((m) => m.t.includes(url));
    if (!donde.length) { malos.push(`${desde}: ninguna skill cita ${url}`); continue; }
    if (!donde.some((m) => m.t.includes(RELOAD))) malos.push(`${desde}: la skill que lo cita no muestra la forma canónica con ${RELOAD}`);
  }
  assertEquals(malos, [], malos.join('\n'));
});

Deno.test('skills-online: O3 ninguna skill invoca un tools/ o CLI online por ruta local, por SHA ni por la fuente .ts', () => {
  const malos: string[] = [];
  for (const { f, t } of mds) {
    for (const [i, l] of t.split('\n').entries()) {
      if (/deno run[^\n]*<kit>\/skills\/[^\s]+\/tools\//.test(l)) malos.push(`${f}:${i + 1}: ruta local del checkout`);
      if (/raw\.githubusercontent\.com\/[^/\s]+\/[^/\s]+\/(?:[0-9a-f]{40}|<sha40>)\/skills\/[^\s]+\/tools\//.test(l)) malos.push(`${f}:${i + 1}: tools por SHA (va por main)`);
      if (/deno run[^\n]*raw\.githubusercontent\.com\/[^/\s]+\/[^/\s]+\/main\/(?:src\/vendor-distributions\/[^\s]+\.ts|skills\/[^\s]+\/tools\/[^\s]+\.ts)/.test(l)) malos.push(`${f}:${i + 1}: fuente .ts por main (va el bundle de dist/cdn)`);
    }
  }
  assertEquals(malos, [], malos.join('\n'));
});

Deno.test('skills-online: O4 vendor.ts al traer una skill salta tools/** y los scripts', async () => {
  const { archivosDeSkill } = await import('../../../vendor-distributions/shared/tools/vendor.ts');
  const lista = ['skills/x/SKILL.md', 'skills/x/references/01.md', 'skills/x/tools/a.ts', 'skills/x/tools/b.md', 'skills/x/templates/c.ts', 'skills/x/templates/d.json', 'skills/x/e.mjs'];
  assertEquals(archivosDeSkill('skills/x', lista), ['skills/x/SKILL.md', 'skills/x/references/01.md', 'skills/x/templates/d.json']);
  assertEquals(archivosDeSkill('dist/cdn/x', ['dist/cdn/x/a.ts']), ['dist/cdn/x/a.ts'], 'fuera de skills/ no se filtra');
});
