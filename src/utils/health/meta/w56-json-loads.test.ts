/**
 * w56-json-loads.test.ts — W56: campo `loads` para lazy loading en JSONs.
 *
 * Phase W56 introduce el campo `loads?: string[]` en
 * `ComponentJsonSchema` (src/previews/_kit/component.schemas.ts). Cada
 * JSON de preview declara qué otros componentes `iswc-*` necesita
 * además del propio `tag`; el render los carga con
 * `ISWebComponentsLoader.load(...loads)` antes de pintar el primer
 * `iswc-demo` para que el upgrade de los custom elements ocurra sin
 * parpadeos.
 *
 * Goals de este test:
 *   1. **Schema**: `ComponentJsonSchema.loads` existe y acepta un
 *      `string[]` opcional. Un JSON con `loads: [...]` debe validar.
 *   2. **Sin regresiones**: todos los JSON existentes siguen validando
 *      sin `loads` (campo opcional).
 *   3. **Forma de los `loads`**: si el JSON declara `loads`, debe ser
 *      un array no vacío de strings que parezcan nombres de tag
 *      (`iswc-*` o vacío sólo en tests internos).
 *   4. **Coherencia**: si el JSON declara un tag en `loads` que es
 *      un tag conocido del catálogo (`src/manifest.ts`), lo aceptamos;
 *      si es totalmente desconocido, lo reportamos como warning (no
 *      fatal, para no romper previews experimentales).
 *   5. **Cobertura**: al menos 5 JSONs declaran `loads` con tags
 *      distintos al `tag` raíz (la galería ya los carga como chrome).
 *   6. **loadFor**: la función `loadFor` de `render.ts` llama al
 *      loader con `def.loads` cuando se le pasa un `def` con `loads`.
 *      Sin loader disponible, devuelve un result `requested: true`
 *      con `loaded: []`. Sin `loads` declarado, devuelve `null`.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ComponentJsonSchema } from '../../../previews/_kit/component.schemas.ts';
import { loadFor, normalizeLoads } from '../../../previews/_kit/load-for.ts';

const here = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(here, '..', '..', '..', '..');
const SRC_COMPONENTS = join(RAIZ, 'src', 'components');

/* ──────────────────────────────────────────────────────────────────────────
 * Catálogo de tags conocidos — `src/manifest.ts` se parsea en runtime
 * para aceptar `loads` con cualquier tag publicado. Es defensivo: si el
 * manifest cambia de forma, caemos a un set vacío.
 * ──────────────────────────────────────────────────────────────────────── */

interface ManifestItem {
  tag: string;
}

