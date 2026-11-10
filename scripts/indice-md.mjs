// indice-md.mjs — genera INDICE.md: el indice de TODOS los md del repo.
//
//   deno task indice
//
// Recorre los md versionados (fuera de node_modules, dist y .tmp*), los agrupa por dominio en un
// orden fijo y escribe una fila por documento: el titulo (el primer #), la ruta relativa como
// enlace y la URL raw. Es idempotente: correrlo dos veces da el mismo archivo.
//
// El indice es la bisagra de la jerarquia para agentes:
//   AGENTS.md (~150 lineas) -> INDICE.md -> specs/constitution.md -> skill principal -> md del dominio
//
// Y cada fuente lleva la cabecera `// @contexto INDICE.md · <md del dominio>`: las dos rutas que
// hay que leer antes de tocar ese archivo.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.cwd();

/** Repo de GitHub: se lee del fuente, nunca a mano. */
const REPO = 'Jeff-Aporta/is-webcomponents';
/** Prefijo de las URL raw de un md del repo. */
const URL_RAW = 'https://raw.githubusercontent.com/' + REPO + '/main/';

/** Md que el indice no indexa (el indice se indexa a si mismo). */
const EXCLUIDOS = new Set(['INDICE.md']);

/** Dominios, en orden. Cada uno es una carpeta (o un grupo de rutas) con su propio md. */
const DOMINIOS = [
  { clave: 'contexto', titulo: 'Contexto general', raiz: '' },
  { clave: 'specs', titulo: 'Specs', raiz: 'specs/' },
  { clave: 'core', titulo: 'Core', raiz: 'src/core/' },
  { clave: 'cdn', titulo: 'CDN', raiz: 'src/cdn/' },
  { clave: 'componentes', titulo: 'Componentes', raiz: 'src/components/' },
  { clave: 'app', titulo: 'App y galeria', raiz: 'src/app/' },
  { clave: 'pages', titulo: 'Pages', raiz: 'src/pages/' },
  { clave: 'previews', titulo: 'Previews', raiz: 'src/previews/' },
  { clave: 'styles', titulo: 'Estilos', raiz: 'src/styles/' },
  { clave: 'utils', titulo: 'Utils', raiz: 'src/utils/' },
  { clave: 'scripts', titulo: 'Scripts', raiz: 'scripts/' },
  { clave: 'tests', titulo: 'Tests', raiz: 'tests/' },
  { clave: 'skills', titulo: 'Skills', raiz: 'skills/' },
  { clave: 'demos', titulo: 'Demos', raiz: 'demos/' },
  { clave: 'labs', titulo: 'Labs', raiz: 'labs/' },
  { clave: 'assets', titulo: 'Assets', raiz: 'assets/' },
  { clave: 'historicos', titulo: 'Historicos', raiz: '' },
];

/** Los md versionados. */
function mdsVersionados() {
  return execFileSync('git', ['ls-files', '*.md'], { encoding: 'utf8' })
    .split('\n').map((s) => s.trim()).filter(Boolean)
    .filter((r) => !r.startsWith('dist/') && !r.startsWith('.tmp') && !r.includes('node_modules/'))
    .filter((r) => !EXCLUIDOS.has(r));
}

/** El titulo de un md: el primer encabezado de nivel 1. */
function tituloDe(ruta) {
  const texto = readFileSync(join(RAIZ, ruta), 'utf8');
  const m = texto.match(/^#\s+(.+)$/m);
  return m ? m[1].trim() : ruta;
}

/** La categoria de un md: la carpeta de primer nivel, o el dominio que lo contiene. */
function dominioDe(ruta) {
  if (ruta === 'AGENTS.md' || ruta === 'README.md' || ruta === 'PROMPT.md' || ruta === 'reference.md' || ruta === 'CONTRIBUTING.md') return 'contexto';
  if (ruta.startsWith('specs/')) return 'specs';
  if (ruta.startsWith('src/components/')) return 'componentes';
  if (ruta.startsWith('src/core/')) return 'core';
  if (ruta.startsWith('src/cdn/')) return 'cdn';
  if (ruta.startsWith('src/app/')) return 'app';
  if (ruta.startsWith('src/pages/')) return 'pages';
  if (ruta.startsWith('src/previews/')) return 'previews';
  if (ruta.startsWith('src/styles/')) return 'styles';
  if (ruta.startsWith('src/utils/')) return 'utils';
  if (ruta.startsWith('scripts/')) return 'scripts';
  if (ruta.startsWith('tests/')) return 'tests';
  if (ruta.startsWith('skills/')) return 'skills';
  if (ruta.startsWith('demos/')) return 'demos';
  if (ruta.startsWith('labs/')) return 'labs';
  if (ruta.startsWith('assets/')) return 'assets';
  return 'historicos';
}

/** Escribe INDICE.md. Devuelve true si el archivo cambio. */
export function escribirIndice() {
  const rutas = mdsVersionados().sort();
  const grupos = new Map();
  for (const r of rutas) {
    const d = dominioDe(r);
    if (!grupos.has(d)) grupos.set(d, []);
    grupos.get(d).push(r);
  }
  const salida = [];
  salida.push('# INDICE — todos los documentos del kit');
  salida.push('');
  salida.push('<!-- generado por scripts/indice-md.mjs (`deno task indice`). NO editar a mano: el build lo regenera. -->');
  salida.push('');
  salida.push('El indice de todo lo que hay que leer. La jerarquia para un agente es:');
  salida.push('');
  salida.push('1. `AGENTS.md` — las reglas vigentes, en corto.');
  salida.push('2. este `INDICE.md` — el mapa de los documentos.');
  salida.push('3. `specs/constitution.md` — lo que no se negocia.');
  salida.push('4. `skills/iswc-base/SKILL.md` — la skill principal.');
  salida.push('5. el md del dominio (seccion de abajo).');
  salida.push('');
  salida.push('Cada fuente del repo lleva en su cabecera las dos rutas que hay que leer antes de editarla:');
  salida.push('');
  salida.push('```');
  salida.push('// @contexto INDICE.md · src/components/forms/input.md');
  salida.push('```');
  salida.push('');
  for (const d of DOMINIOS) {
    const items = grupos.get(d.clave);
    if (!items || !items.length) continue;
    salida.push('## ' + d.titulo);
    salida.push('');
    salida.push('| Documento | Ruta | URL |');
    salida.push('|---|---|---|');
    for (const r of items) {
      const t = tituloDe(r).replace(/\|/g, '\\|');
      salida.push('| ' + t + ' | [' + r + '](' + r + ') | ' + URL_RAW + r + ' |');
    }
    salida.push('');
  }
  const texto = salida.join('\n');
  const ruta = join(RAIZ, 'INDICE.md');
  const antes = existsSync(ruta) ? readFileSync(ruta, 'utf8') : '';
  if (antes === texto) return false;
  writeFileSync(ruta, texto, 'utf8');
  return true;
}

if (import.meta.main ?? (process.argv[1] && process.argv[1].endsWith('indice-md.mjs'))) {
  const cambio = escribirIndice();
  console.log(cambio ? 'INDICE.md escrito' : 'INDICE.md al día');
}
