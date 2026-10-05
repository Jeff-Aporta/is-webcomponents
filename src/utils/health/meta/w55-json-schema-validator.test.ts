/**
 * w55-json-schema-validator.test.ts — W55: Canonical schema validation for every
 * component JSON in `src/components/.../*.json`.
 *
 * Goals:
 *   - Walk every JSON under `src/components/`.
 *   - For each one, parse it against `ComponentJsonSchema` from
 *     `src/previews/_kit/component.schemas.ts`.
 *   - Skip JSONs that use a different `$schema` (currently only the
 *     diagram theme `iswc-diagram-theme/v1`). Log them in a separate
 *     bucket so we can detect drift.
 *   - Fail with a clear, actionable report if any JSON does not validate.
 *
 * Phase-3 of W55 (zod unification). The schema is permissive
 * (`.passthrough()` everywhere) so the goal is NOT to break JSONs that
 * carry custom fields — the goal is to flag a real structural issue
 * (missing `tag`, malformed blocks, unknown `kind`, etc.) before it
 * reaches production.
 *
 * Output convention: `console.log('w55-json-schema-validator.test.ts: PASS — <summary>')`
 * so the runner can enumerate it (see AGENTS.md §7.3).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdir, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ComponentJsonSchema } from '../../../previews/_kit/component.schemas.ts';

const here = dirname(fileURLToPath(import.meta.url));
const RAIZ = join(here, '..', '..', '..', '..');
const SRC_COMPONENTS = join(RAIZ, 'src', 'components');

/* ──────────────────────────────────────────────────────────────────────────
 * File discovery
 * ──────────────────────────────────────────────────────────────────────── */

