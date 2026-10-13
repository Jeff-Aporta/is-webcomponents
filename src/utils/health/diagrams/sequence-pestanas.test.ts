/**
 * Guardián WHAT (A16) de la secuencia sobre los editables reales del ISS: ningún mensaje (ni un
 * self-loop) se dibuja sobre una pestaña negra de un fragmento (`alt`, `par`, `loop`) ni sobre la
 * del bloque `alt` principal: la pestaña ocupa la esquina superior izquierda del marco y la
 * etiqueta de modo la derecha; los rieles pasan por debajo, con margen.
 */
import { assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { fileURLToPath } from 'node:url';
import { Obj } from '../../../vendor-distributions/shared/lib/obj.ts';
import { computeSequenceLayout, resolveSequenceSpec } from '../../../components/diagrams/sequence-spec.ts';
import { parsePathPoints } from '../../../components/_shared/diagram-edge-actors.ts';

const DIR = new URL('../../../../../../../PatyIA/_experimental/ISS-AyudasCPIA/docs-experimental/diagramas/', import.meta.url);
/** Alto de la pestaña y ancho mínimo que ocupa (título + condición); etiqueta de modo a la derecha. */
const TAB_H = 18;
const TAB_W_MIN = 60;
const MODE_W = 45;
const MARGEN = 2;

type Caja = { x: number; y: number; w: number; h: number };
const cruza = (a: { x: number; y: number }, b: { x: number; y: number }, c: Caja): boolean => {
  const x0 = Math.min(a.x, b.x), x1 = Math.max(a.x, b.x), y0 = Math.min(a.y, b.y), y1 = Math.max(a.y, b.y);
  return x1 > c.x - MARGEN && x0 < c.x + c.w + MARGEN && y1 > c.y - MARGEN && y0 < c.y + c.h + MARGEN;
};

Deno.test('secuencia: A16 ningún mensaje pasa sobre una pestaña de fragmento o del alt', async () => {
  const fallas: string[] = [];
  let diagramas = 0;
  let pestanas = 0;
  for await (const f of Deno.readDir(DIR)) {
    if (!f.name.endsWith('.json') || f.name.startsWith('ruta-')) continue;
    const url = new URL(f.name, DIR);
    const crudo = JSON.parse(await Deno.readTextFile(url)) as { tag?: string };
    if (crudo.tag !== 'iswc-sequence-diagram') continue;
    const j = await Obj.resolver(crudo, { base: fileURLToPath(url), cargar: async (u: string) => JSON.parse(await Deno.readTextFile(u)) }) as { payload: unknown };
    const spec = resolveSequenceSpec(j.payload);
    if (!spec) continue;
    const L = computeSequenceLayout(spec);
    diagramas++;
    const tabs: Array<Caja & { de: string }> = [];
    for (const fr of L.fragments ?? []) {
      if (fr.h < TAB_H + 8) fallas.push(`${f.name}: fragmento ${fr.kind} ${fr.id} colapsado (h=${fr.h})`);
      const w = Math.max(TAB_W_MIN, (fr.name.length + (fr.condition?.length ?? 0)) * 6 + 30);
      tabs.push({ de: `${fr.kind} ${fr.id}`, x: fr.x, y: fr.y, w, h: TAB_H });
      tabs.push({ de: `modo ${fr.id}`, x: fr.x + fr.w - MODE_W, y: fr.y, w: MODE_W, h: TAB_H });
    }
    if (L.altBox) tabs.push({ de: 'alt', x: L.altBox.x, y: L.altBox.y, w: Math.max(TAB_W_MIN, L.altBox.label.length * 6 + 30), h: TAB_H });
    pestanas += tabs.length;
    for (const m of L.messages) {
      const pts = parsePathPoints(m.path);
      for (let i = 1; i < pts.length; i++) {
        for (const t of tabs) if (cruza(pts[i - 1]!, pts[i]!, t)) fallas.push(`${f.name}: mensaje ${m.stepLabel ?? m.step} «${m.label.slice(0, 40)}» cruza la pestaña ${t.de}`);
      }
    }
  }
  assert(diagramas >= 10, `pocas secuencias: ${diagramas}`);
  assert(pestanas >= 10, `pocas pestañas: ${pestanas}`);
  assert(fallas.length === 0, `mensajes sobre pestañas:\n${[...new Set(fallas)].join('\n')}`);
});
