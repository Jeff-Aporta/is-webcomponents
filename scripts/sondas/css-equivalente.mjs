// css-equivalente.mjs — comprueba que el SCSS compilado sigue siendo el mismo.
//
//   deno run -A --no-check scripts/sondas/css-equivalente.mjs [--guardar] [--carpeta=<dir>]
//
// Compila cada `src/**/*.scss` con el mismo motor del build (Dart Sass, loadPaths del build) y
// compara el CSS con la foto guardada. La comparación es por DECLARACIÓN (selector + bloque de
// declaraciones), en orden: el CSS puede cambiar de forma (espacios, saltos de línea) sin que
// cambie lo que el navegador aplica. Lo que no se tolera es un selector o una declaración
// distinta: eso es un cambio de estilo.
//
// `--guardar` toma la foto (se usa antes de un lote y se compara despues).
import { compile } from 'sass';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const FOTO = join(RAIZ, '.tmp', 'handoff', 'scss-antes.json');
const SRC = join(RAIZ, 'src');

/** Recorre `src/` y devuelve la ruta de cada .scss. */
function scssFiles(dir = SRC, out = []) {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === 'node_modules' || e.name.startsWith('.')) continue;
      scssFiles(p, out);
    } else if (e.name.endsWith('.scss')) out.push(p);
  }
  return out;
}

/** Compila un .scss como lo hace el build (loadPaths: su carpeta y src/styles). */
function compilar(abs) {
  const r = compile(abs, {
    style: 'expanded',
    sourceMap: false,
    loadPaths: [dirname(abs), join(SRC, 'styles')],
    silenceDeprecations: ['legacy-js-api', 'import', 'global-builtin', 'color-functions'],
  });
  return r.css;
}

/** Divide el CSS en bloques (selector + declaraciones) para comparar por Declaracion. */
function bloques(css) {
  const out = [];
  let sel = '';
  let depth = 0;
  let decl = '';
  let enAt = false;
  for (let i = 0; i < css.length; i++) {
    const c = css[i];
    if (c === '{') {
      if (depth === 0) { sel = sel.trim(); decl = ''; }
      else decl += c;
      depth++;
      continue;
    }
    if (c === '}') {
      depth--;
      if (depth === 0) {
        out.push(sel + ' { ' + decl.split(';').map((d) => d.trim()).filter(Boolean).join('; ') + ' }');
        sel = '';
        decl = '';
        enAt = false;
      } else decl += c;
      continue;
    }
    if (depth === 0) sel += c;
    else decl += c;
    if (c === '@' && depth === 0) enAt = true;
  }
  return out;
}

/** Normaliza un CSS a su lista de bloques. */
const normalizar = (css) => bloques(css).map((b) => b.replace(/\s+/g, ' ').trim());

const args = process.argv.slice(2);
const guardar = args.includes('--guardar');

const actual = {};
let errores = 0;
for (const abs of scssFiles()) {
  const rel = relative(RAIZ, abs).replaceAll('\\', '/');
  try {
    actual[rel] = normalizar(compilar(abs));
  } catch (e) {
    errores++;
    console.log('  ERROR al compilar ' + rel + ': ' + (e && e.message ? e.message.split('\n')[0] : e));
  }
}

if (guardar) {
  mkdirSync(dirname(FOTO), { recursive: true });
  const conBytes = {};
  for (const [k, v] of Object.entries(actual)) {
    const abs = join(RAIZ, k);
    conBytes[k] = { bloques: v, bytes: statSync(abs).size };
  }
  writeFileSync(FOTO, JSON.stringify(conBytes, null, 1) + '\n', 'utf8');
  console.log('foto guardada: ' + FOTO + ' (' + Object.keys(conBytes).length + ' archivos' + (errores ? ', ' + errores + ' errores' : '') + ')');
} else {
  if (!existsSync(FOTO)) { console.error('no hay foto: corre antes con --guardar'); process.exit(1); }
  const antes = JSON.parse(readFileSync(FOTO, 'utf8'));
  let distintos = 0;
  for (const [k, v] of Object.entries(actual)) {
    const a = antes[k]?.bloques;
    if (!a) { console.log('  NUEVO: ' + k); distintos++; continue; }
    if (a.length !== v.length) {
      console.log('  DISTINTO (bloques ' + a.length + ' -> ' + v.length + '): ' + k);
      distintos++;
      continue;
    }
    const cambios = [];
    for (let i = 0; i < a.length; i++) if (a[i] !== v[i]) cambios.push('    - ' + a[i] + '\n    + ' + v[i]);
    if (cambios.length) { console.log('  DISTINTO: ' + k); console.log(cambios.slice(0, 6).join('\n')); distintos++; }
  }
  for (const k of Object.keys(antes)) if (!actual[k]) { console.log('  FUE: ' + k); distintos++; }
  console.log('archivos: ' + Object.keys(actual).length + ' | distintos: ' + distintos + (errores ? ' | errores de compilacion: ' + errores : ''));
  if (distintos) process.exit(1);
}