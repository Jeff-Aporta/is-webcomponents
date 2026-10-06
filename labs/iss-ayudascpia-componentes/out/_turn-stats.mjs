// labs/iss-ayudascpia-componentes/out/_turn-stats.mjs
// Reporte de nº de giros por arista (regla 4 W54: max MAX_TURNS_PER_EDGE).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const svg = readFileSync(join(dirname(fileURLToPath(import.meta.url)), 'componentes.svg'), 'utf8');
const edges = [...svg.matchAll(/class="cd-edge__path"[^>]*\bd="([^"]+)"|\bd="([^"]+)"[^>]*class="cd-edge__path"/g)]
  .map((m) => m[1] || m[2]);

const turnOf = (d) => {
  const pts = [...d.matchAll(/[ML]\s*([\d.-]+)\s*,\s*([\d.-]+)/g)].map((m) => ({ x: +m[1], y: +m[2] }));
  if (pts.length < 3) return 0;
  let turns = 0, prevDx = 0, prevDy = 0;
  for (let i = 1; i < pts.length; i++) {
    const dx = pts[i].x - pts[i - 1].x;
    const dy = pts[i].y - pts[i - 1].y;
    if (i > 1 && (dx !== prevDx || dy !== prevDy)) turns++;
    prevDx = dx; prevDy = dy;
  }
  return turns;
};

let bad = 0;
const counts = edges.map((d, i) => {
  const t = turnOf(d);
  if (t > 4) { bad++; console.log(`  edge ${i} turns=${t} d=${d.slice(0, 80)}`); }
  return t;
});
console.log('turns per edge:', counts);
console.log('max turns:', Math.max(0, ...counts));
console.log('edges with >4 turns:', bad);
console.log('total edges:', edges.length);
