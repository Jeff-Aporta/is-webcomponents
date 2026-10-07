/**
 * Guardianes WHAT de estilos diferidos y del empaque/ruteo de componentes y
 * clases. Afirman QUÉ debe cumplir el resultado (geometría, contratos de
 * estilo), no CÓMO lo calcula el motor.
 */
import { assert, assertEquals } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  isStyleDiagramLoaded,
  listStylesDiagram,
  loadStylesDiagram,
  registerStyleDiagram,
  styleThemeFor,
} from '../../../components/diagrams/diagram-styles.ts';
import { computeComponentLayout, resolveComponentSpec } from '../../../components/diagrams/component-spec.ts';
import { computeClassLayout, resolveClassSpec } from '../../../components/diagrams/class-spec.ts';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const NARANJA_DER = '#F4B67B';

type Caja = { x: number; y: number; w: number; h: number };
const dentro = (a: Caja, b: Caja, tol = 0.5): boolean =>
  a.x >= b.x - tol && a.y >= b.y - tol && a.x + a.w <= b.x + b.w + tol && a.y + a.h <= b.y + b.h + tol;
const solapan = (a: Caja, b: Caja): boolean =>
  a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
/** Vértices de un path ortogonal (M/L con `x,y`, H y V absolutos). */
const puntos = (d: string): Array<{ x: number; y: number }> => {
  const out: Array<{ x: number; y: number }> = [];
  let x = 0;
  let y = 0;
  for (const m of d.matchAll(/([MLHV])\s*(-?\d+(?:\.\d+)?)(?:[ ,](-?\d+(?:\.\d+)?))?/g)) {
    const [, cmd, a, b] = m;
    if (cmd === 'H') x = Number(a);
    else if (cmd === 'V') y = Number(a);
    else { x = Number(a); y = Number(b); }
    out.push({ x, y });
  }
  return out;
};

// ── Estilos ────────────────────────────────────────────────────────────

Deno.test('estilo insoft: registrado, se carga una vez y trae un tema por tipo de diagrama', async () => {
  assert(listStylesDiagram().includes('insoft'));
  await loadStylesDiagram('InSoft');
  assert(isStyleDiagramLoaded('insoft'));
  assertEquals(styleThemeFor('insoft', 'er')?.kind, 'er');
  assertEquals(styleThemeFor('insoft', 'component')?.kind, 'component');
  assertEquals(styleThemeFor('insoft', 'class')?.kind, 'class');
  // Segunda carga: misma promesa resuelta, sin error.
  await loadStylesDiagram('insoft');
});

Deno.test('el naranja de entidad es exclusivo del DER: ni componentes ni clases lo usan como relleno', async () => {
  await loadStylesDiagram('insoft');
  for (const tipo of ['component', 'class'] as const) {
    const t = styleThemeFor('insoft', tipo)!;
    const colores = [...Object.values(t.fills ?? {}), ...Object.values(t.cluster?.palettes ?? {})].map((c) => c.toUpperCase());
    assert(!colores.includes(NARANJA_DER), `${tipo} usa ${NARANJA_DER}`);
    assert(t.fills?.service && t.fills?.store, `${tipo} sin rellenos semánticos`);
  }
  assertEquals(styleThemeFor('insoft', 'er')?.entity?.fill, NARANJA_DER);
});

Deno.test('un estilo desconocido no rompe: carga vacía y sin tema', async () => {
  await loadStylesDiagram('no-existe');
  assertEquals(styleThemeFor('no-existe', 'class'), null);
});

Deno.test('registerStyleDiagram expone el estilo a todos los bundles (almacén global)', () => {
  registerStyleDiagram({ prueba: ['./themes/insoft-class.json'] });
  assert(listStylesDiagram().includes('prueba'));
  const raiz = globalThis as typeof globalThis & { __iswcDiagramStyles?: { archivos: Map<string, string[]> } };
  assert(raiz.__iswcDiagramStyles?.archivos.has('prueba'));
});

Deno.test('el build publica los temas junto a los bundles (carga diferida)', () => {
  const dist = join(ROOT, 'dist', 'cdn', 'diagrams', 'themes');
  if (!existsSync(dist)) return; // sin build local no hay qué verificar
  for (const f of ['insoft.json', 'insoft-cd.json', 'insoft-class.json']) {
    const src = readFileSync(join(ROOT, 'src', 'components', 'diagrams', 'themes', f), 'utf8');
    assertEquals(readFileSync(join(dist, f), 'utf8'), src, `${f} desactualizado en dist`);
  }
});

