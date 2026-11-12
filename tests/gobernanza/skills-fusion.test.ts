// @contexto INDICE.md · tests/gobernanza/README.md
// skills-fusion.test.ts — las skills del kit son 6; las 2 absorbidas son alias.
//
// Una skill absorbida deja de mantenerse: su contenido pasa a otra skill (seccion propia) y
// su carpeta queda como alias que apunta a la nueva. Este guardián vigila las tres cosas:
// que las 6 vigentes esten completas, que los alias apunten a donde deben y que no queden
// referencias colgando a skills que ya no existen.

import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const here = dirname(fileURLToPath(import.meta.url));
const RAIZ = dirname(dirname(here));
const SKILLS = join(RAIZ, 'skills');

/** Las 6 skills que se mantienen. */
const VIGENTES = [
  'iswc-base',
  'build-component',
  'is-cdn-install',
  'iswc-foundation',
  'iswc-server',
  'iswc-diagramas-enriquecidos',
];

/** Las absorbidas: alias -> skill que las absorbe. */
const ALIAS: Record<string, string> = {
  'document-component': 'build-component',
  'iswc-server-api-docs': 'iswc-server',
};

/** Los .md de skills/, con su ruta relativa al repo. */
function mdsDeSkills(): { rel: string; texto: string }[] {
  const salida: { rel: string; texto: string }[] = [];
  const rec = (dir: string) => {
    for (const e of readdirSync(dir, { withFileTypes: true })) {
      const p = join(dir, e.name);
      if (e.isDirectory()) rec(p);
      else if (e.name.endsWith('.md')) {
        salida.push({ rel: p.slice(RAIZ.length + 1).replaceAll('\\', '/'), texto: readFileSync(p, 'utf8') });
      }
    }
  };
  rec(SKILLS);
  return salida;
}

