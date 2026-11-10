// json.ts — cómo se escribe un JSON en el kit.
//
// En `dist/` (lo que viaja por la red) el JSON va MINIFICADO: sin espacios ni saltos de línea.
// Un `.json` con sangría pesa lo mismo de útil y el navegador lo paga en cada petición: las 225
// fichas de `dist/previews/` son casi 2 MB y la sangría se lleva una parte nada despreciable.
//
// En `src/` (lo que edita una persona) el JSON va LEGIBLE, con sangría. La fuente manda; la
// copia en `dist/` es la minificada.
//
// Este módulo vive en `src/cdn/build/` porque esa carpeta se publica en `dist/build/` y la
// consumen los conversores (`construir-app`) que escriben JSON en la app del consumidor.
import { readFile, readdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Con `ISWC_JSON_LEGIBLE=1` el build NO minifica: es la forma de medir el «antes» del peso de
 * los JSON (la fase B.3 los comparó: −26,7 % de bytes en dist/).
 */
export const MINIFICAR_JSON: boolean = typeof process === 'undefined'
  ? true
  : (process.env?.ISWC_JSON_LEGIBLE ?? '') !== '1';

/** JSON minificado (sin espacios): lo que se publica. */
export const jsonMin = (x: unknown): string => JSON.stringify(x);

/** JSON legible (con sangría): lo que edita una persona. */
export const jsonPretty = (x: unknown): string => JSON.stringify(x, null, 2) + '\n';

/** Escribe un JSON MINIFICADO (lo que va a `dist/`). */
export const writeJson = async (ruta: string, x: unknown): Promise<void> => {
  await writeFile(ruta, MINIFICAR_JSON ? jsonMin(x) : jsonPretty(x), 'utf8');
};

/** Escribe un JSON LEGIBLE (lo que se edita a mano). */
export const writeJsonPretty = async (ruta: string, x: unknown): Promise<void> => {
  await writeFile(ruta, jsonPretty(x), 'utf8');
};

/**
 * Minifica en el sitio un JSON ya escrito (byte a byte el mismo dato, sin espacios).
 * @returns los bytes ahorrados (0 si ya estaba minificado o si no era JSON válido).
 */
export const minificarJson = async (ruta: string): Promise<number> => {
  let texto: string;
  try {
    texto = await readFile(ruta, 'utf8');
  } catch {
    return 0;
  }
  let salida: string;
  try {
    salida = jsonMin(JSON.parse(texto));
  } catch {
    return 0; // no es JSON (plantilla con comentarios, por ejemplo): se deja como está
  }
  if (salida === texto) return 0;
  await writeFile(ruta, salida, 'utf8');
  return texto.length - salida.length;
};

/** Nombres de archivo que se saltan al minificar una carpeta. */
const SALTAR = new Set(['node_modules']);

/**
 * Minifica todos los `.json` de una carpeta (y sus subcarpetas).
 * @returns `{archivos, bytesAntes, bytesDespues}`.
 */
export async function minificarCarpetaJson(raiz: string): Promise<{ archivos: number; bytesAntes: number; bytesDespues: number }> {
  if (!MINIFICAR_JSON) return { archivos: 0, bytesAntes: 0, bytesDespues: 0 };
  let archivos = 0;
  let bytesAntes = 0;
  let bytesDespues = 0;
  const andar = async (dir: string): Promise<void> => {
    let entradas;
    try {
      entradas = await readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entradas) {
      if (SALTAR.has(e.name) || e.name.startsWith('.')) continue;
      const ruta = join(dir, e.name);
      if (e.isDirectory()) {
        await andar(ruta);
        continue;
      }
      if (!e.name.endsWith('.json')) continue;
      const antes = await minificarJson(ruta);
      archivos++;
      bytesAntes += antes;
    }
  };
  await andar(raiz);
  return { archivos, bytesAntes, bytesDespues };
}