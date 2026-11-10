// @contexto INDICE.md · scripts/README.md
// min-mjs.mjs — los módulos ES del kit se publican como `.min.mjs` (plan D2, fase F3).
//
//   deno run -A --no-check scripts/codemods/min-mjs.mjs [--dry-run]
//
// Reescribe `<nombre>.min.js` → `<nombre>.min.mjs` cuando `<nombre>` es un módulo publicado del kit (componentes y
// módulos de src/components, src/core, el loader, lib, src/ai y sus motores, los compañeros de doc-demo) en
// src/**, scripts/**, skills/**, tests/**, specs/**, README.md, AGENTS.md, index.html, demos/** y labs/**.
// `_shared/base-sheets.min.js` (carpeta retirada) pasa a `core/iswc-element.min.mjs`.
//
// No se toca (NO_KIT / línea de compat):
//   - lo que no es del kit: vendor de terceros (`/npm/`, cdnjs, unpkg, esm.sh), `x.preview.min.js`, nombres que
//     no publica el kit (jszip, mammoth.browser, chart.umd…);
//   - la galería, que conserva `.min.js`: `dist/scripts/`, `dist/pages/`, `dist/previews/`, `cdn:../scripts/`,
//     `gallery-app.min.js`;
//   - URLs pineadas a un SHA (`@<sha>/`, githack `/<sha>/`): el pin viejo sirve lo viejo (inmutable); `pin-update`
//     las mueve al re-pinear;
//   - una línea que habla de la copia de compatibilidad `core/loader.min.js` (contiene «compat» o «(F5)»);
//   - EXCEPCIONES: historia (lessons, adr, el plan) y este codemod.
//
// Idempotente: una segunda corrida no encuentra nada. El guardián tests/gobernanza/extension-modulos.test.ts usa
// `pendientes()` de aquí para exigir que no quede ninguno en src/**, skills/**, specs/** y README.md.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Raíces barridas (carpetas o archivos, desde la raíz del repo). */
const RAICES = ['src', 'scripts', 'skills', 'tests', 'specs', 'README.md', 'AGENTS.md', 'index.html', 'demos', 'labs'];

/** Carpetas que no se barren (por nombre, en cualquier nivel). */
const SALTAR_CARPETAS = new Set(['node_modules', '.git', 'dist', '.shots', '.iswc-render-tmp', '.tmp']);

/** Archivos (ruta desde la raíz, con `/`) que citan `.min.js` a propósito. */
const EXCEPCIONES = {
  'scripts/codemods/min-mjs.mjs': 'este codemod: define las reglas con la extensión vieja',
  'tests/gobernanza/extension-modulos.test.ts': 'el guardián: busca la extensión vieja',
  'specs/lessons.md': 'historia: filas fechadas que citan los artefactos de su momento',
  'specs/adr.md': 'historia: decisiones fechadas',
  'specs/plan-carga-modular.md': 'el plan: describe el antes (.min.js) y el después (.min.mjs)',
};

const EXT_TEXTO = /\.(ts|tsx|js|mjs|cjs|md|html|json|txt|yml|yaml|sh|ps1|py|css|scss)$/i;

const barras = (ruta) => ruta.replaceAll('\\', '/');

/** Nombres de los módulos ES que publica el kit (sin `.min.mjs`). */
function nombresKit(raiz = RAIZ) {
  const nombres = new Set(['loader', 'obj', 'ref-obj', 'zod', 'doc-demo-boot', 'doc-demo-host', 'doc-demo-galeria']);
  const recorrer = (dir) => {
    for (const n of readdirSync(dir)) {
      const p = join(dir, n);
      if (statSync(p).isDirectory()) recorrer(p);
      else if (/\.ts$/.test(n) && !/\.(d|schemas|preview|selfcheck)\./.test(n) && !n.endsWith('.d.ts') && n !== 'index.ts') nombres.add(n.replace(/\.ts$/, ''));
    }
  };
  recorrer(join(raiz, 'src', 'components'));
  for (const n of readdirSync(join(raiz, 'src', 'core'))) if (n.endsWith('.ts')) nombres.add(n.replace(/\.ts$/, ''));
  for (const n of readdirSync(join(raiz, 'src', 'ai'))) if (n.endsWith('.ts')) nombres.add(n.replace(/\.ts$/, ''));
  for (const n of readdirSync(join(raiz, 'src', 'ai', 'motores'))) if (n.endsWith('.ts')) nombres.add(n.replace(/\.ts$/, ''));
  nombres.delete('index');
  return nombres;
}

/** `<ruta>` que precede al nombre: caracteres de una URL o ruta hasta el primer delimitador. */
const PATRON = /([\w@.:/~%-]*?)([\w-]+)\.min\.js(?![\w$])/g;