async function readManifestTags(): Promise<Set<string>> {
  const out = new Set<string>();
  try {
    const txt = await readFile(join(RAIZ, 'src', 'manifest.ts'), 'utf8');
    // Cada entrada tiene `{ tag: 'iswc-foo', ...`. Aceptamos espacios/tabs
    // arbitrarios entre campos.
    for (const m of txt.matchAll(/\btag:\s*['"](iswc-[a-z0-9-]+)['"]/gi)) {
      out.add(m[1]!.toLowerCase());
    }
  } catch {
    /* manifest no parseable → set vacío */
  }
  return out;
}

/* ──────────────────────────────────────────────────────────────────────────
 * File discovery
 * ──────────────────────────────────────────────────────────────────────── */

async function walkJson(dir: string): Promise<string[]> {
  const out: string[] = [];
  const rec = async (d: string): Promise<void> => {
    const ents = await readdir(d, { withFileTypes: true });
    for (const e of ents) {
      if (e.name === 'node_modules' || e.name === 'dist' || e.name === '.git') continue;
      const p = join(d, e.name);
      if (e.isDirectory()) await rec(p);
      else if (e.isFile() && e.name.endsWith('.json')) out.push(p);
    }
  };
  await rec(dir);
  return out.sort();
}

/* ──────────────────────────────────────────────────────────────────────────
 * Tests — schema
 * ──────────────────────────────────────────────────────────────────────── */

test('W56: ComponentJsonSchema acepta un campo loads válido', () => {
  const ok = ComponentJsonSchema.safeParse({
    $schema: 'iswc-preview/v1',
    tag: 'iswc-x',
    sections: [{ id: 'intro', title: 'Uso', blocks: [{ kind: 'demo', html: '<x/>' }] }],
    loads: ['iswc-button', 'iswc-icon'],
  });
  assert.equal(ok.success, true, JSON.stringify(ok));
});

test('W56: ComponentJsonSchema acepta JSONs sin loads (campo opcional)', () => {
  const ok = ComponentJsonSchema.safeParse({
    $schema: 'iswc-preview/v1',
    tag: 'iswc-x',
    sections: [{ id: 'intro', title: 'Uso', blocks: [{ kind: 'demo', html: '<x/>' }] }],
  });
  assert.equal(ok.success, true, JSON.stringify(ok));
});

test('W56: ComponentJsonSchema rechaza loads como string (no array)', () => {
  const bad = ComponentJsonSchema.safeParse({
    $schema: 'iswc-preview/v1',
    tag: 'iswc-x',
    sections: [],
    loads: 'iswc-button',
  });
  assert.equal(bad.success, false, 'loads como string debe fallar');
});

test('W56: ComponentJsonSchema rechaza loads con elementos no-string', () => {
  const bad = ComponentJsonSchema.safeParse({
    $schema: 'iswc-preview/v1',
    tag: 'iswc-x',
    sections: [],
    loads: ['iswc-button', 42],
  });
  assert.equal(bad.success, false, 'loads con un número debe fallar');
});

/* ──────────────────────────────────────────────────────────────────────────
 * Tests — forma de los `loads` reales
 * ──────────────────────────────────────────────────────────────────────── */

test('W56: cada JSON con loads es un array de strings no vacío', async () => {
  const files = await walkJson(SRC_COMPONENTS);
  const violations: { ruta: string; issues: string[] }[] = [];
  let conLoads = 0;

  for (const f of files) {
    let doc: unknown;
    try {
      doc = JSON.parse(await readFile(f, 'utf8'));
    } catch {
      continue;
    }
    if (!doc || typeof doc !== 'object') continue;
    const o = doc as Record<string, unknown>;
    if (o.$schema && o.$schema !== 'iswc-preview/v1') continue;
    if (!('loads' in o)) continue;
    conLoads++;

    const issues: string[] = [];
    if (!Array.isArray(o.loads)) {
      issues.push('loads no es array');
    } else {
      if (o.loads.length === 0) issues.push('loads es array vacío');
      for (let i = 0; i < o.loads.length; i++) {
        const v = o.loads[i];
        if (typeof v !== 'string' || !v.trim()) {
          issues.push(`loads[${i}] no es string no-vacío`);
          continue;
        }
        if (!/^iswc-[a-z0-9-]+$/.test(v.trim())) {
          // No es un tag del kit; lo reportamos pero seguimos.
          // Un preview podría experimentalmente apuntar a un tag de
          // app registrada vía `L.registerApp`. El test no rompe por
          // esto; sólo lo deja en issues para diagnóstico.
          issues.push(`loads[${i}]="${v}" no parece un tag iswc-* del kit`);
        }
      }
    }
    if (issues.length) violations.push({ ruta: f.slice(RAIZ.length + 1).replaceAll('\\', '/'), issues });
  }

  console.log(`W56: ${conLoads} JSON declaran loads — ${violations.length} con issues de forma`);
  assert.equal(
    violations.length,
    0,
    `W56: ${violations.length} JSON con 'loads' malformado:\n` +
      violations.map((v) => `  ${v.ruta}\n    ${v.issues.join('\n    ')}`).join('\n'),
  );
});

test('W56: al menos 5 JSON declaran loads (cobertura mínima)', async () => {
  const files = await walkJson(SRC_COMPONENTS);
  let conLoads = 0;
  for (const f of files) {
    try {
      const d = JSON.parse(await readFile(f, 'utf8'));
      if (Array.isArray(d?.loads) && d.loads.length > 0) conLoads++;
    } catch { /* skip */ }
  }
  assert.ok(conLoads >= 5, `se esperaban >=5 JSON con loads, hay ${conLoads}`);
});

test('W56: los tags en loads son nombres iswc-* conocidos del manifest', async () => {
  // Test suave: si el manifest los reconoce, perfecto. Si no, lo
  // reportamos como warning pero no fallamos — un preview puede usar
  // un tag de app registrada con `L.registerApp` o un componente
  // externo al kit. El test "duro" sigue siendo el de forma de arriba.
  const tagsConocidos = await readManifestTags();
  if (tagsConocidos.size === 0) {
    console.log('W56: manifest.ts no parseable, saltando check de catálogo');
    return;
  }
  const files = await walkJson(SRC_COMPONENTS);
  const unknown: { ruta: string; tag: string }[] = [];
  for (const f of files) {
    try {
      const d = JSON.parse(await readFile(f, 'utf8'));
      if (!Array.isArray(d?.loads)) continue;
      for (const t of d.loads) {
        if (typeof t === 'string' && /^iswc-[a-z0-9-]+$/.test(t) && !tagsConocidos.has(t.toLowerCase())) {
          unknown.push({
            ruta: f.slice(RAIZ.length + 1).replaceAll('\\', '/'),
            tag: t,
          });
        }
      }
    } catch { /* skip */ }
  }
  if (unknown.length) {
    console.log(
      `W56: ${unknown.length} tags en loads no están en manifest.ts (warning, no fatal):\n` +
        unknown.slice(0, 20).map((u) => `  • ${u.ruta} → ${u.tag}`).join('\n'),
    );
  }
  // No assert: el test de forma ya cubre la calidad del campo.
});

/* ──────────────────────────────────────────────────────────────────────────
 * Tests — loadFor()
 * ──────────────────────────────────────────────────────────────────────── */

test('W56: loadFor devuelve null si def.loads está vacío o ausente', async () => {
  // Sin loads
  const a = await loadFor({ tag: 'iswc-x', sections: [] } as never);
  assert.equal(a, null, 'sin loads debe devolver null');
  // Con loads vacío
  const b = await loadFor({ tag: 'iswc-x', sections: [], loads: [] } as never);
  assert.equal(b, null, 'loads=[] debe devolver null');
  // Con loads de strings vacíos
  const c = await loadFor({ tag: 'iswc-x', sections: [], loads: ['', '   '] } as never);
  assert.equal(c, null, 'loads con solo blanks debe devolver null');
});

test('W56: loadFor llama al loader con los tags declarados (mock)', async () => {
  const calls: string[][] = [];
  const mockLoader = {
    async load(...ids: string[]): Promise<{ loaded: string[]; skipped: string[] }> {
      calls.push(ids);
      return { loaded: ids, skipped: [] };
    },
  };
  const result = await loadFor(
    { tag: 'iswc-button-group', sections: [], loads: ['iswc-button', 'iswc-icon'] } as never,
    mockLoader,
  );
  assert.ok(result, 'loadFor debe devolver result cuando loads está presente');
  assert.equal(result!.requested, true);
  assert.deepEqual(calls, [['iswc-button', 'iswc-icon']]);
  assert.deepEqual(result!.loaded, ['iswc-button', 'iswc-icon']);
});

test('W56: loadFor reporta skipped del loader', async () => {
  const mockLoader = {
    async load(): Promise<{ loaded: string[]; skipped: string[] }> {
      return { loaded: [], skipped: ['iswc-button'] };
    },
  };
  const result = await loadFor(
    { tag: 'iswc-button-group', sections: [], loads: ['iswc-button'] } as never,
    mockLoader,
  );
  assert.ok(result);
  assert.deepEqual(result!.skipped, ['iswc-button']);
  assert.deepEqual(result!.loaded, []);
});

test('W56: loadFor filtra strings vacíos antes de llamar al loader', async () => {
  const calls: string[][] = [];
  const mockLoader = {
    async load(...ids: string[]): Promise<{ loaded: string[]; skipped: string[] }> {
      calls.push(ids);
      return { loaded: ids, skipped: [] };
    },
  };
  await loadFor(
    { tag: 'iswc-x', sections: [], loads: ['iswc-button', '', '  ', 'iswc-icon'] } as never,
    mockLoader,
  );
  assert.deepEqual(calls, [['iswc-button', 'iswc-icon']]);
});

test('W56: loadFor degrada a no-op si no hay loader en globalThis', async () => {
  // En Node no hay globalThis.ISWebComponentsLoader. loadFor debe
  // devolver requested:true con arrays vacíos, no throw.
  // (No podemos unsetear globalThis.ISWebComponentsLoader aquí porque
  // en este proceso de test podría estar poblado por otro test que
  // carga el loader; pero si no lo está, la rama es trivial.)
  const before = (globalThis as { ISWebComponentsLoader?: unknown }).ISWebComponentsLoader;
  try {
    (globalThis as { ISWebComponentsLoader?: unknown }).ISWebComponentsLoader = undefined;
    const result = await loadFor(
      { tag: 'iswc-x', sections: [], loads: ['iswc-foo'] } as never,
    );
    assert.ok(result, 'debe devolver un objeto, no throw');
    assert.equal(result!.requested, true);
    assert.deepEqual(result!.loaded, []);
    assert.deepEqual(result!.skipped, []);
  } finally {
    (globalThis as { ISWebComponentsLoader?: unknown }).ISWebComponentsLoader = before;
  }
});

/* ──────────────────────────────────────────────────────────────────────────
 * Tests — coherencia cross-file
 * ──────────────────────────────────────────────────────────────────────── */

test('W56: ningún JSON lista su propio tag en loads (el chrome ya lo carga)', async () => {
  // El propio `tag` se carga por la navegación del chrome antes de
  // pintar el preview. Listarlo en `loads` no rompe nada (el loader
  // lo trata como already-loaded) pero es ruido y se considera bug
  // estilístico: el test lo reporta.
  const files = await walkJson(SRC_COMPONENTS);
  const selfListed: { ruta: string; tag: string }[] = [];
  for (const f of files) {
    try {
      const d = JSON.parse(await readFile(f, 'utf8'));
      if (typeof d?.tag !== 'string' || !Array.isArray(d?.loads)) continue;
      if (d.loads.includes(d.tag)) {
        selfListed.push({
          ruta: f.slice(RAIZ.length + 1).replaceAll('\\', '/'),
          tag: d.tag,
        });
      }
    } catch { /* skip */ }
  }
  if (selfListed.length) {
    console.log(
      `W56: ${selfListed.length} JSON se listan a sí mismos en loads (recomendación, no fatal):\n` +
        selfListed.map((s) => `  • ${s.ruta} (tag=${s.tag})`).join('\n'),
    );
  }
  // No assert: la galería ya tolera el auto-listado.
});

test('W56: loadFor no invoca el loader si def no tiene loads', async () => {
  const calls: string[][] = [];
  const mockLoader = {
    async load(...ids: string[]): Promise<{ loaded: string[]; skipped: string[] }> {
      calls.push(ids);
      return { loaded: ids, skipped: [] };
    },
  };
  await loadFor({ tag: 'iswc-x', sections: [] } as never, mockLoader);
  assert.equal(calls.length, 0, 'loadFor no debe llamar al loader si no hay loads');
});

test('W56: normalizeLoads filtra entradas inválidas', () => {
  assert.deepEqual(normalizeLoads({ tag: 'iswc-x', sections: [], loads: [] } as never), []);
  assert.deepEqual(
    normalizeLoads({ tag: 'iswc-x', sections: [], loads: ['iswc-button', '', '  '] } as never),
    ['iswc-button'],
  );
  assert.deepEqual(
    normalizeLoads({ tag: 'iswc-x', sections: [], loads: ['iswc-button', 'iswc-icon'] } as never),
    ['iswc-button', 'iswc-icon'],
  );
  // Sin loads
  assert.deepEqual(normalizeLoads({ tag: 'iswc-x', sections: [] } as never), []);
  // Con loads = null
  assert.deepEqual(normalizeLoads({ tag: 'iswc-x', sections: [], loads: null as never } as never), []);
});