/** Los enlaces markdown relativos de un .md (no http, no anclas, no buzones). */
function enlaces(texto: string): string[] {
  const salida: string[] = [];
  for (const m of texto.matchAll(/\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g)) {
    const destino = m[1]!;
    if (/^(https?:|mailto:|#)/.test(destino)) continue;
    // Un destino entre comillas invertidas es una muestra de sintaxis, no un enlace.
    if (destino.startsWith('`') || destino.endsWith('`')) continue;
    salida.push(destino);
  }
  return salida;
}

test('gobernanza/skills-fusion: F1 las 6 skills vigentes estan completas', () => {
  for (const nombre of VIGENTES) {
    const rel = join('skills', nombre, 'SKILL.md');
    assert.ok(existsSync(join(RAIZ, rel)), `falta ${rel}`);
    const texto = readFileSync(join(RAIZ, rel), 'utf8');
    assert.match(texto, new RegExp(`^name:\\s*${nombre}\\s*$`, 'm'), `${rel}: name != ${nombre}`);
    // El BOM de algunos .md no rompe el frontmatter para los lectores que lo toleran.
    assert.match(texto, /^\uFEFF?---\r?\n[\s\S]*?\r?\n---\r?\n/, `${rel}: sin frontmatter`);
    assert.doesNotMatch(texto, /^\s*Alias\./m, `${rel}: una skill vigente no es un alias`);
  }
});

test('gobernanza/skills-fusion: F2 los 2 alias apuntan a la skill que los absorbe', () => {
  for (const [nombre, destino] of Object.entries(ALIAS)) {
    const rel = join('skills', nombre, 'SKILL.md');
    assert.ok(existsSync(join(RAIZ, rel)), `falta ${rel}`);
    const texto = readFileSync(join(RAIZ, rel), 'utf8');
    assert.match(texto, new RegExp(`^name:\\s*${nombre}\\s*$`, 'm'), `${rel}: name != ${nombre}`);
    assert.match(texto, /\n\s*Alias\./, `${rel}: la descripcion debe marcarlo como alias`);
    assert.ok(
      texto.includes(`../${destino}/SKILL.md`),
      `${rel}: no enlaza a ../${destino}/SKILL.md`,
    );
    assert.ok(existsSync(join(RAIZ, 'skills', destino, 'SKILL.md')), `la skill destino ${destino} no existe`);
  }
});

test(' gobernanza/skills-fusion: F3 no quedan folders de skill sin classify', () => {
  const carpetas = readdirSync(SKILLS, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name)
    .sort();
  const esperadas = [...VIGENTES, ...Object.keys(ALIAS)].sort();
  assert.deepEqual(carpetas, esperadas, `skills/ tiene ${carpetas.join(', ')}`);
});

test('gobernanza/skills-fusion: F4 el catalogo lista las 6 y marca las 2 alias', () => {
  const catalogo = readFileSync(join(SKILLS, 'README.md'), 'utf8');
  for (const nombre of VIGENTES) {
    assert.ok(catalogo.includes(`| \`${nombre}\` |`), `el catalogo no lista ${nombre}`);
  }
  for (const nombre of Object.keys(ALIAS)) {
    assert.ok(catalogo.includes(`| \`${nombre}\` |`), `el catalogo no lista el alias ${nombre}`);
  }
  assert.match(catalogo, /## Alias/, 'el catalogo no tiene seccion de alias');
});

test('gobernanza/skills-fusion: F5 los enlaces que navegan entre skills existen', () => {
  // Solo se comprueban los enlaces que un agente sigue de verdad: los que apuntan a otra
  // skill o a una de sus referencias. Los enlaces de ejemplo (sintaxis ilustrada) y los de
  // las plantillas de foundation (que nacen en la app del consumidor) no se comprueban.
  const nombres = new Set([...VIGENTES, ...Object.keys(ALIAS)]);
  const rotos: string[] = [];
  for (const { rel, texto } of mdsDeSkills()) {
    // Las referencias de iswc-server se vendorizan al consumidor: no viven en el repo.
    if (rel.startsWith('skills/iswc-server/references/')) continue;
    const esSkill = /^skills\/([^/]+)\/SKILL\.md$/.test(rel);
    for (const destino of enlaces(texto)) {
      const limpio = destino.split('#')[0]!;
      if (!limpio) continue;
      const aSkill = limpio.match(/^\.\.\/([^/]+)\//);
      const aReferencia = /^references\/[^/]+\.md$/.test(limpio);
      if (!aSkill && !aReferencia) continue;
      if (aSkill && !nombres.has(aSkill[1]!)) continue;
      // Las referencias de iswc-server se vendorizan (no estan en el repo).
      if (esSkill && rel === 'skills/iswc-server/SKILL.md' && aReferencia) continue;
      const absoluto = resolve(dirname(join(RAIZ, rel)), limpio);
      if (!existsSync(absoluto)) rotos.push(`${rel} -> ${destino}`);
    }
  }
  assert.deepEqual(rotos, [], `enlaces rotos:\n${rotos.join('\n')}`);
});

test('gobernanza/skills-fusion: F6 nadie cita una skill absorbida como si siguiera viva', () => {
  const permitidos = new Set([
    'skills/README.md',
    'skills/document-component/SKILL.md',
    'skills/iswc-server-api-docs/SKILL.md',
  ]);
  const citas: string[] = [];
  for (const { rel, texto } of mdsDeSkills()) {
    if (permitidos.has(rel)) continue;
    // La cabecera @vendor conserva el path de origen: no es una cita viva.
    const sinCabecera = texto.split('\n').filter((l) => !/^\s*<!-- @vendor/.test(l)).join('\n');
    for (const nombre of Object.keys(ALIAS)) {
      if (sinCabecera.includes(`skills/${nombre}`) || sinCabecera.includes(`../${nombre}/`)) {
        citas.push(`${rel} cita ${nombre}`);
      }
    }
  }
  assert.deepEqual(citas, [], `citas a skills absorbidas:\n${citas.join('\n')}`);
});

export default lista();
