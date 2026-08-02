/**
 * fix-icon-viewbox.mjs — repara SVGs locales con el viewBox equivocado.
 *
 * CONTEXTO DEL BUG (no volver a provocarlo):
 * Una pasada de "normalizacion" reescribio TODOS los assets/icons/<prefix>/*.svg
 * a `width="24" height="24" viewBox="0 0 24 24"`. Para mdi/tabler eso es
 * correcto (su grid nativo es 24). Para colecciones con otro grid
 * (academicons = 448x512, fa = 512x512, etc.) el path quedo dibujado fuera del
 * viewBox => el icono se renderiza VACIO. Sintoma reportado: "?f=academicons no
 * se ven los iconos" mientras "?f=basil si se ven".
 *
 * NO usar heuristicas de coordenadas para detectar esto: hay paths mdi
 * perfectamente validos con numeros > 90 (radios de arco), asi que "coordenada
 * mayor que el viewBox" produce miles de falsos positivos. La unica fuente de
 * verdad es el metadato de Iconify.
 *
 * Uso:
 *   node scripts/fix-icon-viewbox.mjs --detect     # sondea colecciones (rapido)
 *   node scripts/fix-icon-viewbox.mjs             # sondea y repara las sucias
 *   node scripts/fix-icon-viewbox.mjs --only fa,academicons
 */
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const assetsIcons = join(root, 'assets', 'icons');

const argv = process.argv.slice(2);
const DETECT_ONLY = argv.includes('--detect');
const onlyArg = argv.indexOf('--only');
const ONLY = onlyArg >= 0 ? new Set((argv[onlyArg + 1] || '').split(',').filter(Boolean)) : null;

/** Dimensiones declaradas en el header local del SVG. */
export function localBox(svg) {
  const m = svg.match(/viewBox="\s*([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s+([\d.\-]+)\s*"/);
  if (!m) return null;
  return { left: +m[1], top: +m[2], w: +m[3], h: +m[4] };
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let b = '';
      res.on('data', (c) => (b += c));
      res.on('end', () => {
        if (res.statusCode !== 200) return reject(new Error(`${res.statusCode} ${url}`));
        try { resolve(JSON.parse(b)); } catch (e) { reject(e); }
      });
    }).on('error', reject);
  });
}

const chunk = (arr, n) =>
  Array.from({ length: Math.ceil(arr.length / n) }, (_, i) => arr.slice(i * n, i * n + n));

async function iconMeta(prefix, names) {
  const url = `https://api.iconify.design/${prefix}.json?icons=${names.map(encodeURIComponent).join(',')}`;
  const data = await getJson(url);
  const defW = data.width || 16;
  const defH = data.height || 16;
  const out = new Map();
  for (const [name, ic] of Object.entries(data.icons || {})) {
    out.set(name, {
      body: ic.body,
      w: ic.width || defW,
      h: ic.height || defH,
      left: ic.left || 0,
      top: ic.top || 0,
    });
  }
  return out;
}

const renderSvg = (m) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${m.w}" height="${m.h}" ` +
  `viewBox="${m.left} ${m.top} ${m.w} ${m.h}">${m.body}</svg>`;

async function localNames(prefix) {
  const files = await readdir(join(assetsIcons, prefix));
  return files.filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4));
}

/** Sondeo: ¿la coleccion tiene algun icono cuyo box real difiera del local? */
async function probe(prefix, names) {
  const sample = names.length <= 60 ? names : chunk(names, Math.ceil(names.length / 60)).map((c) => c[0]);
  const meta = await iconMeta(prefix, sample);
  for (const [name, m] of meta) {
    const svg = await readFile(join(assetsIcons, prefix, `${name}.svg`), 'utf8').catch(() => '');
    const box = localBox(svg);
    if (!box) return true;
    if (box.w !== m.w || box.h !== m.h || box.left !== m.left || box.top !== m.top) return true;
  }
  return false;
}

async function repair(prefix, names) {
  let fixed = 0;
  for (const part of chunk(names, 100)) {
    const meta = await iconMeta(prefix, part);
    for (const [name, m] of meta) {
      const file = join(assetsIcons, prefix, `${name}.svg`);
      const cur = await readFile(file, 'utf8').catch(() => '');
      const box = localBox(cur);
      if (box && box.w === m.w && box.h === m.h && box.left === m.left && box.top === m.top) continue;
      await writeFile(file, renderSvg(m), 'utf8');
      fixed++;
    }
  }
  return fixed;
}

/**
 * Snapshot de los viewBox reales, por coleccion.
 *
 * OJO: `collections.json.height` NO sirve como referencia. Es el alto de
 * *presentacion* del set (academicons declara 32) mientras el SVG servido
 * conserva su tamano nativo (448x512). Comparar contra ese campo produce
 * falsos positivos masivos. La referencia buena es este snapshot, tomado justo
 * despues de reparar contra la API.
 */
export async function snapshot(prefixes) {
  const out = {};
  for (const prefix of prefixes) {
    const files = (await readdir(join(assetsIcons, prefix))).filter((f) => f.endsWith('.svg'));
    if (!files.length) continue;
    const boxes = new Set();
    const stepSize = Math.max(1, Math.floor(files.length / 40));
    for (let i = 0; i < files.length; i += stepSize) {
      const box = localBox(await readFile(join(assetsIcons, prefix, files[i]), 'utf8'));
      if (box) boxes.add(`${box.w}x${box.h}`);
    }
    out[prefix] = { count: files.length, boxes: [...boxes].sort() };
  }
  await writeFile(join(assetsIcons, 'viewbox.snapshot.json'), JSON.stringify(out, null, 0), 'utf8');
  console.log(`viewbox.snapshot.json · ${Object.keys(out).length} colecciones`);
}

async function main() {
  const entries = await readdir(assetsIcons, { withFileTypes: true });
  const list = entries
    .filter((e) => e.isDirectory() && !e.name.startsWith('.'))
    .map((e) => e.name)
    .filter((p) => !ONLY || ONLY.has(p));

  let dirty = 0;
  let totalFixed = 0;
  for (const prefix of list) {
    const names = await localNames(prefix);
    if (!names.length) continue;
    let bad;
    try { bad = await probe(prefix, names); }
    catch (e) { console.error(`  ! sondeo ${prefix}: ${e.message}`); continue; }
    if (!bad) continue;
    dirty++;
    console.log(`${prefix}: viewBox desalineado (${names.length} iconos)`);
    if (DETECT_ONLY) continue;
    try { totalFixed += await repair(prefix, names); }
    catch (e) { console.error(`  ! reparando ${prefix}: ${e.message}`); }
  }
  console.log(`\n${dirty} colecciones sucias${DETECT_ONLY ? '' : ` · ${totalFixed} svg reescritos`}`);
  if (!DETECT_ONLY) await snapshot(list);
}

if (process.argv[1] && process.argv[1].endsWith('fix-icon-viewbox.mjs')) main();
