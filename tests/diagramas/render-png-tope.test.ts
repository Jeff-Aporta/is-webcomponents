/**
 * Guardián WHAT del tope de píxeles del PNG exportado (A18, `PNG_MAX_PX` en render-diagram.ts):
 * Chromium no pinta capturas de más de ~40 Mpx (los tiles salen vacíos; el PNG de clases del ISS
 * salía corrupto). El SVG es vectorial, así que el wrapper se encoge a escala CSS para que el raster
 * (CSS x deviceScaleFactor) quepa.
 *   T1 un lienzo grande (20000x20000 a escala 2 = 1600 Mpx) queda en ≤ 36 Mpx, con la proporción
 *      conservada, y rozando el tope (no se encoge de más).
 *   T2 un lienzo pequeño no se toca (k = 1, mismas medidas) y un eje desconocido tampoco.
 *   T3 el lienzo de clases del ISS (labs) ya rasterizado respeta el tope: su IHDR mide ≤ 36 Mpx.
 *   T4 caja negra: un flujo pequeño renderizado a PNG con el bundle de `dist/cdn` sale con contenido
 *      (bytes muy por encima de un PNG vacío) y con las medidas que anuncia `pngCanvasSize` x 2.
 *      Requiere `deno task build` y Chromium de Playwright; sin ellos se salta con aviso.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { PNG_MAX_PX, pngCanvasSize, renderDiagramBatch } from '../../src/vendor-distributions/client/tools/render-diagram.ts';
import type { RenderDiagramOptions } from '../../src/vendor-distributions/shared/schemas.ts';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { denoTestCon } from '../_shared/deno-test.ts';
import { lanzarChromium } from '../_shared/navegador.ts';

const { test, lista } = coleccionPruebas({ categoria: 'what' });

const denoTest = denoTestCon(test);


// Raíz del repo (antes './' = tests/diagramas/: no hallaba dist/ y el caso se saltaba en silencio).
const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const BUNDLE = 'dist/cdn/diagrams/flowchart.min.js';
const CLASES_PNG = 'labs/iss-ayudascpia-clases/out/clases.png';
const ESCALA = 2;

/** Ancho y alto del IHDR de un PNG (bytes 16..24, big-endian). */
function medidasPng(png: Uint8Array): { w: number; h: number } {
  assert(png.length > 24 && png[1] === 0x50 && png[2] === 0x4e && png[3] === 0x47, 'no es un PNG');
  const dv = new DataView(png.buffer, png.byteOffset, png.byteLength);
  return { w: dv.getUint32(16), h: dv.getUint32(20) };
}

denoTest('png-tope: T1 un lienzo grande se encoge en proporción hasta el tope de 36 Mpx', () => {
  assertEquals(PNG_MAX_PX, 36_000_000, 'el tope documentado');
  for (const [w, h] of [[20000, 20000], [9262, 9566], [30000, 5000]] as const) {
    const r = pngCanvasSize(w, h, ESCALA);
    assert(r.k < 1 && r.width! < w && r.height! < h, `${w}x${h}: tiene que encoger (k=${r.k})`);
    const px = r.width! * ESCALA * (r.height! * ESCALA);
    assert(px <= PNG_MAX_PX, `${w}x${h}: raster de ${px} px supera el tope`);
    assert(px >= PNG_MAX_PX * 0.98, `${w}x${h}: raster de ${px} px, se encogió de más (tope ${PNG_MAX_PX})`);
    assert(Math.abs(r.width! / r.height! - w / h) < 0.01, `${w}x${h}: proporción ${w / h} → ${r.width! / r.height!}`);
  }
});

denoTest('png-tope: T2 un lienzo pequeño o con un eje desconocido no se toca', () => {
  assertEquals(pngCanvasSize(1200, 800, ESCALA), { k: 1, width: 1200, height: 800 });
  // Justo en el tope (3000x3000 a escala 2 = 36 Mpx) tampoco se encoge.
  assertEquals(pngCanvasSize(3000, 3000, ESCALA), { k: 1, width: 3000, height: 3000 });
  assertEquals(pngCanvasSize(50000, null, ESCALA), { k: 1, width: 50000, height: null });
  assertEquals(pngCanvasSize(null, null, ESCALA), { k: 1, width: null, height: null });
});

denoTest({
  name: 'png-tope: T3 el PNG de clases del ISS (labs) mide ≤ 36 Mpx',
  ignore: !existsSync(`${RAIZ}${CLASES_PNG}`),
  fn() {
    const { w, h } = medidasPng(readFileSync(`${RAIZ}${CLASES_PNG}`));
    assert(w * h <= PNG_MAX_PX, `${CLASES_PNG}: ${w}x${h} = ${w * h} px supera el tope`);
  },
});

let chromium: RenderDiagramOptions['chromium'] | null = null;
try {
  // Chromium de Playwright o, si no está descargado, Chrome/Edge del sistema (tests/_shared/navegador.ts).
  createRequire(import.meta.url)('playwright');
  chromium = { launch: (o: Record<string, unknown>) => lanzarChromium(o) } as unknown as RenderDiagramOptions['chromium'];
} catch { chromium = null; }

denoTest({
  name: 'png-tope: T4 caja negra, un flujo pequeño a PNG sale con contenido y con las medidas anunciadas',
  ignore: !chromium || !existsSync(`${RAIZ}${BUNDLE}`),
  sanitizeResources: false,
  sanitizeOps: false,
  async fn() {
    const payload = {
      nodes: [{ id: 'a', label: 'Recibe la petición' }, { id: 'b', label: 'Valida' }, { id: 'c', label: 'Responde' }],
      edges: [{ from: 'a', to: 'b' }, { from: 'b', to: 'c' }],
    };
    const [r] = await renderDiagramBatch(
      [{ id: 'chico', job: { tag: 'iswc-flowchart', scriptUrl: BUNDLE, payload, attrs: { 'flow-anim': 'off' } } }],
      { chromium: chromium!, serveRoot: RAIZ, png: true, settleMs: 200 },
    );
    assert(r?.result?.png && r.result.width && r.result.height, `render: ${r?.error ?? 'sin png'}`);
    const png = r.result.png;
    const { w, h } = medidasPng(png);
    const esperado = pngCanvasSize(r.result.width, r.result.height, ESCALA);
    assertEquals(esperado.k, 1, 'un flujo chico no se encoge');
    // Chromium redondea la captura a píxeles enteros del dispositivo: ±2 px por eje.
    assert(Math.abs(w - esperado.width! * ESCALA) <= 2 && Math.abs(h - esperado.height! * ESCALA) <= 2, `PNG ${w}x${h}, esperado ${esperado.width! * ESCALA}x${esperado.height! * ESCALA}`);
    assert(w * h <= PNG_MAX_PX, 'dentro del tope');
    // Un PNG en blanco comprime a ~2-4 bytes por kilopíxel (el de 400x516 pesa ~1 KB); con cajas,
    // texto y flechas sube a ~40 B/kpx (8,8 KB). Los tiles vacíos del bug colapsan esa densidad.
    const densidad = png.length / (w * h / 1000);
    assert(densidad > 10, `PNG casi vacío: ${png.length} bytes para ${w}x${h} (${densidad.toFixed(1)} B/kpx)`);
  },
});

export default lista();