// ── Componentes: capas anidadas ────────────────────────────────────────

const capas = (extra: Record<string, unknown> = {}) => resolveComponentSpec({
  componentDiagram: {
    layout: { mode: 'layers', layerCols: 3, nestedCols: 2, ...extra },
    packages: [
      { id: 'a', name: 'Entrada' },
      { id: 'a1', name: 'Sub uno', parent: 'a', cols: 1 },
      { id: 'a2', name: 'Sub dos más ancho', parent: 'a', cols: 3 },
      { id: 'b', name: 'Destino' },
    ],
    components: [
      { id: 'x', name: 'Directo', package: 'a', w: 180, h: 56 },
      { id: 'p', name: 'P', package: 'a1', w: 180, h: 56 },
      { id: 'q1', name: 'Q1', package: 'a2', w: 180, h: 56 },
      { id: 'q2', name: 'Q2', package: 'a2', w: 180, h: 56 },
      { id: 'q3', name: 'Q3', package: 'a2', w: 180, h: 56 },
      { id: 'z', name: 'Z', package: 'b', w: 180, h: 56 },
    ],
    links: [{ from: 'x', to: 'z' }, { from: 'p', to: 'z' }, { from: 'q2', to: 'z' }],
  },
})!;

Deno.test('capas: cada caja dentro de su paquete, cada subpaquete dentro del padre, hermanos sin solaparse', () => {
  const L = computeComponentLayout(capas());
  const pk = new Map(L.packages.map((p) => [p.id, p as Caja & { id: string; parent?: string }]));
  for (const c of L.components as Array<Caja & { package?: string }>) assert(dentro(c, pk.get(c.package!)!), `${(c as { id?: string }).id} fuera`);
  for (const p of pk.values()) if (p.parent) assert(dentro(p, pk.get(p.parent)!), `${p.id} fuera de ${p.parent}`);
  assert(!solapan(pk.get('a1')!, pk.get('a2')!));
});

Deno.test('capas: subpaquetes de una sola fila comparten alto pero conservan su ancho', () => {
  const L = computeComponentLayout(capas());
  const a1 = L.packages.find((p) => p.id === 'a1')!;
  const a2 = L.packages.find((p) => p.id === 'a2')!;
  assertEquals(a1.y, a2.y);
  assertEquals(a1.h, a2.h);
  assert(a2.w > a1.w, 'el subpaquete de 3 columnas debería ser más ancho');
});

Deno.test('remate arrow: sin lollipops, cada flecha termina en la cara de su destino y cada punta se pinta una vez', () => {
  const L = computeComponentLayout(capas({ connector: 'arrow' }));
  assertEquals(L.interfaces.length, 0);
  const caja = new Map((L.components as Array<Caja & { id: string }>).map((c) => [c.id, c]));
  // Las `->` al mismo destino pueden compartir punta (incentivo del router):
  // en cada punto de llegada se pinta exactamente una cabeza.
  const cabezas = new Map<string, number>();
  for (const e of L.edges as Array<{ to: string; path: string; sharedTip?: boolean }>) {
    const pts = puntos(e.path);
    const fin = pts[pts.length - 1]!;
    const prev = pts[pts.length - 2]!;
    const b = caja.get(e.to)!;
    const enBorde = Math.abs(fin.x - b.x) < 0.6 || Math.abs(fin.x - (b.x + b.w)) < 0.6
      || Math.abs(fin.y - b.y) < 0.6 || Math.abs(fin.y - (b.y + b.h)) < 0.6;
    assert(enBorde, `flecha a ${e.to} no toca la caja`);
    assert(prev.x === fin.x || prev.y === fin.y, 'último tramo no es ortogonal');
    const k = `${fin.x},${fin.y}`;
    cabezas.set(k, (cabezas.get(k) ?? 0) + (e.sharedTip ? 0 : 1));
  }
  for (const [k, n] of cabezas) assertEquals(n, 1, `punta en ${k} pintada ${n} veces`);
});

