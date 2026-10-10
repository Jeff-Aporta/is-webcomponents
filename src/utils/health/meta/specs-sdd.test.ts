/**
 * Guardián de la estructura de `specs/` (testing.md S-T4 y flujo-sdd «WHAT primero»).
 *   E1 archivos obligatorios presentes; sin `spec-*.md` sueltos en la raíz.
 *   E2 cada dominio con `spec.md` figura en el mapa del README y cita al menos un `*.test.ts` existente.
 *   E3 los enlaces relativos de los markdown de `specs/` resuelven.
 *   E4 un spec con sección `## HOW` la pone después de `## WHAT`.
 * Uso: deno test -A --no-check src/utils/health/meta/specs-sdd.test.ts
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../..');
const SPECS = join(ROOT, 'specs');
const md = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? md(p) : f.endsWith('.md') ? [p] : [];
});

Deno.test('specs: E1 obligatorios y sin spec-*.md sueltos', () => {
  for (const f of ['README.md', 'flujo-sdd.md', 'constitution.md', 'constraints.md', 'adr.md', 'lessons.md', 'plantillas/spec.template.md', 'plantillas/tasks.template.md']) {
    assert(existsSync(join(SPECS, f)), `falta specs/${f}`);
  }
  const sueltos = readdirSync(SPECS).filter((f) => /^spec-.*\.md$/.test(f));
  assert(!sueltos.length, `spec-*.md sueltos: ${sueltos.join(', ')}`);
});

Deno.test('specs: E2 cada dominio en el mapa y con guardián citado', () => {
  const readme = readFileSync(join(SPECS, 'README.md'), 'utf8');
  const dominios = readdirSync(SPECS).filter((d) => existsSync(join(SPECS, d, 'spec.md')));
  const fallas: string[] = [];
  for (const d of dominios) {
    if (!readme.includes(`(${d}/spec.md)`)) fallas.push(`${d}: no está en el mapa del README`);
    const texto = readFileSync(join(SPECS, d, 'spec.md'), 'utf8');
    const citas = [...texto.matchAll(/[\w./-]+\.test\.(?:ts|mjs)/g)].map((m) => m[0]);
    if (!citas.some((c) => existsSync(join(ROOT, c)))) fallas.push(`${d}: no cita un guardián existente (${citas.join(', ') || 'ninguno'})`);
  }
  assert(!fallas.length, fallas.join('\n'));
});

Deno.test('specs: E3 enlaces relativos resuelven', () => {
  const rotos: string[] = [];
  for (const f of md(SPECS)) {
    const texto = readFileSync(f, 'utf8').replace(/```[\s\S]*?```/g, '');
    for (const m of texto.matchAll(/\]\(([^)\s#]+)(?:#[^)]*)?\)/g)) {
      const href = m[1]!;
      if (/^[a-z]+:/i.test(href) || href.includes('<')) continue;
      if (!existsSync(resolve(dirname(f), href))) rotos.push(`${f.slice(ROOT.length + 1)} → ${href}`);
    }
  }
  assert(!rotos.length, rotos.join('\n'));
});

Deno.test('specs: E4 WHAT antes que HOW', () => {
  for (const f of md(SPECS)) {
    const t = readFileSync(f, 'utf8');
    const how = t.search(/^## HOW\b/m);
    if (how < 0) continue;
    const what = t.search(/^## WHAT\b/m);
    assert(what >= 0 && what < how, `${f.slice(ROOT.length + 1)}: ## HOW sin ## WHAT antes`);
  }
});
