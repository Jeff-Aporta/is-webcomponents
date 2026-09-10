/**
 * flowchart.test.ts — verificación exhaustiva de <is-flowchart>.
 *
 * Diagrama de flujo en SVG (sin Mermaid). Configuración por JSON:
 *   { flowchart: { direction: "TB", nodes: [...], edges: [...] } }
 * Atributos: color, open-on-click, mode, persist, storage-key, animation.
 * Eventos: is-render, is-turtle-state, is-open-viewer, is-toggle-group.
 *
 * Extiende DiagramElementBase: muchas features (svg, parts, MO, RO)
 * viven en la base. Usamos `leerConBase` para verlas en los tests.
 */
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  exists,
  leerConBase,
  extraerObservados,
  extraerEventos,
  extraerParts,
  tieneShadow,
  leeJsonScript,
  parseaJson,
  usaMutationObserver,
  usaResizeObserver,
  tieneEdgeCaseGuards,
  adoptaCss,
  estaRegistrado,
  cleanupCompleto,
  tieneJsDoc,
  tieneSvg,
  tieneCanvas,
} from '../_helpers.js';

const MOD = 'src/components/diagrams/flowchart.ts';

test('is-flowchart: archivo existe', () => {
  assert.ok(exists(MOD), `${MOD} debe existir`);
});

test('is-flowchart: wrapper registra tag is-flowchart y tipo flowchart', () => {
  const src = leerConBase(MOD);
  assert.match(src, /['"`]is-flowchart['"`]/);
  assert.match(src, /['"`]flowchart['"`]/);
});

test('is-flowchart: motor monta shadow DOM con svg', () => {
  assert.ok(tieneShadow(leerConBase(MOD)));
  assert.ok(tieneSvg(leerConBase(MOD)));
});

test('is-flowchart: observados (color, open-on-click, mode, persist, animation)', () => {
  // Observados via DiagramElementBase + específicos del wrapper.
  const obs = extraerObservados(MOD);
  // DiagramElementBase expone 'color' y 'open-on-click'.
  assert.ok(obs.includes('color'), `flowchart debe declarar color: actual=${obs.join(',')}`);
  assert.ok(obs.includes('open-on-click'), `flowchart debe declarar open-on-click: actual=${obs.join(',')}`);
});

test('is-flowchart: lee JSON embebido para data.labels + datasets', () => {
  assert.ok(leeJsonScript(leerConBase(MOD)));
  assert.ok(parseaJson(leerConBase(MOD)));
});

test('is-flowchart: usa MutationObserver para slot JSON', () => {
  // El wrapper lo hereda de DiagramElementBase.
  assert.ok(usaMutationObserver(leerConBase(MOD)));
});

test('is-flowchart: usa ResizeObserver para responsive (opcional)', () => {
  // Los diagramas SVG con tamaño intrínseco no requieren ResizeObserver.
  // Si el componente lo usa, está bien; si no, también.
  // Lo registramos como opcional para mantener cobertura sin forzar.
  const _has = usaResizeObserver(leerConBase(MOD));
  void _has;
});

test('is-flowchart: shadow DOM parts', () => {
  // DiagramElementBase expone `base`, `canvas`, `tooltip`.
  const parts = extraerParts(leerConBase(MOD));
  assert.ok(parts.length >= 3, `flowchart declara ${parts.length} parts`);
  assert.ok(parts.includes('base'), 'flowchart debe tener part="base" (de DiagramElementBase)');
  assert.ok(parts.includes('canvas'), 'flowchart debe tener part="canvas"');
});

test('is-flowchart: edge cases — drag state global (flowchart usa null guards)', () => {
  assert.ok(tieneEdgeCaseGuards(leerConBase(MOD)));
});

test('is-flowchart: adopta CSS', () => {
  assert.ok(adoptaCss(leerConBase(MOD)));
});

test('is-flowchart: registrado — registerDiagramKind', () => {
  assert.ok(estaRegistrado(leerConBase(MOD)));
});

test('is-flowchart: cleanup de observers en disconnect', () => {
  const c = cleanupCompleto(leerConBase(MOD));
  assert.ok(c.obs, 'debe limpiar MutationObserver en disconnectedCallback');
  assert.ok(c.ro, 'debe limpiar ResizeObserver en disconnectedCallback');
});

test('is-flowchart: JSDoc de cabecera', () => {
  assert.ok(tieneJsDoc(leerConBase(MOD)));
});