const TERCEROS = /\/npm\/|cdnjs\.|unpkg\.|esm\.sh|skypack\./i;
const GALERIA = /dist\/(?:scripts|pages|previews)\/|cdn:\.\.\/scripts\//;
const PIN_SHA = /@[0-9a-f]{7,40}\/|githack\.com\/[^/]+\/[^/]+\/[0-9a-f]{7,40}\//i;
const LINEA_COMPAT = /compat|\(F5\)/i;

/** ¿Es `prefijo + nombre.min.js` un módulo del kit que debe pasar a `.min.mjs`? */
function esDelKit(prefijo, nombre, nombres) {
  if (prefijo.endsWith('.')) return false;
  if (!nombres.has(nombre)) return false;
  if (TERCEROS.test(prefijo) || GALERIA.test(prefijo) || PIN_SHA.test(prefijo)) return false;
  return true;
}

/** Reescribe un texto; devuelve `{ texto, n, saltados }` (saltados: tokens `.min.js` que no son del kit, para revisar). */
function reescribir(texto, nombres) {
  let n = 0;
  const saltados = [];
  const lineas = texto.split('\n').map((linea) => {
    if (!linea.includes('.min.js')) return linea;
    return linea.replace(PATRON, (entero, prefijo, nombre) => {
      if (prefijo.endsWith('_shared/') && nombre === 'base-sheets') {
        n++;
        return `${prefijo.slice(0, -'_shared/'.length)}core/iswc-element.min.mjs`;
      }
      if (!esDelKit(prefijo, nombre, nombres)) { saltados.push(entero); return entero; }
      if (nombre === 'loader' && LINEA_COMPAT.test(linea)) { saltados.push(entero); return entero; }
      n++;
      return `${prefijo}${nombre}.min.mjs`;
    });
  });
  return { texto: lineas.join('\n'), n, saltados };
}

/** true si la ruta (desde la raíz, con `/`) es una excepción. */
function esExcepcion(rel) {
  return Object.hasOwn(EXCEPCIONES, rel);
}

/** Archivos de texto bajo las raíces dadas (rutas absolutas). */
function archivos(raices = RAICES, raiz = RAIZ) {
  const out = [];
  const recorrer = (p) => {
    if (!existsSync(p)) return;
    if (statSync(p).isDirectory()) {
      if (SALTAR_CARPETAS.has(basename(p))) return;
      for (const n of readdirSync(p)) recorrer(join(p, n));
      return;
    }
    if (EXT_TEXTO.test(p)) out.push(p);
  };
  for (const r of raices) recorrer(join(raiz, r));
  return out;
}

/** Ocurrencias que el codemod reescribiría (ruta relativa → cuántas): el guardián exige que no quede ninguna. */
export function pendientes(raices, raiz = RAIZ) {
  const nombres = nombresKit(raiz);
  const out = {};
  for (const abs of archivos(raices, raiz)) {
    const rel = barras(relative(raiz, abs));
    if (esExcepcion(rel)) continue;
    const texto = readFileSync(abs, 'utf8');
    if (!texto.includes('.min.js')) continue;
    const { n } = reescribir(texto, nombres);
    if (n) out[rel] = n;
  }
  return out;
}

if (import.meta.main) {
  const seco = Deno.args.includes('--dry-run');
  const nombres = nombresKit();
  const porCarpeta = {};
  const saltados = {};
  let total = 0;
  for (const abs of archivos()) {
    const rel = barras(relative(RAIZ, abs));
    if (esExcepcion(rel)) continue;
    const previo = readFileSync(abs, 'utf8');
    if (!previo.includes('.min.js')) continue;
    const r = reescribir(previo, nombres);
    for (const s of r.saltados) saltados[s] = (saltados[s] ?? 0) + 1;
    if (!r.n) continue;
    const carpeta = rel.includes('/') ? rel.split('/')[0] : rel;
    porCarpeta[carpeta] = (porCarpeta[carpeta] ?? 0) + r.n;
    total += r.n;
    if (!seco) writeFileSync(abs, r.texto);
  }
  console.log(`${seco ? '[dry-run] ' : ''}${total} sustituciones .min.js → .min.mjs`);
  for (const [c, k] of Object.entries(porCarpeta).sort()) console.log(`  ${c.padEnd(12)} ${k}`);
  const listaSaltados = Object.entries(saltados).sort((a, b) => b[1] - a[1]);
  console.log(`${listaSaltados.length} tokens .min.js que se conservan (no son módulos del kit, galería, pin SHA o compat):`);
  for (const [s, k] of listaSaltados.slice(0, Deno.args.includes('--todos') ? Infinity : 60)) console.log(`  ${String(k).padStart(4)}  ${s}`);
}
