// tests/sequence-self-loop.test.ts
//
// Guardian del fix de self-loop en <is-sequence-diagram>.
//
// El router basado en A* que existía colapsaba el self-loop a una línea
// vertical con banderín (un solo segmento visible). El fix traza la
// herradura UML de 4 esquinas a mano (out → up → back → down).
//
// Invariantes:
//
//   1. La ruta tiene exactamente 4 comandos de línea (M + 3 L).
//   2. El path forma un cuadrilátero: las 4 coordenadas son distintas.
//   3. El arrowTip cae en la lifeline (x = lifelineX), entrando desde
//      arriba (y < lifelineY).
//
// Si alguien refactoriza `routeSequenceSelf` y vuelve al A* (o pierde
// una esquina), el test detecta cuál invariante se rompió.

import { routeSequenceSelf } from '../src/components/_shared/diagram-astar.ts';

const failures = [];
const check = (cond, msg) => { if (!cond) failures.push(msg); };

// grid mínimo: 8 px por celda, 20 filas y 50 columnas bastan para self-loop.
const grid = { grid: 8, rows: 20, cols: 50, blocked: new Uint8Array(20 * 50) };
const lifelineX = 200;
const y = 100;

const route = routeSequenceSelf(lifelineX, y, grid, +1, 40, 24);

// Parseamos el path a coordenadas. Solo M y L (sin curvas).
const tokens = (route.path.match(/[MmLlHhVv][^MmLlHhVvZz]*/g) || []).map((t) => {
  const cmd = t[0];
  const nums = (t.slice(1).match(/-?\d*\.?\d+/g) || []).map(Number);
  return { cmd, nums };
});

check(
  tokens.length === 4,
  `path debe tener M + 3 L = 4 tokens (herradura); salió ${tokens.length}: ${route.path}`,
);
check(
  tokens.every((t) => t.cmd === 'M' || t.cmd === 'L'),
  `todos los comandos deben ser M o L; salió ${tokens.map((t) => t.cmd).join(',')}`,
);

// Cuadrilátero: 4 puntos distintos entre sí.
const puntos = tokens.map((t) => ({ x: t.nums[0], y: t.nums[1] }));
const paresUnicos = new Set(puntos.map((p) => `${p.x},${p.y}`));
check(
  paresUnicos.size === 4,
  `las 4 esquinas deben ser distintas; salieron ${puntos.length} puntos, ${paresUnicos.size} únicos`,
);

// Punta en la lifeline (x = lifelineX). El y puede ser el de la lifeline
// (la flecha entra desde arriba — el último segmento vertical lo dibuja
// el `svgArrowHead` que pinta desde la última esquina del path hasta
// arrowTip). Lo que garantiza la herradura es que la ÚLTIMA esquina
// del path esté en la columna de la lifeline y por encima del origen.
check(
  Math.abs(route.arrowTipX - lifelineX) < 0.5,
  `arrowTipX debe caer en la lifeline (${lifelineX}); salió ${route.arrowTipX}`,
);

const lastToken = tokens[tokens.length - 1];
const lastY = lastToken.nums[1];
check(
  lastY < y,
  `la última esquina del path debe estar por encima de la lifeline (y < ${y}); salió ${lastY} (esto es lo que hace visible la herradura)`,
);

// Caso simétrico: side=-1 (self-loop hacia la izquierda).
const routeLeft = routeSequenceSelf(lifelineX, y, grid, -1, 40, 24);
const tokensLeft = (routeLeft.path.match(/[MmLlHhVv][^MmLlHhVvZz]*/g) || []);
check(
  tokensLeft.length === 4,
  `path side=-1 también debe tener 4 tokens; salió ${tokensLeft.length}`,
);

if (failures.length) {
  console.error('sequence-self-loop.test.ts: FAIL');
  for (const f of failures) console.error('  -', f);
  process.exit(1);
}

console.log(`sequence-self-loop.test.ts: PASS — herradura OK (4 segmentos, punta en ${route.arrowTipX},${route.arrowTipY})`);
process.exit(0);