/**
 * ts-parametros-comunes.ts — Lo que comparten el inferidor y la reversión.
 *
 * POR QUÉ. `ts-inferir-params.ts` deduce tipos por heurística y
 * `ts-revertir-inferencia.ts` retira los que el compilador desmiente. Sin nada
 * en común, el primero volvía a poner en cada pasada justo lo que el segundo
 * acababa de quitar, y los dos scripts se deshacían el trabajo indefinidamente.
 *
 * El fichero de descartes rompe ese ciclo: la reversión anota qué parámetros
 * resultaron mal deducidos y el inferidor los respeta. Es además conocimiento
 * que merece guardarse — señala dónde la heurística se equivoca — así que se
 * versiona en vez de vivir en un temporal.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';

/** Parámetros que la heurística dedujo mal; el inferidor no vuelve a tocarlos. */
export const FICHERO_DESCARTES = 'scripts/ts-descartes.json';

export function leerDescartes(): Set<string> {
  if (!existsSync(FICHERO_DESCARTES)) return new Set();
  try {
    return new Set(JSON.parse(readFileSync(FICHERO_DESCARTES, 'utf8')) as string[]);
  } catch {
    return new Set();
  }
}

export function guardarDescartes(claves: ReadonlySet<string>): void {
  writeFileSync(FICHERO_DESCARTES, `${JSON.stringify([...claves].sort(), null, 2)}
`, 'utf8');
}

/**
 * Nombre con el que se identifica un parámetro entre pasadas: el fichero, la
 * función que lo declara y su nombre. No usa números de línea a propósito, que
 * se mueven en cuanto alguien edita el fichero por encima.
 */
export function claveParametro(ruta: string, fn: string, param: string): string {
  const rel = ruta.split('\\').join('/').replace(/^.*\/src\//, 'src/');
  return `${rel}::${fn}::${param}`;
}

/** Nombre de la función que declara el parámetro, o `<anónima>`. */
export function nombreDeFuncion(p: ts.Node): string {
  const fn = p.parent as ts.Node & { name?: ts.Node };
  if (fn.name && ts.isIdentifier(fn.name as ts.Identifier)) return (fn.name as ts.Identifier).text;
  if (fn.name && ts.isPrivateIdentifier(fn.name as ts.PrivateIdentifier)) {
    return (fn.name as ts.PrivateIdentifier).text;
  }
  // Arrow asignada a una variable: el nombre útil es el de la variable.
  const abuelo = fn.parent as ts.Node & { name?: ts.Node };
  if (abuelo?.name && ts.isIdentifier(abuelo.name as ts.Identifier)) {
    return (abuelo.name as ts.Identifier).text;
  }
  return '<anonima>';
}
