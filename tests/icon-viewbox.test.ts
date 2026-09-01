// tests/icon-viewbox.test.ts
//
// Protege contra el bug "la familia X no muestra iconos".
//
// Historia: una pasada de normalizacion reescribio TODOS los
// assets/icons/<prefix>/*.svg con `width="24" height="24" viewBox="0 0 24 24"`.
// Para mdi/tabler (grid nativo 24) eso es correcto; para academicons (448x512),
// fa (1408x1792), logos (variable), el path quedo dibujado fuera del viewBox y
// el icono se renderiza VACIO. Solo se notaba entrando a esas familias.
//
// NO comparar contra `collections.json.height`: ese campo es el alto de
// *presentacion* del set (academicons declara 32) mientras el SVG servido
// conserva su tamano nativo (512). Comparar contra el da falsos positivos
// masivos. La referencia es `assets/icons/viewbox.snapshot.json`, tomado
// despues de reparar contra la API de Iconify.
//
// Reparar / regenerar snapshot:  node scripts/fix-icon-viewbox.ts
//
// Uso:  node tests/icon-viewbox.test.ts

import { readFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import assert from 'node:assert/strict';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);
const assetsIcons = join(root, 'src', 'assets', 'icons');

const readJson = async (f) => JSON.parse(await readFile(join(assetsIcons, f), 'utf8'));

let snap;
try { snap = await readJson('viewbox.snapshot.json'); }
catch {
  console.log('SKIP icon-viewbox — falta viewbox.snapshot.json (corre `node scripts/fix-icon-viewbox.ts`)');
  process.exit(0);
}

const viewBoxOf = (svg) => {
  const m = svg.match(/viewBox="\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s*"/);
  return m ? { left: +m[1], top: +m[2], w: +m[3], h: +m[4] } : null;
};

/** Mismo muestreo que el snapshot: 1 de cada N, ~40 por coleccion. */
const SAMPLES = 40;

const offenders = [];
let checked = 0;

for (const [prefix, expected] of Object.entries(snap)) {
  let files;
  try { files = (await readdir(join(assetsIcons, prefix))).filter((f) => f.endsWith('.svg')); }
  catch { continue; } // coleccion no descargada en esta maquina
  if (!files.length) continue;
  const allowed = new Set(expected.boxes);
  const stepSize = Math.max(1, Math.floor(files.length / SAMPLES));
  for (let i = 0; i < files.length; i += stepSize) {
    const box = viewBoxOf(await readFile(join(assetsIcons, prefix, files[i]), 'utf8'));
    checked++;
    if (!box) { offenders.push(`${prefix}/${files[i]}: sin viewBox`); continue; }
    const key = `${box.w}x${box.h}`;
    if (!allowed.has(key)) {
      offenders.push(`${prefix}/${files[i]}: viewBox ${key}, el snapshot espera ${[...allowed].join(' | ')}`);
    }
  }
}

assert.equal(
  offenders.length,
  0,
  'SVG con viewBox distinto al del snapshot — alguien reescribio los headers.\n' +
    'Si el cambio es legitimo, regenera con `node scripts/fix-icon-viewbox.ts`.\n  ' +
    offenders.slice(0, 20).join('\n  ') +
    (offenders.length > 20 ? `\n  ...y ${offenders.length - 20} mas` : ''),
);

// Sanidad: el snapshot no puede haber colapsado a "todo 24x24" (eso es
// exactamente la forma del bug original).
const only24 = Object.values(snap).every((v) => v.boxes.length === 1 && v.boxes[0] === '24x24');
assert.equal(only24, false, 'el snapshot dice que TODAS las colecciones son 24x24: es el bug, no la verdad');

// El metadato tiene que cubrir todas las familias del indice, o los filtros del
// explorador (categoria / grid / paleta / licencia) se quedan sin datos.
const index = await readJson('index.json');
const meta = await readJson('collections.json');
const sinMeta = index.families.map((f) => f.prefix).filter((p) => !meta[p]);
assert.equal(
  sinMeta.length,
  0,
  `collections.json no cubre estas familias (corre \`node scripts/sync-icon-collections.ts\`): ${sinMeta.join(', ')}`,
);

console.log(`OK icon-viewbox — ${checked} svg muestreados en ${Object.keys(snap).length} colecciones`);
