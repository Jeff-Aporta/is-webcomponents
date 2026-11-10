// cabecera-contexto.mjs — inserta (o normaliza) la cabecera @contexto en las fuentes.
//
//   deno run -A scripts/codemods/cabecera-contexto.mjs [--check] [--dry]
//
// La cabecera dice las DOS rutas que hay que leer antes de tocar ese archivo:
//
//   // @contexto INDICE.md · src/components/forms/input.md
//
// Va detras del `#!/` (si hay), del `@vendor` y del `@doc`: esas lineas son de otro y no se
// tocan. El codemod es idempotente: correrlo dos veces da el mismo archivo. Con `--check` solo
// dice que archivos estan mal (sale con codigo 1) y no escribe nada.
//
// Los finales de linea se respetan tal cual: algunos archivos del repo usan CRLF y otros usan
// CR suelto, y el codemod no puede cambiar eso (un refactor que no se ve no es un refactor).
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const RAIZ = process.cwd();
const args = process.argv.slice(2);
const CHECK = args.includes('--check');
const DRY = args.includes('--dry');

const REPO = 'Jeff-Aporta/is-webcomponents';
const URL_RAW = 'https://raw.githubusercontent.com/' + REPO + '/main/';

/** Las fuentes versionadas a las que les cabe cabecera. */
function fuentes() {
  return execFileSync('git', ['ls-files', '*.ts', '*.mjs', '*.js'], { encoding: 'utf8' })
    .split('\n').map((s) => s.trim()).filter(Boolean)
    .filter((r) => !r.startsWith('dist/') && !r.startsWith('.tmp') && !r.includes('node_modules/'))
    // El alcance es el codigo DEL KIT. Las demos son apps consumidoras, los labs son experimentos
    // cuyo contenido no se toca, y assets/ es un archivo suelto.
    .filter((r) => !r.startsWith('assets/') && !r.startsWith('demos/') && !r.startsWith('labs/'));
}

/** El md de contexto de una fuente, o null si no aplica. */
export function mdDeContexto(ruta) {
  if (ruta.startsWith('src/vendor-distributions/')) return null;
  if (ruta.startsWith('src/components/')) {
    const m = ruta.match(/^(src\/components\/[^/]+\/[^/]+)\.ts$/);
    if (m) {
      const md = m[1] + '.md';
      if (existsSync(join(RAIZ, md))) return md;
    }
    const m2 = ruta.match(/^(src\/components\/[^/]+)\//);
    if (m2) return m2[1] + '/README.md';
    return null;
  }
  if (ruta.startsWith('src/core/')) return 'src/core/README.md';
  if (ruta.startsWith('src/cdn/build/')) return 'src/cdn/build/README.md';
  if (ruta.startsWith('src/cdn/')) return 'src/cdn/loader.md';
  if (ruta.startsWith('src/styles/')) return 'src/styles/README.md';
  if (ruta.startsWith('src/utils/')) return 'src/utils/README.md';
  if (ruta.startsWith('src/app/')) return 'src/app/README.md';
  if (ruta.startsWith('src/pages/')) return 'src/pages/README.md';
  if (ruta.startsWith('src/previews/')) return 'src/previews/README.md';
  if (ruta.startsWith('scripts/')) return 'scripts/README.md';
  if (ruta.startsWith('tests/')) {
    const m = ruta.match(/^(tests\/[^/]+)\//);
    if (m && existsSync(join(RAIZ, m[1], 'README.md'))) return m[1] + '/README.md';
    return 'tests/README.md';
  }
  if (ruta.startsWith('skills/')) {
    const m = ruta.match(/^(skills\/[^/]+)\//);
    if (m) {
      const skill = m[1] + '/SKILL.md';
      if (existsSync(join(RAIZ, skill))) return skill;
    }
    return 'skills/README.md';
  }
  if (ruta.startsWith('demos/')) return 'demos/README.md';
  if (ruta.startsWith('labs/')) return 'labs/README.md';
  if (ruta.startsWith('.audit/')) return '.audit/README.md';
  return null;
}

/** La linea de cabecera de una fuente. */
export function cabeceraDe(ruta) {
  const md = mdDeContexto(ruta);
  if (!md) return null;
  if (ruta.startsWith('src/vendor-distributions/')) {
    return '// @contexto ' + URL_RAW + 'INDICE.md · ' + URL_RAW + md;
  }
  return '// @contexto INDICE.md · ' + md;
}

/** Parte el texto en lineas CON su terminador: asi nada se pierde al volver a unir. */
function partes(texto) {
  return texto.split(/(\r\n|\r|\n)/);
}

/** Inserta (o normaliza) la cabecera. Devuelve el texto nuevo, o null si no cambia. */
export function aplicar(ruta, texto) {
  const cabecera = cabeceraDe(ruta);
  if (!cabecera) return null;
  const p = partes(texto);
  // p[0] es la primera linea; los impares son terminadores y los pares, lineas.
  const lineas = [];
  for (let i = 0; i < p.length; i += 2) lineas.push({ texto: p[i], term: p[i + 1] ?? '' });
  const i = lineas.findIndex((l) => /^\/\/ @contexto\b/.test(l.texto.trim()));
  if (i >= 0) {
    if (lineas[i].texto.trim() === cabecera) return null;
    lineas[i].texto = cabecera;
    return lineas.map((l) => l.texto + l.term).join('');
  }
  // Detras del shebang, del @vendor y del @doc.
  let ins = 0;
  if (lineas[0] && lineas[0].texto.startsWith('#!')) ins = 1;
  while (ins < lineas.length && /^\s*(\/\/\s*)?@vendor\b/.test(lineas[ins].texto)) ins++;
  while (ins < lineas.length && /^\s*(\/\/\s*)?@doc\b/.test(lineas[ins].texto)) ins++;
  const term = lineas[ins]?.term || lineas[ins - 1]?.term || '\n';
  lineas.splice(ins, 0, { texto: cabecera, term });
  return lineas.map((l) => l.texto + l.term).join('');
}

let cambios = 0;
const yaTenian = [];
const total = fuentes();
for (const ruta of total) {
  const antes = readFileSync(join(RAIZ, ruta), 'utf8');
  const despues = aplicar(ruta, antes);
  if (despues === null) {
    yaTenian.push(ruta);
    continue;
  }
  cambios++;
  if (!CHECK && !DRY) writeFileSync(join(RAIZ, ruta), despues, 'utf8');
}

console.log('fuentes: ' + total.length + ' | con cabecera: ' + yaTenian.length + ' | a corregir: ' + cambios);
if (CHECK && cambios) process.exit(1);
