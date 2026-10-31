// tests/gobernanza/contrato-anatomia.test.ts
//
// Anatomía de cada componente: .ts, .scss, .md y .json iswc-preview/v1 con el mismo nombre, en toda
// categoría. Un subcomponente, página o utilidad sin .ts o .scss propios lo declara en su .json:
// `"anatomy": { "scss": "padre.scss" }` o `"anatomy": {}`. Las fichas son UTF-8 limpio y su API no
// queda en texto de relleno.
//
// Uso: deno run -A --no-check tests/gobernanza/contrato-anatomia.test.ts
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { resolverAnatomia } from '../../src/previews/_kit/anatomia.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const RAIZ = join(ROOT, 'src', 'components');
/** Categorías cerradas; las demás entran al terminar su frente. */
const CARPETAS = ['charts', 'code', 'data', 'data-viz', 'diagrams', 'files', 'helpers', 'media', 'preview'];
/** Bases internas sin tag: no son componentes. */
const BASES = /^_/;
/** Otro frente los está migrando: se suman al contrato al cerrar. */
const AJENOS = /^(ag-grid|data-grid|spreadsheet)(\.|$)/;
const MOJIBAKE = /Ã[\u0080-¿¡-¿]|â€|â†|Â[¡-¿]/;
const RELLENO = 'según contrato';

const nombres = (dir: string): string[] => {
  const n = new Set(readdirSync(dir).map((f) => /^(.+)\.(ts|md|json)$/.exec(f)?.[1]).filter(Boolean) as string[]);
  return [...n].filter((x) => x !== 'index' && !BASES.test(x) && !AJENOS.test(x)).sort();
};

test('gobernanza/contrato-anatomia', () => {
  const fallos: string[] = [];
  for (const carpeta of CARPETAS) {
    const dir = join(RAIZ, carpeta);
    if (!statSync(dir).isDirectory()) continue;
    for (const n of nombres(dir)) {
      const base = join(dir, n);
      const id = `${carpeta}/${n}`;
      if (!existsSync(`${base}.json`)) { fallos.push(`${id}: falta .json`); continue; }
      const def = JSON.parse(readFileSync(`${base}.json`, 'utf8'));
      if (def.$schema !== 'iswc-preview/v1') fallos.push(`${id}.json: $schema distinto de iswc-preview/v1`);
      if (!def.sections?.some((s: { blocks?: unknown[] }) => s.blocks?.length)) fallos.push(`${id}.json: sin bloques`);
      const declarada = def.anatomy as { scss?: string } | undefined;
      if (declarada?.scss) {
        if (!existsSync(join(dir, declarada.scss))) fallos.push(`${id}.json: anatomy.scss ${declarada.scss} no existe`);
      } else if (!declarada) {
        for (const ext of ['ts', 'scss']) if (!existsSync(`${base}.${ext}`)) fallos.push(`${id}: falta .${ext} y no declara anatomy`);
      }
      if (!existsSync(`${base}.md`)) { fallos.push(`${id}: falta .md`); continue; }
      const md = readFileSync(`${base}.md`, 'utf8');
      if (md.charCodeAt(0) === 0xfeff) fallos.push(`${id}.md: BOM`);
      if (MOJIBAKE.test(md)) fallos.push(`${id}.md: doble codificación`);
      if (!md.startsWith('---')) fallos.push(`${id}.md: sin frontmatter`);
      if (md.includes(RELLENO)) fallos.push(`${id}.md: API con texto de relleno`);
    }
  }
  assert.deepEqual(fallos, []);
  console.log('contrato-anatomia.test.ts: PASS');
});

test('gobernanza/resolver-anatomia', () => {
  const json = 'https://x.test/dist/previews/data/kanban-card.json';
  assert.equal(resolverAnatomia(undefined, json).scss, 'https://x.test/dist/previews/data/kanban-card.scss');
  assert.equal(resolverAnatomia({ scss: 'kanban.scss' }, json).scss, 'https://x.test/dist/previews/data/kanban.scss');
  assert.deepEqual(resolverAnatomia({}, json), {});
});

test('gobernanza/bundle-publica-scss', () => {
  assert.ok(readFileSync(join(ROOT, 'scripts', 'bundle-scripts.mjs'), 'utf8').includes("entry.name.endsWith('.scss')"));
});

export default lista();