Deno.test('router: las `->` de la misma clave comparten punta si les sale barato; el `-(O-` nunca', async () => {
  const { routeEdges } = await import('../../../components/diagrams/component-router.ts');
  const D = { id: 'D', x: 600, y: 180, w: 120, h: 80 };
  const A = { id: 'A', x: 40, y: 120, w: 120, h: 60 };
  const B = { id: 'B', x: 40, y: 240, w: 120, h: 60 };
  const world = { components: [A, B, D], packages: [], titles: [], rings: [] };
  const arista = (id: string, src: typeof A, ty: number, shareKey?: string) => ({
    id, from: { x: src.x + src.w, y: src.y + src.h / 2 }, fromSide: 'right' as const,
    to: { x: D.x, y: ty }, toSide: 'left' as const, fromBox: src, toBox: D,
    fromPkgs: new Set<string>(), toPkgs: new Set<string>(), ...(shareKey ? { shareKey } : {}),
  });
  const conClave = routeEdges(world, [arista('a', A, 200, 'D::arrow'), arista('b', B, 240, 'D::arrow')], { step: 20, clearance: 20, lanePitch: 24 });
  assert(conClave.joinedTo.some((j) => j != null), 'dos flechas vecinas al mismo destino no compartieron punta');
  assert(conClave.violations.every((v) => v.length === 0), `ruta ilegal: ${JSON.stringify(conClave.violations)}`);
  const unida = conClave.joinedTo.findIndex((j) => j != null);
  const raiz = conClave.joinedTo[unida]!;
  const fin = (p: Array<{ x: number; y: number }> | null) => p![p!.length - 1]!;
  assertEquals(fin(conClave.paths[unida]), fin(conClave.paths[raiz]), 'la unida no termina en la punta de la raíz');
  const sinClave = routeEdges(world, [arista('a', A, 200), arista('b', B, 240)], { step: 20, clearance: 20, lanePitch: 24 });
  assert(sinClave.joinedTo.every((j) => j == null), 'sin clave hubo unión');
  assert(JSON.stringify(fin(sinClave.paths[0]!)) !== JSON.stringify(fin(sinClave.paths[1]!)));
});

Deno.test('router: unirse no es obligatorio; fuera del radio de incentivo la flecha hace su propia punta', async () => {
  const { routeEdges } = await import('../../../components/diagrams/component-router.ts');
  const D = { id: 'D', x: 400, y: 100, w: 200, h: 200 };
  const A = { id: 'A', x: 40, y: 170, w: 120, h: 60 };
  const C = { id: 'C', x: 440, y: 520, w: 120, h: 60 };
  const world = { components: [A, C, D], packages: [], titles: [], rings: [] };
  const r = routeEdges(world, [
    { id: 'a', from: { x: 160, y: 200 }, fromSide: 'right', to: { x: 400, y: 200 }, toSide: 'left', fromBox: A, toBox: D, fromPkgs: new Set(), toPkgs: new Set(), shareKey: 'D::arrow' },
    { id: 'c', from: { x: 500, y: 520 }, fromSide: 'top', to: { x: 500, y: 300 }, toSide: 'bottom', fromBox: C, toBox: D, fromPkgs: new Set(), toPkgs: new Set(), shareKey: 'D::arrow' },
  ], { step: 20, clearance: 20, lanePitch: 24 });
  assertEquals(r.joinedTo[1], null, 'C rodeó D para unirse a la flecha de A');
});

