// nomenclatura-iswc-base.mjs — un solo nombre para el kit: `iswc-base`.
//
//   deno run -A scripts/codemods/nomenclatura-iswc-base.mjs [--dry-run]
//
// Regla (specs/plan-carga-modular.md §D11, fase F1b; specs/adr.md «ADR nomenclatura iswc-base, 2026-11-04»):
//   - `iswc-root` (nombre de un repo que nunca existió en GitHub) desaparece:
//       · en el hueco del repo de una URL (`Jeff-Aporta/iswc-root`, `jeff-aporta.github.io/iswc-root`, `iswc-root@…`)
//         pasa al nombre REAL del repo hoy, `is-webcomponents` (las URLs con `iswc-root` daban 404; también con las
//         barras escapadas de una regex, `Jeff-Aporta\/…`);
//       · en la prosa de las llaves de storage (`iswc-root[tag]`, `iswc-root.iswc-x`, `localStorage['iswc-root']`)
//         pasa a la llave vigente `iswc:root`;
//       · en todo lo demás (texto, rutas, nombres de archivo y carpeta) pasa a `iswc-base`.
//   - `is-webcomponents` fuera del hueco del repo de una URL (prosa, `<title>`, rutas locales) pasa a `iswc-base`.
//     Se conserva en URLs de GitHub/jsDelivr/githack/raw/Pages, en el slug `Jeff-Aporta/is-webcomponents`, tras `@`
//     (paquete de jsDelivr) y en un campo `repo` (`"repo": "is-webcomponents"`).
//   - Una línea que enumera los nombres como alternativa (`iswc-root|is-webcomponents`) es un reconocedor de alias:
//     no se toca.
//   - Las rutas con `iswc-root` en el nombre se mueven con `git mv` (p. ej. `skills/iswc-root/` → `skills/iswc-base/`).
//
// Excepciones (EXCEPCIONES): archivos que citan los nombres viejos a propósito (historia, alias, llaves de storage en
// producción que se migran en código). El guardián `tests/gobernanza/nomenclatura.test.ts` usa la misma lista.
//
// Idempotente: una segunda corrida no encuentra nada que reescribir.
import { existsSync, readdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Carpetas que no se barren (por nombre, en cualquier nivel). */
export const SALTAR_CARPETAS = new Set(['node_modules', '.git', 'dist', '.shots', '.iswc-render-tmp']);

/** Archivos o carpetas (ruta desde la raíz, con `/`) que citan los nombres viejos a propósito. */
export const EXCEPCIONES = {
  'scripts/codemods/nomenclatura-iswc-base.mjs': 'este codemod: define las reglas con los nombres viejos',
  'tests/gobernanza/nomenclatura.test.ts': 'el guardián: busca los nombres viejos',
  'specs/lessons.md': 'historia: cita iswc-root como nombre histórico',
  'specs/adr.md': 'historia: cita iswc-root como nombre histórico',
  'src/vendor-distributions/shared/tools/pin-update.mjs': 'mapa ALIAS: reescribe pines con nombres viejos al real',
  'tests/gobernanza/pin-update.test.ts': 'prueba el mapa ALIAS con pines de nombres viejos',
  'src/core/iswc-storage.ts': 'llave de storage en producción `iswc-root` (se migra a `iswc:root`)',
  'src/core/prefs.ts': 'llave de storage en producción `is-webcomponents` (root legacy que se migra)',
  'tests/gobernanza/iswc-storage.test.ts': 'prueba la migración de la llave `iswc-root`',
  'tests/componentes/prefs-contract.test.ts': 'prueba la migración del root legacy `is-webcomponents`',
  'scripts/migrations/': 'migraciones históricas ya corridas (listas PRESERVE con el nombre del repo)',
};

const barras = (ruta) => ruta.replaceAll('\\', '/');

/** true si la ruta (desde la raíz, con `/`) es una excepción. */
export function esExcepcion(rel) {
  for (const clave of Object.keys(EXCEPCIONES)) {
    if (clave.endsWith('/') ? rel.startsWith(clave) : rel === clave) return true;
  }
  return false;
}

/** true si la carpeta no se barre. */
export function saltarCarpeta(nombre) {
  return SALTAR_CARPETAS.has(nombre) || nombre.startsWith('.tmp');
}

/** true si el archivo no se barre (salidas de auditoría). */
export function saltarArchivo(rel) {
  return /^\.audit\/last/.test(rel);
}

/** Línea que enumera los nombres del repo como alternativa (reconocedor de alias). */
export const LINEA_ALIAS = /(?:iswc-root|is-webcomponents|iswc-base)\|(?:iswc-root|is-webcomponents|iswc-base)/;
/** Hueco del repo: lo que va justo antes del nombre en una URL o slug del repo. */
const HUECO = /(?:jeff-aporta\\?\/|jeff-aporta\\?\.github\\?\.io\\?\/)$/i;
/** Campo `repo` con el nombre del repo como valor. */
const CAMPO_REPO = /\brepo["']?\s*[:=]\s*["']$/;

/** Reescribe una línea; devuelve `[nueva, cambios]`. */
export function transformarLinea(linea) {
  if (LINEA_ALIAS.test(linea)) return [linea, 0];
  let n = 0;
  let out = linea.replace(/(localStorage\[\s*['"])iswc-root(['"])/g, (_, a, b) => { n++; return `${a}iswc:root${b}`; });
  out = out.replace(/iswc-root(?=\[|\.iswc-)/g, () => { n++; return 'iswc:root'; });
  out = out.replace(/iswc-root/g, (m, i, s) => {
    n++;
    return HUECO.test(s.slice(0, i)) || s[i + m.length] === '@' ? 'is-webcomponents' : 'iswc-base';
  });
  out = out.replace(/is-webcomponents/g, (m, i, s) => {
    const antes = s.slice(0, i);
    if (HUECO.test(antes) || s[i + m.length] === '@' || CAMPO_REPO.test(antes)) return m;
    n++;
    return 'iswc-base';
  });
  return [out, n];
}

/** Reescribe un texto; devuelve `[nuevo, cambios]`. */
export function transformar(texto) {
  let total = 0;
  const lineas = texto.split('\n').map((l) => {
    const [nueva, n] = transformarLinea(l);
    total += n;
    return nueva;
  });
  return [lineas.join('\n'), total];
}

function esTexto(buf) {
  const n = Math.min(buf.length, 8000);
  for (let i = 0; i < n; i++) if (buf[i] === 0) return false;
  return true;
}

/** Archivos de texto a barrer (rutas absolutas). */
export function listar(dir = RAIZ, salida = []) {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    const rel = barras(relative(RAIZ, ruta));
    const st = statSync(ruta);
    if (st.isDirectory()) {
      if (!saltarCarpeta(nombre) && !esExcepcion(`${rel}/`)) listar(ruta, salida);
    } else if (!saltarArchivo(rel) && !esExcepcion(rel) && st.size < 8_000_000) {
      salida.push(ruta);
    }
  }
  return salida;
}

function rastreado(ruta) {
  try {
    execFileSync('git', ['ls-files', '--error-unmatch', ruta], { cwd: RAIZ, stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

/** Mueve carpetas y archivos con `iswc-root` en el nombre (de arriba abajo: tras mover una carpeta se entra en el destino). */
function renombrar(seco, dir = RAIZ, hechos = []) {
  for (const nombre of readdirSync(dir)) {
    const ruta = join(dir, nombre);
    const rel = barras(relative(RAIZ, ruta));
    const st = statSync(ruta);
    if (st.isDirectory() && (saltarCarpeta(nombre) || esExcepcion(`${rel}/`))) continue;
    if (nombre.includes('iswc-root')) {
      const destino = join(dir, nombre.replaceAll('iswc-root', 'iswc-base'));
      hechos.push(`${rel} → ${barras(relative(RAIZ, destino))}`);
      if (!seco) {
        if (existsSync(destino)) throw new Error(`destino ya existe: ${destino}`);
        if (rastreado(ruta)) execFileSync('git', ['mv', ruta, destino], { cwd: RAIZ, stdio: 'inherit' });
        else renameSync(ruta, destino);
      }
      if (st.isDirectory()) renombrar(seco, seco ? ruta : destino, hechos);
      continue;
    }
    if (st.isDirectory()) renombrar(seco, ruta, hechos);
  }
  return hechos;
}

function main() {
  const seco = process.argv.includes('--dry-run');
  const movidos = renombrar(seco);
  const porCarpeta = {};
  let total = 0;
  let tocados = 0;
  for (const archivo of listar()) {
    const buf = readFileSync(archivo);
    if (!esTexto(buf)) continue;
    const previo = buf.toString('utf8');
    const [nuevo, n] = transformar(previo);
    if (!n) continue;
    const rel = barras(relative(RAIZ, archivo));
    const carpeta = rel.includes('/') ? rel.split('/')[0] : '(raíz)';
    porCarpeta[carpeta] = (porCarpeta[carpeta] ?? 0) + n;
    total += n;
    tocados++;
    if (!seco) writeFileSync(archivo, nuevo);
  }
  for (const m of movidos) console.log(`mv ${m}`);
  for (const [carpeta, n] of Object.entries(porCarpeta).sort((a, b) => b[1] - a[1])) console.log(`${String(n).padStart(5)}  ${carpeta}`);
  console.log(`${seco ? '[dry-run] ' : ''}${total} menciones en ${tocados} archivos; ${movidos.length} rutas movidas`);
}

if (import.meta.main) main();
