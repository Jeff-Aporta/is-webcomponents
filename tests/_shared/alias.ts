// alias.ts — resolver de especificadores para las pruebas que leen fuentes como texto.
// Un import del kit es relativo (misma carpeta) o por alias `@jeff-aporta/iswc-base/<ruta>` (→ `src/<ruta>`,
// specs/typescript/spec.md S-TS2b). Devuelve la ruta absoluta en disco (`.js` → `.ts` si hace falta) o null.
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const ALIAS_KIT = '@jeff-aporta/iswc-base/';

const SRC = join(import.meta.dirname!, '..', '..', 'src');

/** Ruta sin comprobar existencia: alias → `src/<ruta>`, relativo → contra `dir`; null si es un paquete. */
export function rutaDeEspecificador(dir: string, spec: string): string | null {
  if (spec.startsWith(ALIAS_KIT)) return join(SRC, spec.slice(ALIAS_KIT.length));
  if (spec.startsWith('.')) return join(dir, spec);
  return null;
}

/** Archivo en disco que nombra `spec` importado desde la carpeta `dir` (con `.js` → `.ts`), o null. */
export function resolverEspecificador(dir: string, spec: string): string | null {
  const ruta = rutaDeEspecificador(dir, spec);
  if (!ruta) return null;
  if (existsSync(ruta)) return ruta;
  const ts = ruta.replace(/\.js$/, '.ts');
  return existsSync(ts) ? ts : null;
}
