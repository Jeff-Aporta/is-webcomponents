// no-reexports.test.ts — guardián (regla InSoft; spec: specs/typescript/spec.md S-TS9): en el código del kit NO hay
// re-exports, barriles ni alias de exports. Cada consumidor importa del archivo de ORIGEN.
//   X1 nada de `export * from`, `export * as ns from`, `export {…} from`, `export type {…} from`.
//   X2 nada de `export { a }` / `export type { T }` / `export default a` cuando `a` es un nombre importado.
//   X3 nada de alias `export const X = Y` (o let/var) cuando `Y` es un nombre importado.
//   X4 el detector, como caja negra: cada forma prohibida se reporta y las formas legítimas no (casos en JSON).
//   X5 la regla cubre `src/`, `skills/` (plantillas y herramientas que copian las apps) y `scripts/`.
//   X6 la excepción declarada existe y publica su entrada CDN (una excepción huérfana es una puerta abierta).
//   X7 el árbol publicado `dist/cdn/` no tiene imports relativos rotos (lo que un consumidor importa o vendoriza
//      resuelve sin barriles). Fuera: `skills/` (las plantillas resuelven dentro de la app creada).
// Excepciones (copia ÚNICA de Zod, no barriles): `vendor-distributions/shared/lib/zod.ts` publica `dist/cdn/lib/zod.min.js`,
// la que importan todos los bundles de componentes (scripts/build.mjs); y `base/zod.ts` de la plantilla de apps.
import { assert, assertEquals } from 'jsr:@std/assert@1';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';
import { denoTestCon } from '../_shared/deno-test.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const denoTest = denoTestCon(test);


const KIT = join(import.meta.dirname!, '..', '..', '..', '..');
const RAICES = ['src', 'skills', 'scripts'];
/** Excepciones: módulos de copia ÚNICA de Zod (no barriles); `publicado` = entrada CDN que debe existir, o null. */
const ENTRADAS_CDN: { fuente: string; publicado: string | null }[] = [
  { fuente: 'src/vendor-distributions/shared/lib/zod.ts', publicado: 'dist/cdn/lib/zod.min.js' },
  // Plantilla de create-iswc-app: el único módulo de la app que importa `zod` (su build lo empaqueta una vez).
  { fuente: 'skills/iswc-foundation/templates/src/js/base/zod.ts', publicado: null },
];
/** Este guardián lleva formas prohibidas como datos de prueba (X4). */
const ESTE = relative(KIT, import.meta.filename!).replaceAll('\\', '/');
const SALTAR = new Set(['node_modules', 'dist', 'vendor']);

function archivos(dir: string, re: RegExp, saltar: Set<string> = SALTAR, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (!saltar.has(n) && !n.startsWith('.')) archivos(p, re, saltar, out); continue; }
    if (re.test(n) && !n.endsWith('.d.ts')) out.push(p);
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

type Hallazgo = { regla: 'X1' | 'X2' | 'X3'; linea: number; texto: string };

/** Re-exports, barriles y alias de un fuente (sin comentarios ni strings). */
function hallazgos(fuente: string): Hallazgo[] {
  const codigo = soloCodigo(fuente);
  const linea = (i: number) => codigo.slice(0, i).split('\n').length;
  const out: Hallazgo[] = [];
  for (const m of codigo.matchAll(/\bexport\s+(?:type\s+)?(?:\*(?:\s+as\s+\w+)?|\{[^}]*\})\s*from\s*['"]/g)) {
    out.push({ regla: 'X1', linea: linea(m.index!), texto: m[0].replace(/\s+/g, ' ').slice(0, 80) });
  }
  const imp = importados(codigo);
  for (const m of codigo.matchAll(/\bexport\s+(?:type\s+)?\{([^}]*)\}(?!\s*from)/g)) {
    for (const parte of m[1]!.split(',')) {
      const local = parte.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]?.trim();
      if (local && imp.has(local)) out.push({ regla: 'X2', linea: linea(m.index!), texto: `export { ${local} } (importado)` });
    }
  }
  for (const m of codigo.matchAll(/\bexport\s+default\s+(\w+)\s*;?\s*$/gm)) {
    if (imp.has(m[1]!)) out.push({ regla: 'X2', linea: linea(m.index!), texto: `export default ${m[1]} (importado)` });
  }
  for (const m of codigo.matchAll(/\bexport\s+(?:const|let|var)\s+(\w+)\s*(?::[^=]+)?=\s*(\w+)\s*;/g)) {
    if (imp.has(m[2]!)) out.push({ regla: 'X3', linea: linea(m.index!), texto: `export const ${m[1]} = ${m[2]} (alias de un import)` });
  }
  return out;
}

