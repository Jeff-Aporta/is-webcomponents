// a-definir-pruebas.ts — convierte los *.test.ts de tests/ al sistema común del kit
// (`coleccionPruebas` → `definirPruebas`, con categoría y cooldown):
//
//   node:test   → el registrador `coleccionPruebas` del archivo + `export default lista()`.
//   Deno.test   → igual, con `denoTestCon(test)` (tests/_shared/deno-test.ts).
//   script      → los imports quedan arriba y el resto va dentro de UNA prueba
//                 (`process.exit`/`Deno.exit` pasan a return/throw).
//
//   deno run -A scripts/codemods/a-definir-pruebas.ts [--seco]
import ts from 'npm:typescript@5.9.3';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';

const RAIZ = join(dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), '..', '..');
const TESTS = join(RAIZ, 'tests');
const PRUEBAS = join(RAIZ, 'src/vendor-distributions/shared/testing/pruebas.ts');
const DENO = join(TESTS, '_shared/deno-test.ts');
const seco = Deno.args.includes('--seco');
const COMO = new Set(['gobernanza', 'auditoria']);

const rel = (desde: string, hacia: string) => {
  const r = relative(dirname(desde), hacia).replaceAll('\\', '/');
  return r.startsWith('.') ? r : `./${r}`;
};

function listar(d: string, out: string[] = []): string[] {
  for (const n of readdirSync(d)) {
    const p = join(d, n);
    if (statSync(p).isDirectory()) {
      if (n !== '.audit' && n !== '_shared') listar(p, out);
    } else if (n.endsWith('.test.ts')) out.push(p);
  }
  return out;
}

/** `process.exit(x)` / `Deno.exit(x)` como sentencia → return si 0, throw si no. */
function sinSalidas(cuerpo: string): string {
  return cuerpo
    .replace(/\b(?:process|Deno)\.exit\(\s*0?\s*\)\s*;?/g, 'return;')
    .replace(/\b(?:process|Deno)\.exit\(([^;\n]+?)\)\s*;?(?=\s*(?:\n|\}|$))/g, (_t, x: string) => `{ const salida = ${x}; if (salida) throw new Error(\`salida \${salida}\`); return; }`);
}

const resumen: Record<string, number> = {};
for (const archivo of listar(TESTS)) {
  const texto = readFileSync(archivo, 'utf8');
  if (/export default\b/.test(texto) && /definirPruebas|lista\(\)/.test(texto)) { resumen.ya = (resumen.ya ?? 0) + 1; continue; }
  const area = relative(TESTS, archivo).split(/[\\/]/)[0];
  const categoria = COMO.has(area) ? 'how' : 'what';
  const sf = ts.createSourceFile(archivo, texto, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
  const imports = sf.statements.filter((s) => ts.isImportDeclaration(s));
  const fin = imports.length ? imports[imports.length - 1].end : 0;
  const cabeza = texto.slice(0, fin);
  let resto = texto.slice(fin);
  const usaNodeTest = /from ['"]node:test['"]|import\(['"]node:test['"]\)/.test(texto);
  const usaDeno = /\bDeno\.test\s*\(/.test(texto);
  const nombres = ['test', 'lista'];
  if (/\bbefore\s*\(/.test(texto)) nombres.push('before');
  if (/\bafter\s*\(/.test(texto)) nombres.push('after');
  const registro = `\nconst { ${nombres.join(', ')} } = coleccionPruebas({ categoria: '${categoria}' });\n`;
  let importsNuevos = `import { coleccionPruebas } from '${rel(archivo, PRUEBAS)}';\n`;
  let cuerpo: string;
  let estilo: string;
  if (usaNodeTest || usaDeno) {
    estilo = usaNodeTest ? 'node:test' : 'deno';
    let c = cabeza.replace(/^import\s+(?:test|\{[^}]*\})\s+from\s+['"]node:test['"];?[ \t]*\r?\n?/gm, '');
    resto = resto.replace(/^const test = \(await import\('node:test'\)\)\.test;\s*\n/m, '');
    if (/\bdescribe\s*\(/.test(texto)) resto = `\nconst describe = (_grupo: string, cuerpo: () => void): void => cuerpo();\n${resto}`;
    if (usaDeno) {
      importsNuevos += `import { denoTestCon } from '${rel(archivo, DENO)}';\n`;
      resto = resto.replace(/\bDeno\.test\s*\(/g, 'denoTest(');
      resto = `\nconst denoTest = denoTestCon(test);\n${resto}`;
    }
    cuerpo = `${c}\n${importsNuevos}${registro}${resto.trimEnd()}\n\nexport default lista();\n`;
  } else {
    estilo = 'script';
    const nombre = `${relative(TESTS, archivo).replaceAll('\\', '/').replace(/\.test\.ts$/, '')}`;
    const interno = sinSalidas(resto.replace(/^export\s+(?=(?:async\s+)?(?:function|const|let|class)\b)/gm, '')).trim();
    cuerpo = `${cabeza}\n${importsNuevos}${registro}\ntest('${nombre}', async () => {\n${interno.split('\n').map((l) => (l ? `  ${l}` : l)).join('\n')}\n});\n\nexport default lista();\n`;
  }
  resumen[estilo] = (resumen[estilo] ?? 0) + 1;
  if (!seco) writeFileSync(archivo, cuerpo.replace(/^\n+/, ''));
}
console.log(resumen);
