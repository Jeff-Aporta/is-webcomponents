/**
 * skill-manifest-cruce.test.ts — el índice de la skill general (`skills/iswc-root/SKILL.md`) lista
 * TODOS los componentes del manifest: un agente que lea la skill encuentra cada tag publicado con su
 * guía. Un tag nuevo en `src/manifest.ts` sin fila en la skill rompe aquí.
 *
 *   deno test -A --no-check tests/gobernanza/skill-manifest-cruce.test.ts
 */
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });


const RAIZ = join(import.meta.dirname, '..', '..', '..', '..');
const manifest = readFileSync(join(RAIZ, 'src', 'manifest.ts'), 'utf8');
const skill = readFileSync(join(RAIZ, 'skills', 'iswc-root', 'SKILL.md'), 'utf8');
/** Tags del manifest con su categoría, en orden de aparición. */
const tags = [...manifest.matchAll(/tag:\s*'(iswc-[^']+)'[^\n]*?category:\s*'([^']+)'/g)].map((m) => ({ tag: m[1]!, categoria: m[2]! }));
const catalogo = skill.match(/<!-- catalogo:inicio -->([\s\S]*)<!-- catalogo:fin -->/)?.[1] ?? '';
/** Filas del catálogo: tag → { resumen, guía } (la guía puede ir embebida en el resumen: fila de 2 celdas). */
const filas = new Map([...catalogo.matchAll(/^\| `<(iswc-[\w-]+)>` \| (.*?)\s*\|\r?$/gm)].map((m) => {
  const celdas = m[2]!.split(/\s\|\s/);
  return [m[1]!, { resumen: celdas[0]!, guia: celdas[1] ?? '' }];
}));
/** Tags que la skill omite a propósito (building blocks internos): fila `| _omitido_ | … `<iswc-x>` … |`. */
const omitidos = new Set([...catalogo.matchAll(/^\| _omitido_ \|(.*)$/gm)].flatMap((m) => [...m[1]!.matchAll(/`<(iswc-[\w-]+)>`/g)].map((t) => t[1]!)));

test('la skill tiene el bloque de catálogo y el manifest tiene componentes', () => {
  assert.ok(catalogo.length > 0, 'bloque <!-- catalogo:inicio --> … <!-- catalogo:fin -->');
  assert.ok(tags.length > 100, `manifest con componentes (${tags.length})`);
});

test('cero componentes del manifest ausentes en SKILL.md', () => {
  const faltan = tags.filter((t) => !filas.has(t.tag) && !omitidos.has(t.tag)).map((t) => `${t.tag} (${t.categoria})`);
  assert.deepEqual(faltan, [], `faltan en skills/iswc-root/SKILL.md:\n  ${faltan.join('\n  ')}`);
});

test('cada tag del manifest está en la tabla de su categoría', () => {
  const secciones = [...catalogo.matchAll(/^### ([\w-]+)\r?\n([\s\S]*?)(?=^### |<!-- catalogo:fin -->|$(?![\s\S]))/gm)];
  const categoriaDe = new Map<string, string>();
  for (const [, nombre, cuerpo] of secciones) {
    for (const m of cuerpo!.matchAll(/^\| `<(iswc-[\w-]+)>`/gm)) if (!categoriaDe.has(m[1]!)) categoriaDe.set(m[1]!, nombre!);
  }
  const mal = tags.filter((t) => !omitidos.has(t.tag) && categoriaDe.get(t.tag) !== t.categoria).map((t) => `${t.tag}: skill=${categoriaDe.get(t.tag) ?? '—'} manifest=${t.categoria}`);
  assert.deepEqual(mal, []);
});

test('cada fila del catálogo tiene resumen y una guía que existe (o «—» si el componente no tiene ficha)', () => {
  const problemas: string[] = [];
  for (const [tag, { resumen, guia }] of filas) {
    if (!resumen.trim()) problemas.push(`${tag}: sin resumen`);
    // Guía: celda propia `[ruta](url)`, «—» si no hay ficha, o enlaces dentro del resumen (fila de 2 celdas).
    const enlaces = [...`${resumen} ${guia}`.matchAll(/\[([^\]]+\.md)\]\(/g)].map((m) => m[1]!);
    if (!enlaces.length && guia.trim() !== '—') problemas.push(`${tag}: sin guía «${guia}»`);
    for (const rel of enlaces) if (!existsSync(join(RAIZ, 'src', 'components', rel))) problemas.push(`${tag}: guía inexistente ${rel}`);
  }
  assert.deepEqual(problemas, []);
});

test('el catálogo no lista tags que ya no están en el manifest', () => {
  const vivos = new Set(tags.map((t) => t.tag));
  const huerfanos = [...filas.keys()].filter((t) => !vivos.has(t));
  assert.deepEqual(huerfanos, [], 'filas huérfanas (componente retirado del manifest)');
});

export default lista();
