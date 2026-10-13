/**
 * Guardián WHAT de los scripts ONLINE del kit (Jeff, 2026-10-13): los CLI que los consumidores corren con Deno
 * desde `@main` con `--reload` y que NUNCA se vendorizan.
 *   O1 cada script de `skills/<skill>/tools/*.{ts,mjs}` y cada CLI online de `vendor-distributions/`
 *      (shared/tools/vendor.ts, shared/tools/pin-update.mjs, client/tools/download-iconify.ts,
 *      client/tools/render-lote.ts) aparece en alguna skill (`skills/**\/*.md`) con su URL exacta
 *      `https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/<ruta>` y, en esa misma skill, la forma
 *      canónica `--reload=https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/`.
 *   O2 ninguna skill invoca un script de `tools/` por ruta local del checkout (`<kit>/skills/…/tools/`) ni por SHA
 *      (`raw…/<sha40>/skills/…/tools/`): un consumidor solo lo corre online desde main.
 *   O3 `vendor.ts` al traer una skill (`carpeta: true`) salta `tools/**` y cualquier .ts/.mjs/.js/.cjs de la skill.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAW = 'https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents';
const RELOAD = `--reload=${RAW}/`;
const CLI_ONLINE = [
  'src/vendor-distributions/shared/tools/vendor.ts',
  'src/vendor-distributions/shared/tools/pin-update.mjs',
  'src/vendor-distributions/client/tools/download-iconify.ts',
  'src/vendor-distributions/client/tools/render-lote.ts',
];

function listar(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) listar(p, out); else out.push(p.replaceAll('\\', '/'));
  }
  return out;
}
const mds = listar('skills').filter((f) => f.endsWith('.md')).map((f) => ({ f, t: readFileSync(f, 'utf8') }));
const scriptsSkills = listar('skills').filter((f) => /\/tools\/[^/]+\.(ts|mjs)$/.test(f));

Deno.test('skills-online: O1 cada script de tools/ y cada CLI online está documentado con su URL @main y --reload', () => {
  assert(scriptsSkills.length >= 2, `pocos scripts en skills/*/tools: ${scriptsSkills.join(', ')}`);
  const malos: string[] = [];
  for (const ruta of [...scriptsSkills, ...CLI_ONLINE]) {
    const url = `${RAW}/main/${ruta}`;
    const donde = mds.filter((m) => m.t.includes(url));
    if (!donde.length) { malos.push(`${ruta}: ninguna skill cita ${url}`); continue; }
    if (!donde.some((m) => m.t.includes(RELOAD))) malos.push(`${ruta}: la skill que lo cita no muestra la forma canónica con ${RELOAD}`);
  }
  assertEquals(malos, [], malos.join('\n'));
});

Deno.test('skills-online: O2 ninguna skill invoca un tools/ por ruta local del checkout ni por SHA', () => {
  const malos: string[] = [];
  for (const { f, t } of mds) {
    for (const [i, l] of t.split('\n').entries()) {
      if (/deno run[^\n]*<kit>\/skills\/[^\s]+\/tools\//.test(l)) malos.push(`${f}:${i + 1}: ruta local del checkout`);
      if (/raw\.githubusercontent\.com\/[^/\s]+\/[^/\s]+\/(?:[0-9a-f]{40}|<sha40>)\/skills\/[^\s]+\/tools\//.test(l)) malos.push(`${f}:${i + 1}: tools por SHA (va por main)`);
    }
  }
  assertEquals(malos, [], malos.join('\n'));
});

Deno.test('skills-online: O3 vendor.ts al traer una skill salta tools/** y los scripts', async () => {
  const { archivosDeSkill } = await import('../../../vendor-distributions/shared/tools/vendor.ts');
  const lista = ['skills/x/SKILL.md', 'skills/x/references/01.md', 'skills/x/tools/a.ts', 'skills/x/tools/b.md', 'skills/x/templates/c.ts', 'skills/x/templates/d.json', 'skills/x/e.mjs'];
  assertEquals(archivosDeSkill('skills/x', lista), ['skills/x/SKILL.md', 'skills/x/references/01.md', 'skills/x/templates/d.json']);
  assertEquals(archivosDeSkill('dist/cdn/x', ['dist/cdn/x/a.ts']), ['dist/cdn/x/a.ts'], 'fuera de skills/ no se filtra');
  assert(relative('skills', 'skills/x') === 'x');
});
