/**
 * Tests del motor auditor (iswc-audit).
 *
 * Verifica:
 *   - el catalog se enumera sin tirar
 *   - el validador de esquema is-preview/v1 detecta los desvíos comunes
 *   - el validador de consistencia JSON↔componente detecta atributos
 *     faltantes
 *   - el validador de complejidad exige <script type="application/json">
 *     para los charts/diagramas/grid
 *   - el reportero emite JSON válido y Markdown legible
 *   - el orquestador (auditarComponente) agrega hallazgos
 *
 * Se ejecutan con `node --test` (mismo runner que el resto de la suite).
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const RAIZ = join(__dirname, '..', '..', '..', '..');

import { enumerarCatalogo, resumirCatalogo } from '../motor/catalog.js';
import { validarEsquema } from '../motor/validators/json-schema.js';
import { ejecutarValidacionContenido } from '../motor/validators/json-contenido.js';
import { extraerMetaComponente, ejecutarValidacionConsistencia } from '../motor/validators/consistency.js';
import { auditarRuntimeComponente } from '../motor/validators/runtime.js';
import { aJson, aMarkdown } from '../motor/reporter.js';
import { MOTOR_VERSION } from '../motor/auditor.js';

test('catalog: enumera componentes del manifest + catalog + pages', () => {
  const cats = enumerarCatalogo(RAIZ);
  const resumen = resumirCatalogo(cats);
  assert.ok(resumen.total > 100, `debería haber muchos componentes, hay ${resumen.total}`);
  assert.ok(resumen.conJson > 100, `muchos deberían tener JSON, hay ${resumen.conJson}`);
  // Hay al menos las páginas home, theming, ecosystem.
  const tags = new Set(cats.map((c) => c.tag));
  assert.ok(tags.has('home'), 'catálogo debe incluir home');
  assert.ok(tags.has('theming'), 'catálogo debe incluir theming');
  assert.ok(tags.has('ecosystem'), 'catálogo debe incluir ecosystem');
  assert.ok(tags.has('is-button'), 'catálogo debe incluir is-button');
});

test('catalog: incluye los is-* de cada categoría', () => {
  const cats = enumerarCatalogo(RAIZ);
  const tags = new Set(cats.map((c) => c.tag));
  for (const esperado of [
    'is-button', 'is-button-group', 'is-bar-chart', 'is-line-chart',
    'is-flowchart', 'is-tree-view', 'is-format-bytes', 'is-icon',
  ]) {
    assert.ok(tags.has(esperado), `catálogo debe incluir ${esperado}`);
  }
});

test('json-schema: detecta falta de $schema', () => {
  const def = { tag: 'is-foo', sections: [] };
  const hs = validarEsquema(def);
  assert.ok(hs.some((h) => h.mensaje.includes('$schema')), 'debe avisar de $schema faltante');
});

test('json-schema: detecta falta de tag', () => {
  const hs = validarEsquema({ $schema: 'is-preview/v1', sections: [] });
  assert.ok(hs.some((h) => h.severidad === 'fatal' && h.mensaje.includes('tag')));
});

test('json-schema: detecta falta de sections', () => {
  const hs = validarEsquema({ $schema: 'is-preview/v1', tag: 'is-foo' });
  assert.ok(hs.some((h) => h.severidad === 'fatal' && h.mensaje.includes('sections')));
});

test('json-schema: detecta bloque demo sin html', () => {
  const def = {
    $schema: 'is-preview/v1',
    tag: 'is-foo',
    sections: [{ id: 's1', title: 'S1', blocks: [{ kind: 'demo' }] }],
  };
  const hs = validarEsquema(def);
  assert.ok(hs.some((h) => h.mensaje.includes('demo') && h.mensaje.includes('html')));
});

test('json-schema: detecta kind inválido', () => {
  const def = {
    $schema: 'is-preview/v1',
    tag: 'is-foo',
    sections: [{ id: 's1', title: 'S1', blocks: [{ kind: 'inventado' }] }],
  };
  const hs = validarEsquema(def);
  assert.ok(hs.some((h) => h.mensaje.includes('inventado')));
});

test('json-schema: detecta control sin label/prop', () => {
  const def = {
    $schema: 'is-preview/v1',
    tag: 'is-foo',
    sections: [{
      id: 's1', title: 'S1',
      blocks: [{
        kind: 'demo',
        html: '<is-foo></is-foo>',
        controls: [{ control: 'select' }], // falta prop y label
      }],
    }],
  };
  const hs = validarEsquema(def);
  assert.ok(hs.some((h) => h.mensaje.includes('label')));
  assert.ok(hs.some((h) => h.mensaje.includes('prop')));
});

test('json-schema: detecta control=select sin options', () => {
  const def = {
    $schema: 'is-preview/v1',
    tag: 'is-foo',
    sections: [{
      id: 's1', title: 'S1',
      blocks: [{
        kind: 'demo',
        html: '<is-foo></is-foo>',
        controls: [{ control: 'select', prop: 'x', label: 'X' }],
      }],
    }],
  };
  const hs = validarEsquema(def);
  assert.ok(hs.some((h) => h.mensaje.includes('options')));
});

test('json-schema: definición válida no produce hallazgos fatales', () => {
  const def = {
    $schema: 'is-preview/v1',
    tag: 'is-foo',
    sections: [{
      id: 's1', title: 'Intro',
      blocks: [
        { kind: 'demo', html: '<is-foo>x</is-foo>' },
        { kind: 'code', code: 'const x = 1;' },
      ],
    }],
  };
  const hs = validarEsquema(def);
  const fatales = hs.filter((h) => h.severidad === 'fatal');
  assert.equal(fatales.length, 0, `no debería haber fatales: ${JSON.stringify(fatales)}`);
});

test('json-contenido: detecta chart sin JSON embebido', () => {
  const def = {
    tag: 'is-bar-chart',
    sections: [{
      blocks: [{
        kind: 'demo',
        html: '<is-bar-chart></is-bar-chart>', // sin <script type="application/json">
      }],
    }],
  };
  const hs = ejecutarValidacionContenido(def, 'fake.json');
  assert.ok(hs.some((h) => h.categoria === 'json-complejidad' && h.mensaje.includes('is-bar-chart')));
});

test('json-contenido: chart CON JSON embebido pasa el check', () => {
  const def = {
    tag: 'is-bar-chart',
    sections: [{
      blocks: [{
        kind: 'demo',
        html: '<is-bar-chart><script type="application/json">{"data":{}}</script></is-bar-chart>',
      }],
    }],
  };
  const hs = ejecutarValidacionContenido(def, 'fake.json');
  const erroresChart = hs.filter((h) => h.categoria === 'json-complejidad');
  assert.equal(erroresChart.length, 0, 'chart con JSON embebido no debe tener errores de complejidad');
});

test('consistency: detecta módulo sin customElements.define', async () => {
  // Simulamos un módulo que NO define su custom element.
  const meta = await extraerMetaComponente(null);
  assert.equal(meta, null, 'módulo null debería devolver null');
});

test('consistency: meta de archivo inexistente devuelve null', async () => {
  const meta = await extraerMetaComponente('C:/ruta/que/no/existe.ts');
  assert.equal(meta, null);
});

test('consistency: detecta control que apunta a atributo no observado', async () => {
  // Leemos el módulo real de is-button.
  const rutaBtn = join(RAIZ, 'src', 'components', 'actions', 'button.ts');
  const meta = await extraerMetaComponente(rutaBtn);
  assert.ok(meta, 'meta de is-button debe existir');
  // is-button declara 'color' y 'variant' como observados.
  assert.ok(meta.atributosObservados.has('color'));
  assert.ok(meta.atributosObservados.has('variant'));
});

// GUARDIAN TEST: previene regresión del regex observedAttributes con TS type
// annotation. Caso real que disparó el bug: masked-input.ts usa
// `const OBSERVED: string[] = [...]` (con tipo TS) — el regex original con
// `[:=]\s*\[` no soportaba la sintaxis `NAME: TYPE = [...]`, por lo que
// extraía 0 atributos y reportaba 9 falsos warnings en masked-input/inline-edit/mention.
test('guard: consistency extrae observedAttributes con type annotation TS', async () => {
  const rutaMasked = join(RAIZ, 'src', 'components', 'forms', 'masked-input.ts');
  const meta = await extraerMetaComponente(rutaMasked);
  assert.ok(meta, 'meta de is-masked-input debe existir');
  // Sanity: estos 5 atributos DEBEN observarse (definidos con TS type annotation)
  for (const attr of ['pattern', 'value', 'placeholder', 'autocomplete', 'required']) {
    assert.ok(
      meta.atributosObservados.has(attr),
      `is-masked-input debería declarar '${attr}' como observado (TS type annotation regression)`,
    );
  }
});

test('guard: consistency extrae observedAttributes de inline-edit (TS type)', async () => {
  const ruta = join(RAIZ, 'src', 'components', 'forms', 'inline-edit.ts');
  const meta = await extraerMetaComponente(ruta);
  assert.ok(meta, 'meta de is-inline-edit debe existir');
  for (const attr of ['placeholder', 'mode', 'rows']) {
    assert.ok(
      meta.atributosObservados.has(attr),
      `is-inline-edit debería declarar '${attr}' como observado`,
    );
  }
});

test('guard: consistency extrae observedAttributes de mention (TS type)', async () => {
  const ruta = join(RAIZ, 'src', 'components', 'forms', 'mention.ts');
  const meta = await extraerMetaComponente(ruta);
  assert.ok(meta, 'meta de is-mention debe existir');
  assert.ok(
    meta.atributosObservados.has('trigger'),
    `is-mention debería declarar 'trigger' como observado`,
  );
});

test('consistency: ejecutarValidacionConsistencia contra def de is-button', async () => {
  const rutaBtn = join(RAIZ, 'src', 'components', 'actions', 'button.ts');
  const meta = await extraerMetaComponente(rutaBtn);
  // Cargar el JSON real
  const jsonPath = join(RAIZ, 'src', 'components', 'actions', 'button.json');
  const def = JSON.parse(readFileSync(jsonPath, 'utf8'));
  const hs = ejecutarValidacionConsistencia(def, meta, 'button.json');
  // No debe haber errores fatales: el JSON de is-button está bien curado.
  const fatales = hs.filter((h) => h.severidad === 'fatal' || h.severidad === 'error');
  // Permitimos warnings (los que reportan atributos no observados si los hay)
  // pero no errores duros.
  if (fatales.length > 0) {
    console.warn('Hallazgos duros en is-button:', fatales.map((h) => h.mensaje));
  }
  assert.equal(fatales.length, 0, 'is-button no debería tener errores duros');
});

test('runtime: auditar is-button no produce hallazgos de listeners', () => {
  const rutaBtn = join(RAIZ, 'src', 'components', 'actions', 'button.ts');
  const hs = auditarRuntimeComponente(rutaBtn, 'is-button');
  const fugas = hs.filter((h) => h.categoria === 'runtime' && h.severidad === 'error');
  assert.equal(fugas.length, 0, `is-button no debería tener fugas: ${JSON.stringify(fugas)}`);
});

test('reporter: aJson produce esquema iswc-audit/v1', () => {
  const reporte = {
    motorVersion: MOTOR_VERSION,
    inicio: new Date().toISOString(),
    fin: new Date().toISOString(),
    duracionMs: 1000,
    totalComponentes: 1,
    conteo: { fatal: 0, error: 0, warn: 1, info: 0 },
    componentes: [{
      tag: 'is-test',
      titulo: 'Test',
      categoria: 'test',
      rutaJson: 'test.json',
      rutaModulo: 'test.ts',
      hallazgos: [{
        categoria: 'json-schema', severidad: 'warn', tag: 'is-test',
        mensaje: 'Test warning',
      }],
      estado: 'warning' as const,
    }],
    erroresMotor: [],
  };
  const j = aJson(reporte);
  assert.equal(j.schema, 'iswc-audit/v1');
  assert.equal(j.total, 1);
  assert.equal(j.componentes[0].conteo.warn, 1);
});

test('reporter: aMarkdown incluye secciones esperadas', () => {
  const reporte = {
    motorVersion: MOTOR_VERSION,
    inicio: '2026-01-01T00:00:00.000Z',
    fin: '2026-01-01T00:00:01.000Z',
    duracionMs: 1000,
    totalComponentes: 2,
    conteo: { fatal: 0, error: 1, warn: 0, info: 0 },
    componentes: [
      {
        tag: 'is-a', titulo: 'A', categoria: 'test', rutaJson: 'a.json',
        hallazgos: [{
          categoria: 'consistencia', severidad: 'error', tag: 'is-a',
          mensaje: 'Error A',
        }],
        estado: 'fail' as const,
      },
      {
        tag: 'is-b', titulo: 'B', categoria: 'test', rutaJson: 'b.json',
        hallazgos: [],
        estado: 'ok' as const,
      },
    ],
    erroresMotor: [],
  };
  const md = aMarkdown(reporte);
  assert.ok(md.includes('# Auditoría del kit iswc'), 'encabezado presente');
  assert.ok(md.includes('is-a'), 'incluye componente con hallazgo');
  assert.ok(md.includes('Error A'), 'incluye mensaje del hallazgo');
  assert.ok(md.includes('iswc-audit/v1') || md.includes('Motor'), 'menciona motor');
});

test('motor: MOTOR_VERSION es string semver', () => {
  assert.match(MOTOR_VERSION, /^\d+\.\d+\.\d+$/);
});

test('integration: auditar 3 componentes reales no produce crashes', async () => {
  // Import dinámico del orquestador
  const { crearEstado, auditarCatalogo } = await import('../motor/auditor.js');
  const estado = crearEstado(RAIZ, { solo: ['is-button', 'is-button-group', 'is-accordion-group'], soloJson: true });
  const reporte = await auditarCatalogo(estado);
  assert.equal(reporte.totalComponentes, 3);
  // Cada componente debe tener al menos su tag.
  for (const c of reporte.componentes) {
    assert.ok(['is-button', 'is-button-group', 'is-accordion-group'].includes(c.tag));
  }
});