denoTest('no-reexports: X1-X3 y X5 sin re-exports, barriles ni alias en src/, skills/ y scripts/', () => {
  const excepciones = new Set(ENTRADAS_CDN.map((e) => e.fuente));
  const malos: string[] = [];
  for (const r of RAICES) {
    for (const p of archivos(join(KIT, r), /\.(ts|mts|mjs|js)$/)) {
      const rel = relative(KIT, p).replaceAll('\\', '/');
      if (excepciones.has(rel) || rel === ESTE) continue;
      for (const h of hallazgos(readFileSync(p, 'utf8'))) malos.push(`${rel}:${h.linea}: ${h.regla} ${h.texto}`);
    }
  }
  assertEquals(malos, [], `importar del archivo de origen:\n${malos.join('\n')}`);
});

// X4 Casos del detector: `reglas` es lo que debe reportar (vacío = legítimo).
const CASOS: { caso: string; fuente: string; reglas: Hallazgo['regla'][] }[] = [
  { caso: 'barril total', fuente: "export * from './a.ts';", reglas: ['X1'] },
  { caso: 'barril con namespace', fuente: "export * as ns from './a.ts';", reglas: ['X1'] },
  { caso: 're-export nombrado', fuente: "export { a, b as c } from './a.ts';", reglas: ['X1'] },
  { caso: 're-export de tipos', fuente: "export type { T } from './schemas.ts';", reglas: ['X1'] },
  { caso: 're-export en varias líneas', fuente: "export {\n  a,\n  b,\n} from './a.ts';", reglas: ['X1'] },
  { caso: 'import y export del mismo nombre', fuente: "import { a } from './a.ts';\nexport { a };", reglas: ['X2'] },
  { caso: 'import con alias y export del alias', fuente: "import { a as b } from './a.ts';\nexport { b };", reglas: ['X2'] },
  { caso: 'tipo importado y re-exportado', fuente: "import type { T } from './schemas.ts';\nexport type { T };", reglas: ['X2'] },
  { caso: 'export default de un import', fuente: "import a from './a.ts';\nexport default a;", reglas: ['X2'] },
  { caso: 'namespace importado y re-exportado', fuente: "import * as ns from './a.ts';\nexport { ns };", reglas: ['X2'] },
  { caso: 'alias const de un import', fuente: "import { a } from './a.ts';\nexport const b = a;", reglas: ['X3'] },
  { caso: 'alias con tipo anotado', fuente: "import { z } from 'zod';\nexport const zz: typeof z = z;", reglas: ['X3'] },
  { caso: 'export de una declaración local', fuente: 'const a = 1;\nexport { a };', reglas: [] },
  { caso: 'valor derivado de un import (no alias)', fuente: "import { z } from 'zod';\nexport const Z = z.object({});", reglas: [] },
  { caso: 'expresión con el import', fuente: "import { a } from './a.ts';\nexport const b = a + 1;", reglas: [] },
  { caso: 'ejemplo en comentario de línea', fuente: "// export * from './a.ts';\nexport const x = 1;", reglas: [] },
  { caso: 'ejemplo en comentario de bloque', fuente: "/* export { a } from './a.ts'; */\nexport const x = 1;", reglas: [] },
  { caso: 'ejemplo en plantilla de texto', fuente: "export const doc = `export * from './a.ts'`;", reglas: [] },
  { caso: 'export default de una función propia', fuente: 'function f() { return 1; }\nexport default f;', reglas: [] },
];

for (const c of CASOS) {
  denoTest(`no-reexports: X4 detector — ${c.caso} → ${c.reglas.length ? c.reglas.join(',') : 'legítimo'}`, () => {
    assertEquals(hallazgos(c.fuente).map((h) => h.regla), c.reglas);
  });
}

denoTest('no-reexports: X6 la excepción declarada existe en src y publica su entrada CDN', () => {
  for (const e of ENTRADAS_CDN) {
    assert(existsSync(join(KIT, e.fuente)), `excepción huérfana: ${e.fuente} no existe; quítala de ENTRADAS_CDN`);
    if (e.publicado) assert(existsSync(join(KIT, e.publicado)), `${e.publicado} no está publicado (deno task build)`);
  }
});

denoTest({
  name: 'no-reexports: X7 dist/cdn sin imports relativos rotos (fuera skills/)',
  ignore: !existsSync(join(KIT, 'dist', 'cdn')),
  fn() {
    const cdn = join(KIT, 'dist', 'cdn');
    const rotos: string[] = [];
    for (const p of archivos(cdn, /\.(ts|mjs|js)$/, new Set(['node_modules', 'skills']))) {
      const codigo = readFileSync(p, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/[^\n]*/g, '$1');
      for (const m of codigo.matchAll(/(?:\bfrom|\bimport)\s*\(?\s*['"](\.{1,2}\/[^'"?#]+)/g)) {
        const destino = join(dirname(p), m[1]!);
        const candidatos = [destino, destino.replace(/\.m?js$/, '.ts')];
        if (!candidatos.some((c) => existsSync(c))) rotos.push(`${relative(cdn, p).replaceAll('\\', '/')}: ${m[1]}`);
      }
    }
    assertEquals(rotos, [], `imports rotos en lo publicado:\n${rotos.join('\n')}`);
  },
});

export default lista();
