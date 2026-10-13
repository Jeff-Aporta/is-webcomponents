// no-reexports.test.ts — guardián (regla InSoft): en src/ NO hay re-exports, barriles ni alias de exports.
// Cada consumidor importa del archivo de ORIGEN.
//   X1 nada de `export * from`, `export * as ns from`, `export {…} from`, `export type {…} from`.
//   X2 nada de `export { a }` / `export type { T }` / `export default a` cuando `a` es un nombre importado.
//   X3 nada de alias `export const X = Y` (o let/var) cuando `Y` es un nombre importado.
// Excepción única (punto de entrada del CDN, no un barril del kit): `vendor-distributions/shared/lib/zod.ts` publica
// `dist/cdn/lib/zod.min.js`, la copia ÚNICA de Zod que importan todos los bundles de componentes (scripts/build.mjs).
import { assertEquals } from 'jsr:@std/assert@1';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const RAIZ = join(import.meta.dirname!, '..', '..', '..');
const ENTRADAS_CDN = new Set(['vendor-distributions/shared/lib/zod.ts']);

function archivos(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (n !== 'node_modules' && !n.startsWith('.')) archivos(p, out); continue; }
    if (/\.(ts|mts|mjs|js)$/.test(n) && !n.endsWith('.d.ts')) out.push(p);
  }
  return out;
}

/** Quita comentarios y el contenido de strings/plantillas (los ejemplos de docs no cuentan). */
function soloCodigo(t: string): string {
  return t
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/[^\n]*/g, '$1')
    .replace(/`(?:\\[\s\S]|[^`\\])*`/g, '``');
}

/** Nombres locales que trae un `import` (por defecto, nombrados con alias y `* as ns`). */
function importados(codigo: string): Set<string> {
  const out = new Set<string>();
  for (const m of codigo.matchAll(/\bimport\s+(?:type\s+)?([^'";]*?)\s*from\s*['"][^'"]+['"]/g)) {
    const clausula = m[1]!;
    const llaves = clausula.match(/\{([^}]*)\}/)?.[1];
    if (llaves) {
      for (const parte of llaves.split(',')) {
        const nombre = parte.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop()?.trim();
        if (nombre) out.add(nombre);
      }
    }
    const ns = clausula.match(/\*\s+as\s+(\w+)/)?.[1];
    if (ns) out.add(ns);
    const porDefecto = clausula.replace(/\{[^}]*\}/, '').replace(/\*\s+as\s+\w+/, '').split(',')[0]?.trim();
    if (porDefecto && /^\w+$/.test(porDefecto)) out.add(porDefecto);
  }
  return out;
}

Deno.test('no-reexports: X1-X3 sin re-exports, barriles ni alias en src/', () => {
  const malos: string[] = [];
  for (const p of archivos(RAIZ)) {
    const codigo = soloCodigo(readFileSync(p, 'utf8'));
    const rel = relative(RAIZ, p).replaceAll('\\', '/');
    if (ENTRADAS_CDN.has(rel)) continue;
    const linea = (i: number) => codigo.slice(0, i).split('\n').length;
    for (const m of codigo.matchAll(/\bexport\s+(?:type\s+)?(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s*from\s*['"]/g)) {
      malos.push(`${rel}:${linea(m.index!)}: X1 ${m[0].replace(/\s+/g, ' ').slice(0, 80)}`);
    }
    const imp = importados(codigo);
    for (const m of codigo.matchAll(/\bexport\s+(?:type\s+)?\{([^}]*)\}(?!\s*from)/g)) {
      for (const parte of m[1]!.split(',')) {
        const local = parte.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]?.trim();
        if (local && imp.has(local)) malos.push(`${rel}:${linea(m.index!)}: X2 export { ${local} } (importado)`);
      }
    }
    for (const m of codigo.matchAll(/\bexport\s+default\s+(\w+)\s*;?\s*$/gm)) {
      if (imp.has(m[1]!)) malos.push(`${rel}:${linea(m.index!)}: X2 export default ${m[1]} (importado)`);
    }
    for (const m of codigo.matchAll(/\bexport\s+(?:const|let|var)\s+(\w+)\s*(?::[^=]+)?=\s*(\w+)\s*;/g)) {
      if (imp.has(m[2]!)) malos.push(`${rel}:${linea(m.index!)}: X3 export const ${m[1]} = ${m[2]} (alias de un import)`);
    }
  }
  assertEquals(malos, [], `importar del archivo de origen:\n${malos.join('\n')}`);
});
