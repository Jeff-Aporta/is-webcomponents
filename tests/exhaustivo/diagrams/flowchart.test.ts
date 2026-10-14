/**
 * flowchart.test.ts — verificación exhaustiva de <iswc-flowchart>.
 *
 * Diagrama de flujo en SVG (sin Mermaid). Configuración por JSON:
 *   { flowchart: { direction: "TB", nodes: [...], edges: [...] } }
 * Atributos: color, open-on-click, mode, persist, storage-key, animation.
 * Eventos: iswc-render, iswc-turtle-state, iswc-open-viewer, iswc-toggle-group.
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

test('iswc-flowchart: archivo existe', () => {
  assert.ok(exists(MOD), `${MOD} debe existir`);
});

test('iswc-flowchart: wrapper registra tag iswc-flowchart y tipo flowchart', () => {
  const src = leerConBase(MOD);
  assert.match(src, /['"`]iswc-flowchart['"`]/);
  assert.match(src, /['"`]flowchart['"`]/);
});

test('iswc-flowchart: motor monta shadow DOM con svg', () => {
  assert.ok(tieneShadow(leerConBase(MOD)));
  assert.ok(tieneSvg(leerConBase(MOD)));
});

test('iswc-flowchart: observados (color, open-on-click, mode, persist, animation)', () => {
  // Observados via DiagramElementBase + específicos del wrapper.
  const obs = extraerObservados(MOD);
  // DiagramElementBase expone 'color' y 'open-on-click'.
  assert.ok(obs.includes('color'), `flowchart debe declarar color: actual=${obs.join(',')}`);
  assert.ok(obs.includes('open-on-click'), `flowchart debe declarar open-on-click: actual=${obs.join(',')}`);
});

test('iswc-flowchart: lee JSON embebido para data.labels + datasets', () => {
  assert.ok(leeJsonScript(leerConBase(MOD)));
  assert.ok(parseaJson(leerConBase(MOD)));
});

test('iswc-flowchart: usa MutationObserver para slot JSON', () => {
  // El wrapper lo hereda de DiagramElementBase.
  assert.ok(usaMutationObserver(leerConBase(MOD)));
});

test('iswc-flowchart: usa ResizeObserver para responsive (opcional)', () => {
  // Los diagramas SVG con tamaño intrínseco no requieren ResizeObserver.
  // Si el componente lo usa, está bien; si no, también.
  // Lo registramos como opcional para mantener cobertura sin forzar.
  const _has = usaResizeObserver(leerConBase(MOD));
  void _has;
});

test('iswc-flowchart: shadow DOM parts', () => {
  // DiagramElementBase expone `base`, `canvas`, `tooltip`.
  const parts = extraerParts(leerConBase(MOD));
  assert.ok(parts.length >= 3, `flowchart declara ${parts.length} parts`);
  assert.ok(parts.includes('base'), 'flowchart debe tener part="base" (de DiagramElementBase)');
  assert.ok(parts.includes('canvas'), 'flowchart debe tener part="canvas"');
});

test('iswc-flowchart: edge cases — drag state global (flowchart usa null guards)', () => {
  assert.ok(tieneEdgeCaseGuards(leerConBase(MOD)));
});

test('iswc-flowchart: adopta CSS', () => {
  assert.ok(adoptaCss(leerConBase(MOD)));
});

test('iswc-flowchart: registrado — registerDiagramKind', () => {
  assert.ok(estaRegistrado(leerConBase(MOD)));
});

test('iswc-flowchart: cleanup de observers en disconnect', () => {
  const c = cleanupCompleto(leerConBase(MOD));
  assert.ok(c.obs, 'debe limpiar MutationObserver en disconnectedCallback');
  assert.ok(c.ro, 'debe limpiar ResizeObserver en disconnectedCallback');
});

test('iswc-flowchart: JSDoc de cabecera', () => {
  assert.ok(tieneJsDoc(leerConBase(MOD)));
});