Deno.test('router: campo de factores; dos rieles ajenos no corren pegados (< lanePitch) en un tramo largo', async () => {
  const { routeEdges } = await import('../../../components/diagrams/component-router.ts');
  // A→D y B→E en filas a 60 px: si el brillo de riel vecino no actuara,
  // los rieles irían pegados; con él se separan al menos un carril.
  const A = { id: 'A', x: 40, y: 170, w: 100, h: 60 };
  const B = { id: 'B', x: 40, y: 250, w: 100, h: 60 };
  const D = { id: 'D', x: 700, y: 170, w: 100, h: 60 };
  const E = { id: 'E', x: 700, y: 250, w: 100, h: 60 };
  const world = { components: [A, B, D, E], packages: [], titles: [], rings: [] };
  const r = routeEdges(world, [
    { id: 'a', from: { x: 140, y: 200 }, fromSide: 'right', to: { x: 700, y: 200 }, toSide: 'left', fromBox: A, toBox: D, fromPkgs: new Set(), toPkgs: new Set() },
    { id: 'b', from: { x: 140, y: 280 }, fromSide: 'right', to: { x: 700, y: 280 }, toSide: 'left', fromBox: B, toBox: E, fromPkgs: new Set(), toPkgs: new Set() },
  ], { step: 20, clearance: 20, lanePitch: 24 });
  assert(r.violations.every((v) => v.length === 0));
  const segs = (p: Array<{ x: number; y: number }>) => p.slice(1).map((b, k) => [p[k]!, b] as const).filter(([a, b]) => a.y === b.y);
  for (const [a1, a2] of segs(r.paths[0]!)) for (const [b1, b2] of segs(r.paths[1]!)) {
    if (Math.abs(a1.y - b1.y) >= 24) continue;
    const ov = Math.min(Math.max(a1.x, a2.x), Math.max(b1.x, b2.x)) - Math.max(Math.min(a1.x, a2.x), Math.min(b1.x, b2.x));
    assert(ov <= 60, `rieles a ${Math.abs(a1.y - b1.y)} px durante ${ov} px`);
  }
});

Deno.test('estilo vp: la pintura se declara en el layout y los rótulos no se centran', () => {
  const L = computeComponentLayout(capas({ boxStyle: 'vp' }));
  assertEquals(L.boxStyle, 'vp');
  for (const p of L.packages as Array<{ titleCenter?: boolean }>) assertEquals(p.titleCenter, false);
});

// ── Clases: paquetes y herencia en bus ────────────────────────────────

const clases = () => resolveClassSpec({
  classDiagram: {
    layout: { boxStyle: 'vp' },
    packages: [
      { id: 'base', name: 'Base', classFill: 'service' },
      { id: 'hijos', name: 'Hijos', cols: 2 },
      { id: 'h1', name: 'H1', parent: 'hijos', classFill: 'service' },
      { id: 'h2', name: 'H2', parent: 'hijos', classFill: 'store' },
    ],
    classes: [
      { id: 'B', name: 'TBase', package: 'base', methods: ['+ m()'] },
      { id: 'c1', name: 'C1', package: 'h1' }, { id: 'c2', name: 'C2', package: 'h1' },
      { id: 'c3', name: 'C3', package: 'h1' }, { id: 'c4', name: 'C4', package: 'h2' },
    ],
    relations: ['c1', 'c2', 'c3', 'c4'].map((id) => ({ from: id, to: 'B', kind: 'inheritance' })),
  },
})!;

Deno.test('clases: cada clase dentro de su paquete y con el relleno semántico de su paquete', () => {
  const L = computeClassLayout(clases());
  const pk = new Map((L.packages ?? []).map((p) => [p.id, p]));
  for (const n of L.nodes) assert(dentro(n, pk.get(n.package!)!), `${n.id} fuera`);
  assertEquals(L.nodes.find((n) => n.id === 'c4')?.fill, 'store');
  assertEquals(L.nodes.find((n) => n.id === 'c1')?.fill, 'service');
});

Deno.test('herencia en bus: un solo triángulo por padre y ningún hijo corre sobre la barra', () => {
  const L = computeClassLayout(clases());
  const bus = L.edges.filter((e) => e.id.endsWith('::bus'));
  assertEquals(bus.length, 1);
  const busY = puntos(bus[0]!.path)[0]!.y;
  const hijos = L.edges.filter((e) => e.from !== e.to && e.kind === 'inheritance');
  assertEquals(hijos.length, 4);
  for (const e of hijos) {
    assertEquals(e.noTip, true, `${e.from} lleva triángulo propio`);
    const pts = puntos(e.path);
    for (let k = 1; k < pts.length; k++) {
      const horizontalEnBarra = pts[k]!.y === busY && pts[k - 1]!.y === busY && pts[k]!.x !== pts[k - 1]!.x;
      assert(!horizontalEnBarra, `${e.from} corre sobre la barra`);
    }
    assertEquals(pts[pts.length - 1]!.y, busY, `${e.from} no llega a la barra`);
  }
});

Deno.test('clases: toda arista lleva el color de su emisor', () => {
  const L = computeClassLayout(clases());
  for (const e of L.edges) assert(/^#[0-9A-F]{6}$/i.test(e.color ?? ''), `${e.id} sin color`);
});
