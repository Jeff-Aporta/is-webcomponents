/**
 * Un diagrama incrustado (nodo `nested`) se ESCALA entero: E1 la caja usa el viewBox de la captura
 * (escala uniforme, sin redibujar) y E2 ningún trazo conserva `non-scaling-stroke`, así las líneas y
 * sus guiones se reducen con el diagrama en vez de quedar con el grosor de pantalla del original.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';

// Documento mínimo: lo único que usa embedSvgElement es crear el <svg>, atributos e innerHTML.
(globalThis as Record<string, unknown>).document ??= {
  createElementNS: () => ({ attrs: {} as Record<string, string>, html: '', setAttribute(k: string, v: string) { this.attrs[k] = v; }, set innerHTML(v: string) { this.html = v; } }),
};
const { embedSvgElement } = await import('../../../components/_shared/diagram-embed.ts');

Deno.test('embed: E1 escala por viewBox y E2 sin non-scaling-stroke', () => {
  const svg = embedSvgElement(
    { box: { x: 0, y: 0, w: 1200, h: 900 }, scope: 's1', markup: '<path d="M0 0H10" stroke-width="1.15" vector-effect="non-scaling-stroke"/><line x2="5"/>' } as never,
    { x: 10, y: 20, w: 200, h: 150 },
  ) as unknown as { attrs: Record<string, string>; html: string };
  assertEquals(svg.attrs.viewBox, '0 0 1200 900');
  assertEquals([svg.attrs.width, svg.attrs.height], ['200', '150']);
  assert(!svg.html.includes('non-scaling-stroke'), svg.html);
  assert(svg.html.includes('stroke-width="1.15"'), 'el resto del trazo queda igual');
});
