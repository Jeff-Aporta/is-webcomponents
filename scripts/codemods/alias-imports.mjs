// alias-imports.mjs — imports del kit por alias: `'../../core/x.js'` → `'@jeff-aporta/iswc-base/core/x.js'`.
//
//   deno run -A scripts/codemods/alias-imports.mjs [--dry-run]
//
// Regla (specs/plan-carga-modular.md §D3, fase F1):
//   - Todo `from '…'`, `import '…'` e `import('…')` con ruta relativa que SUBE de carpeta (`../`) y cae dentro de
//     `src/` pasa al alias con la ruta desde `src/`, conservando la extensión (`.js`; en disco es `.ts`).
//   - Los relativos de la misma carpeta (`./x.js`, `./schemas/x.schemas.js`, `./utils/x.js`) se quedan.
//   - Un `../` que sale de `src/` (p. ej. hacia `dist/` o `tests/`) se deja y se informa.
//   - Un `../` cuyo destino no existe es texto (un snippet dentro de un string): se deja y se informa.
//
// Alcance: `src/**/*.ts` (salvo `src/vendor-distributions/**`, que viaja a otros repos y no usa relativos ni alias)
// y los `scripts/**/*.{ts,mjs}` que ejecuta Deno. Los `scripts/*.js` de navegador se quedan: los sirve tal cual
// el servidor de desarrollo, que solo transpila `.ts`.
//
// Idempotente: una segunda corrida no encuentra nada que reescribir.
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const SRC = join(RAIZ, 'src');
const ALIAS = '@jeff-aporta/iswc-base/';
const seco = process.argv.includes('--dry-run');
const EXCLUIR = new Set(['node_modules', 'dist', 'vendor-distributions']);
const PATRON = /(\bfrom\s*|\bimport\s*\(?\s*)(["'])(\.\.\/[^"'\n]*)\2/g;

const barras = (ruta) => ruta.replaceAll('\\', '/');

function listar(dir, extensiones, salida = []) {
  for (const nombre of readdirSync(dir)) {
    if (EXCLUIR.has(nombre) || nombre.startsWith('.tmp')) continue;
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) listar(ruta, extensiones, salida);
    else if (extensiones.test(nombre)) salida.push(ruta);
  }
  return salida;
}

/** El archivo existe tal cual o como `.ts` (el especificador `.js` nombra la fuente `.ts`). */
const existe = (abs) => existsSync(abs) || (/\.js$/.test(abs) && existsSync(abs.replace(/\.js$/, '.ts')));

const archivos = [...listar(SRC, /\.ts$/), ...listar(join(RAIZ, 'scripts'), /\.(ts|mjs)$/)];
let total = 0;
let tocados = 0;
const fuera = [];
const rotos = [];
for (const archivo of archivos) {
  const previo = readFileSync(archivo, 'utf8');
  let n = 0;
  const nuevo = previo.replace(PATRON, (entero, antes, comilla, spec) => {
    const abs = resolve(dirname(archivo), spec);
    const desdeSrc = relative(SRC, abs);
    if (desdeSrc.startsWith('..') || isAbsolute(desdeSrc)) {
      fuera.push(`${barras(relative(RAIZ, archivo))}: ${spec}`);
      return entero;
    }
    if (!existe(abs)) {
      rotos.push(`${barras(relative(RAIZ, archivo))}: ${spec}`);
      return entero;
    }
    n++;
    return `${antes}${comilla}${ALIAS}${barras(desdeSrc)}${comilla}`;
  });
  if (!n) continue;
  total += n;
  tocados++;
  if (!seco) writeFileSync(archivo, nuevo);
}
console.log(`alias-imports: ${total} imports en ${tocados} archivos${seco ? ' (dry-run, sin escribir)' : ''}`);
if (fuera.length) console.log(`  fuera de src/ (sin tocar):\n    ${fuera.join('\n    ')}`);
if (rotos.length) console.log(`  destino inexistente (texto, no import; sin tocar):\n    ${rotos.join('\n    ')}`);
