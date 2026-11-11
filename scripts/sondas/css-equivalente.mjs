// @contexto INDICE.md · scripts/README.md
// css-equivalente.mjs — comprueba que el SCSS compilado sigue siendo el mismo.
//
//   deno run -A --no-check scripts/sondas/css-equivalente.mjs [--guardar] [--carpeta=<dir>]
//
// Compila cada `src/**/*.scss` con el mismo motor del build (Dart Sass, loadPaths del build) y
// compara el CSS con la foto guardada.
//
// La comparacion es POR SELECTOR: para cada selector, la lista de sus bloques de declaraciones,
// en orden. El CSS puede cambiar de forma (espacios, saltos de linea, el orden entre reglas
// INDEPENDIENTES) sin que cambie lo que el navegador aplica. Lo que no se tolera es:
//
//   · un selector que aparece o desaparece;
//   · una declaracion que cambia;
//   · el orden de las declaraciones DENTRO de un mismo selector (ahi si cambia la cascada).
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

/**
 * Los bloques del CSS, agrupados por selector y en orden.
 *
 * Cada bloque es `selector -> declaraciones` (normalizadas). La clave de un selector es su
 * texto normalizado; el valor, la lista de sus bloques en el orden en que salen.
 */
function porSelector(css) {
  const out = new Map();
  // Los comentarios se quitan antes: si no, se cuelan en el selector. El @charset tampoco es
  // un selector: Sass lo emite al principio del CSS y hay que separarlo.
  const limpio = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/@charset\s*"[^"]*";\s*/, '');
  let sel = '';
  let depth = 0;
  let decl = '';
  const cerrar = () => {
    const clave = sel.replace(/\s+/g, ' ').trim();
    if (!out.has(clave)) out.set(clave, []);
    out.get(clave).push(decl.split(';').map((d) => d.replace(/\s+/g, ' ').trim()).filter(Boolean).join('; '));
  };
  for (const c of limpio) {
    if (c === '{') {
      if (depth === 0) { sel = sel.trim(); decl = ''; } else decl += c;
      depth++;
      continue;
    }
    if (c === '}') {
      depth--;
      if (depth === 0) { cerrar(); sel = ''; decl = ''; }
      else decl += c;
      continue;
    }
    if (depth === 0) sel += c;
    else decl += c;
  }
  return out;
}

const args = process.argv.slice(2);
const guardar = args.includes('--guardar');

const actual = {};
let errores = 0;
for (const abs of scssFiles()) {
  const rel = relative(RAIZ, abs).replaceAll('\\', '/');
  try {
    actual[rel] = { selectores: porSelector(compilar(abs)), bytes: statSync(abs).size };
  } catch (e) {
    errores++;
    console.log('  ERROR al compilar ' + rel + ': ' + (e && e.message ? e.message.split('\n')[0] : e));
  }
}

if (guardar) {
  const plano = {};
  for (const [k, v] of Object.entries(actual)) {
    plano[k] = { selectores: Object.fromEntries(v.selectores), bytes: v.bytes };
  }
  mkdirSync(dirname(FOTO), { recursive: true });
  writeFileSync(FOTO, JSON.stringify(plano, null, 1) + '\n', 'utf8');
  console.log('foto guardada: ' + FOTO + ' (' + Object.keys(plano).length + ' archivos' + (errores ? ', ' + errores + ' errores' : '') + ')');
} else {
  if (!existsSync(FOTO)) {
    console.error('no hay foto: corre antes con --guardar');
    process.exit(1);
  }
  const antes = JSON.parse(readFileSync(FOTO, 'utf8'));
  let distintos = 0;
  for (const [k, v] of Object.entries(actual)) {
    const a = antes[k]?.selectores;
    if (!a) {
      console.log('  NUEVO: ' + k);
      distintos++;
      continue;
    }
    const cambios = [];
    // Los selectores que hay ahora y no antes (o al reves).
    for (const sel of v.selectores.keys()) {
      if (!(sel in a)) {
        cambios.push('    + selector ' + sel.slice(0, 100));
        continue;
      }
      const la = a[sel];
      const lb = v.selectores.get(sel);
      if (la.length !== lb.length) {
        cambios.push('    - ' + sel.slice(0, 70) + ': ' + la.length + ' bloques -> ' + lb.length);
        continue;
      }
      for (let i = 0; i < la.length; i++) {
        if (la[i] !== lb[i]) {
          cambios.push('    - ' + sel.slice(0, 70) + '\n        antes: ' + la[i].slice(0, 100) + '\n        ahora: ' + lb[i].slice(0, 100));
          break;
        }
      }
    }
    for (const sel of Object.keys(a)) {
      if (!v.selectores.has(sel)) cambios.push('    - selector que desaparece: ' + sel.slice(0, 100));
    }
    if (cambios.length) {
      console.log('  DISTINTO: ' + k);
      console.log(cambios.slice(0, 6).join('\n'));
      distintos++;
    }
  }
  for (const k of Object.keys(antes)) {
    if (!actual[k]) {
      console.log('  FUE: ' + k);
      distintos++;
    }
  }
  console.log('archivos: ' + Object.keys(actual).length + ' | distintos: ' + distintos + (errores ? ' | errores de compilacion: ' + errores : ''));
  if (distintos) process.exit(1);
}