async function walk(dir: string): Promise<string[]> {
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

interface Hallazgo {
  ruta: string;
  issues: string[];
}

interface Reporte {
  total: number;
  validados: string[];
  noValidados: Hallazgo[];
  otrasSchemas: { ruta: string; schema: string }[];
}

/* ──────────────────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────────────────── */

/**
 * Resume un ZodError en una lista corta de strings legibles.
 * Mantiene sólo lo accionable (ruta + tipo + mensaje corto).
 */
function resumeIssues(err: import('zod').ZodError): string[] {
  return err.issues.slice(0, 8).map((i) => {
    const ruta = i.path.length > 0 ? i.path.join('.') : '<root>';
    const code = i.code;
    return `${ruta} (${code}): ${i.message}`;
  });
}

/* ──────────────────────────────────────────────────────────────────────────
 * Tests
 * ──────────────────────────────────────────────────────────────────────── */

test('W55: localiza y reporta todos los JSON de src/components', async () => {
  const files = await walk(SRC_COMPONENTS);
  assert.ok(files.length >= 100, `se esperaban ≥100 JSON, hay ${files.length}`);

  const reporte: Reporte = {
    total: files.length,
    validados: [],
    noValidados: [],
    otrasSchemas: [],
  };

  for (const f of files) {
    const rel = f.slice(RAIZ.length + 1).replaceAll('\\', '/');
    let text: string;
    try {
      text = await readFile(f, 'utf8');
    } catch (err) {
      reporte.noValidados.push({ ruta: rel, issues: [`read failed: ${(err as Error).message}`] });
      continue;
    }

    let doc: unknown;
    try {
      doc = JSON.parse(text);
    } catch (err) {
      reporte.noValidados.push({ ruta: rel, issues: [`JSON parse failed: ${(err as Error).message}`] });
      continue;
    }

    if (!doc || typeof doc !== 'object') {
      reporte.noValidados.push({ ruta: rel, issues: ['root no es objeto'] });
      continue;
    }

    const o = doc as Record<string, unknown>;
    const schemaId = typeof o.$schema === 'string' ? o.$schema : null;

    // Skip diagram themes: distintos `$schema`, distintos campos.
    if (schemaId && schemaId !== 'iswc-preview/v1') {
      reporte.otrasSchemas.push({ ruta: rel, schema: schemaId });
      continue;
    }

    const result = ComponentJsonSchema.safeParse(doc);
    if (result.success) {
      reporte.validados.push(rel);
    } else {
      reporte.noValidados.push({ ruta: rel, issues: resumeIssues(result.error) });
    }
  }

  // ── Reporte final ─────────────────────────────────────────────────────────
  const lines: string[] = [];
  lines.push(`W55: ${reporte.total} JSON escaneados`);
  lines.push(`  - ${reporte.validados.length} validados OK`);
  lines.push(`  - ${reporte.noValidados.length} NO conformes`);
  lines.push(`  - ${reporte.otrasSchemas.length} con otra $schema (diagram-theme, etc.)`);

  if (reporte.noValidados.length > 0) {
    lines.push('');
    lines.push('NO CONFORMES:');
    for (const h of reporte.noValidados) {
      lines.push(`  • ${h.ruta}`);
      for (const msg of h.issues) lines.push(`      - ${msg}`);
    }
  }

  if (reporte.otrasSchemas.length > 0) {
    lines.push('');
    lines.push('OTRAS SCHEMAS:');
    for (const o of reporte.otrasSchemas) {
      lines.push(`  • ${o.ruta} (${o.schema})`);
    }
  }

  console.log(lines.join('\n'));

  // La aserción dura: si hay NO conformes, falla el test con el detalle
  // agregado de manera que la CI lo lea sin grep adicional.
  assert.equal(
    reporte.noValidados.length,
    0,
    `W55: ${reporte.noValidados.length} JSON no cumplen el esquema canónico. Detalle:\n` +
      reporte.noValidados.map((h) => `  ${h.ruta}\n    ${h.issues.join('\n    ')}`).join('\n'),
  );
});

test('W55: al menos una JSON usa $schema: iswc-preview/v1', async () => {
  // Defensa: si alguien borra TODAS las $schema, el test anterior pasa
  // con todo en otrasSchemas. Este test atrapa esa regresión.
  const files = await walk(SRC_COMPONENTS);
  let count = 0;
  for (const f of files) {
    try {
      const d = JSON.parse(await readFile(f, 'utf8'));
      if (d?.$schema === 'iswc-preview/v1') count++;
    } catch { /* skip */ }
  }
  assert.ok(count >= 100, `se esperaban ≥100 JSON con iswc-preview/v1, hay ${count}`);
});

test('W55: el theme JSON usa iswc-diagram-theme/v1 (excluido del validator)', async () => {
  // El theme `insoft.json` debe seguir usando su propio $schema y NO
  // iswc-preview/v1; si cambia a preview/v1, el validator anterior lo
  // capturaría y fallaría porque su shape es distinto.
  const themePath = join(SRC_COMPONENTS, 'diagrams', 'themes', 'insoft.json');
  const d = JSON.parse(await readFile(themePath, 'utf8'));
  assert.equal(d.$schema, 'iswc-diagram-theme/v1', 'insoft.json debe mantener su $schema de diagram-theme');
});

test('W55: ComponentJsonSchema acepta un documento mínimo válido', () => {
  const ok = ComponentJsonSchema.safeParse({
    $schema: 'iswc-preview/v1',
    tag: 'iswc-x',
    sections: [{ id: 'intro', title: 'Uso', blocks: [{ kind: 'demo', html: '<x/>' }] }],
  });
  assert.equal(ok.success, true, JSON.stringify(ok));
});

test('W55: ComponentJsonSchema rechaza un JSON sin tag', () => {
  const bad = ComponentJsonSchema.safeParse({
    $schema: 'iswc-preview/v1',
    sections: [{ id: 'intro', title: 'Uso', blocks: [{ kind: 'demo', html: '<x/>' }] }],
  });
  assert.equal(bad.success, false, 'sin tag debe fallar');
  if (!bad.success) {
    assert.ok(
      bad.error.issues.some((i) => i.path.includes('tag')),
      'el error debe apuntar a `tag`',
    );
  }
});

test('W55: ComponentJsonSchema rechaza un bloque con kind desconocido', () => {
  const bad = ComponentJsonSchema.safeParse({
    $schema: 'iswc-preview/v1',
    tag: 'iswc-x',
    sections: [{ id: 'intro', title: 'Uso', blocks: [{ kind: 'banana', html: '<x/>' }] }],
  });
  assert.equal(bad.success, false, 'kind desconocido debe fallar');
});

test('W55: ComponentJsonSchema acepta campos extra en la raíz (passthrough)', () => {
  const ok = ComponentJsonSchema.safeParse({
    $schema: 'iswc-preview/v1',
    tag: 'iswc-x',
    sections: [],
    customField: 'whatever',
    ficha: { sections: {}, exclude: [] },
  });
  assert.equal(ok.success, true, JSON.stringify(ok));
});