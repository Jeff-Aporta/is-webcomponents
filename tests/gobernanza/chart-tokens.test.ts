// tests/gobernanza/chart-tokens.test.ts
//
// Contrato del color de gráficas. Fuente única: --iswc-chart-1..8 (src/styles/chart-tokens.ts).
//   1. La capa común de palettes.scss declara las 8 series y su bg2font.
//   2. Una serie = main: con el main dentro de la banda del modo, la serie 1 es exactamente el main.
//   3. Las 25 paletas × claro/oscuro: series legibles sobre la superficie y distintas de su vecina.
//   4. Guardián: gráficas sin hex, rgb() ni hsl() fijos.
//
// Permitido: comentarios y previews. Un color explícito lo pone quien consume la API (`backgroundColor`).
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { contrastRatio, PALETTES, resolvePalette, toHex } from '../../src/styles/palette-build.ts';
import { CHART_BAND, CHART_SERIES, chartSerieOklch } from '../../src/styles/chart-tokens.ts';
import { hexToOklch, oklchToHex } from '../../src/components/diagrams/utils/oklch.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const leer = (p: string): string => readFileSync(join(ROOT, p), 'utf8').replace(/\r\n/g, '\n');
const MODOS = ['light', 'dark'] as const;

/** Mínimos medidos. Si una receta nueva los baja, la rampa empeoró. */
const CONTRASTE_MIN = 2.8;
const DISTANCIA_MIN = 0.1;

const rgb = (hex: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number];

function serieDe(main: string, modo: 'light' | 'dark'): string[] {
  const o = hexToOklch(main) as [number, number, number];
  return Array.from({ length: CHART_SERIES }, (_, k) => oklchToHex(...chartSerieOklch(o, k, modo)));
}

function distancia(a: string, b: string): number {
  const [la, ca, ha] = hexToOklch(a) as [number, number, number];
  const [lb, cb, hb] = hexToOklch(b) as [number, number, number];
  const rad = Math.PI / 180;
  return Math.hypot(la - lb, ca * Math.cos(ha * rad) - cb * Math.cos(hb * rad), ca * Math.sin(ha * rad) - cb * Math.sin(hb * rad));
}

test('chart-tokens: palettes.scss declara las 8 series y su bg2font', () => {
  const scss = leer('src/styles/palettes.scss');
  for (let n = 1; n <= CHART_SERIES; n++) {
    assert.match(scss, new RegExp(`--iswc-chart-${n}: light-dark\\(`), `falta --iswc-chart-${n}`);
    assert.match(scss, new RegExp(`--iswc-chart-on-${n}: oklch\\(from var\\(--iswc-chart-${n}\\)`), `falta --iswc-chart-on-${n}`);
  }
});

test('chart-tokens: una serie es el main de la paleta', () => {
  for (const p of PALETTES) {
    for (const modo of MODOS) {
      const main = toHex(resolvePalette(p, modo).brand);
      const [l] = hexToOklch(main) as [number, number, number];
      const [lo, hi] = CHART_BAND[modo].main;
      if (l < lo || l > hi) continue;
      assert.equal(distancia(serieDe(main, modo)[0] as string, main) < 0.002, true, `${p.value} ${modo}`);
    }
  }
});

test('chart-tokens: series legibles y distintas en 25 paletas × claro/oscuro', () => {
  const fallos: string[] = [];
  for (const p of PALETTES) {
    for (const modo of MODOS) {
      const r = resolvePalette(p, modo);
      const superficie = r['bg-elev'] as [number, number, number];
      const serie = serieDe(toHex(r.brand), modo);
      serie.forEach((hex, k) => {
        const c = contrastRatio(rgb(hex), superficie);
        if (k > 0 && c < CONTRASTE_MIN) fallos.push(`${p.value} ${modo} serie ${k + 1}: contraste ${c.toFixed(2)}`);
        if (k === 0) return;
        const d = distancia(hex, serie[k - 1] as string);
        if (d < DISTANCIA_MIN) fallos.push(`${p.value} ${modo} series ${k}-${k + 1}: distancia ${d.toFixed(3)}`);
      });
    }
  }
  assert.deepEqual(fallos, []);
});

const DIAGRAMAS_GRAFICA = ['sankey-diagram', 'venn-diagram', 'quadrant-chart', 'journey-map', 'gantt', 'timeline', 'mindmap'];

function archivosGuardados(): string[] {
  const de = (dir: string): string[] => readdirSync(join(ROOT, dir))
    .filter((f) => /\.(ts|scss)$/.test(f) && !/\.preview\.ts$/.test(f))
    .map((f) => `${dir}/${f}`);
  return [
    ...de('src/components/charts'),
    ...de('src/components/charts/utils'),
    ...de('src/components/data-viz'),
    ...DIAGRAMAS_GRAFICA.flatMap((d) => [`src/components/diagrams/${d}.ts`, `src/components/diagrams/${d}.scss`]),
    'src/core/diagram-kit.scss',
    'src/core/svg-chart-engine.ts',
    'src/components/diagrams/utils/diagram-palette.ts',
  ];
}

const COLOR_FIJO = /(?<![\w.$&])#(?:[0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})\b(?!\s*[(:=])|\b(?:rgba?|hsla?)\(\s*\d/i;

test('chart-tokens: guardián contra colores fijos en gráficas', () => {
  const fallos: string[] = [];
  for (const f of archivosGuardados()) {
    const sinComentarios = leer(f).replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
    sinComentarios.split('\n').forEach((linea, i) => {
      const codigo = linea.replace(/(^|\s)\/\/.*$/, '');
      if (COLOR_FIJO.test(codigo)) fallos.push(`${f}:${i + 1}: ${codigo.trim().slice(0, 90)}`);
    });
  }
  assert.deepEqual(fallos, [], 'usa --iswc-chart-N, seriesColor() o tokens semánticos');
});

export default lista();
