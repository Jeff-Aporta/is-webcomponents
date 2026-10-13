/**
 * Guardián WHAT del PNG exportado (A8): la captura estática sale LIMPIA de pulsos. Los radares de
 * las ⦿ (fin, reunión de ramas), los de las O (`-(O-`, `-(O=`) y los puntos que recorren los rieles
 * solo se ven en el SVG vivo: el PNG de un diagrama con la animación de flujo activa es idéntico,
 * píxel a píxel, al del mismo diagrama con `flow-anim="off"`.
 *
 * Caja negra sobre el render real (`render-diagram.ts` + Chromium de Playwright) con el bundle de
 * `dist/cdn` (requiere `deno task build`; sin build o sin Chromium la prueba se salta con aviso).
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { existsSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { renderDiagramBatch } from '../../../vendor-distributions/client/tools/render-diagram.ts';
import type { RenderDiagramOptions } from '../../../vendor-distributions/client/tools/render-diagram.schemas.ts';

const RAIZ = fileURLToPath(new URL('../../../../', import.meta.url));
const BUNDLE = 'dist/cdn/diagrams/flowchart.min.js';

/** Un fin ⦿, una reunión de ramas ⦿, un consumo `-(O-` de tabla y rieles continuos con puntos. */
const PAYLOAD = {
  style: 'insoft',
  lanes: [{ id: 'flujo', label: 'Flujo' }, { id: 'bd', label: 'BD' }],
  nodes: [
    { id: 'i', label: 'Inicio', shape: 'start', lane: 'flujo' },
    { id: 'a', label: 'Recibe la petición', lane: 'flujo' },
    { id: 'f', label: '', shape: 'bar', lane: 'flujo' },
    { id: 'x', label: 'Consulta la tabla', lane: 'flujo' },
    { id: 'y', label: 'Arma la respuesta', lane: 'flujo' },
    { id: 'u', label: '', shape: 'bar', lane: 'flujo' },
    { id: 'fin', label: 'Fin', shape: 'end', lane: 'flujo' },
    { id: 't', label: 'gen_tabla', kind: 'tableder', lane: 'bd', socket: true },
  ],
  edges: [
    { from: 'i', to: 'a' }, { from: 'a', to: 'f' },
    { from: 'f', to: 'x' }, { from: 'f', to: 'y' },
    { from: 'x', to: 'u' }, { from: 'y', to: 'u' },
    { from: 'u', to: 'fin' },
    { from: 'x', to: 't', label: 'SELECT', style: 'dashed' },
  ],
};

let chromium: RenderDiagramOptions['chromium'] | null = null;
try {
  chromium = (createRequire(import.meta.url)('playwright') as { chromium: RenderDiagramOptions['chromium'] }).chromium;
} catch { chromium = null; }

Deno.test({
  name: 'png: A8 el PNG con animación de flujo es idéntico al PNG sin ella (sin radares ni puntos)',
  ignore: !chromium || !existsSync(`${RAIZ}${BUNDLE}`),
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const job = (attrs: Record<string, string>) => ({ tag: 'iswc-flowchart', scriptUrl: BUNDLE, payload: PAYLOAD, attrs: { 'diagram-style': 'insoft', ...attrs } });
    const r = await renderDiagramBatch(
      [{ id: 'vivo', job: job({}) }, { id: 'quieto', job: job({ 'flow-anim': 'off' }) }],
      { chromium: chromium!, serveRoot: RAIZ, png: true, settleMs: 200 },
    );
    const [vivo, quieto] = r;
    assert(vivo?.result?.png && quieto?.result?.png, `render: ${r.map((x) => x.error ?? 'ok').join(' | ')}`);
    // Precondición: el SVG vivo SÍ trae pulsos (si no, la prueba no prueba nada).
    assert(/iswc-flow__radar/.test(vivo.result.svg), 'el SVG vivo lleva radares');
    assert(/iswc-flow__dots/.test(vivo.result.svg), 'el SVG vivo lleva puntos de flujo');
    assert(!/iswc-flow__radar|iswc-flow__dots/.test(quieto.result.svg), 'con flow-anim="off" no hay pulsos');
    assertEquals(vivo.result.png.length, quieto.result.png.length, 'mismo PNG (tamaño)');
    assert(vivo.result.png.every((b, i) => b === quieto.result!.png![i]), 'mismo PNG (bytes): ningún pulso queda en la captura');
  },
});
