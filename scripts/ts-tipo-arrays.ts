/**
 * ts-tipo-arrays.ts — Da tipo de elemento a los campos que arrancan en `[]`.
 *
 * EL PROBLEMA. Un campo declarado así:
 *
 *     #sections = [];
 *
 * queda como `never[]` en modo estricto, y entonces *todo* lo que se haga con
 * su contenido falla: `this.#sections[0].focus()`, el `for…of`, el `.at(-1)`.
 * Eran 922 errores repartidos por 75 campos.
 *
 * DE DÓNDE SALE EL TIPO. Del `push`. Si el código hace `this.#sections.push(el)`
 * y `el` es un `HTMLElement`, el campo es `HTMLElement[]` — no hay nada que
 * elegir, solo que escribirlo. Para saber qué es `el` no basta con leer el
 * texto: hace falta el verificador de TypeScript, así que este paso construye
 * un `Program` de verdad en lugar de trabajar sobre el AST suelto.
 *
 * CUÁNDO SE ABSTIENE. Si el campo no recibe ningún `push`, si los `push` meten
 * cosas de tipos distintos, o si el tipo que sale es `any`/`never`/`unknown`,
 * no hay una respuesta única y el campo se deja como está.
 *
 *   node scripts/ts-tipo-arrays.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import ts from 'typescript';

const CONFIG = 'tsconfig.json';

const leido = ts.readConfigFile(CONFIG, ts.sys.readFile);
const analizado = ts.parseJsonConfigFileContent(leido.config, ts.sys, process.cwd());
const program = ts.createProgram(analizado.fileNames, analizado.options);
const checker = program.getTypeChecker();

/** Tipos que no dicen nada: anotar con ellos no mejora el campo. */
const INUTILES = new Set(['any', 'never', 'unknown', 'undefined', 'null', 'error']);

type Edicion = { pos: number; fin: number; texto: string };
const porFichero = new Map<string, Edicion[]>();

for (const sf of program.getSourceFiles()) {
  if (sf.isDeclarationFile || !sf.fileName.includes('/src/')) continue;

  /** campo -> declaración `#x = []` */
  const vacios = new Map<string, ts.PropertyDeclaration>();
  /** campo -> tipos vistos en sus `push` */
  const empujados = new Map<string, Set<string>>();

  const visitar = (n: ts.Node): void => {
    if (
      ts.isPropertyDeclaration(n) && ts.isPrivateIdentifier(n.name) && !n.type
      && n.initializer && ts.isArrayLiteralExpression(n.initializer)
      && n.initializer.elements.length === 0
    ) {
      vacios.set(n.name.text, n);
    }

    // `this.#x.push(arg)` / `this.#x.unshift(arg)`
    if (
      ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression)
      && /^(?:push|unshift)$/.test(n.expression.name.getText())
      && ts.isPropertyAccessExpression(n.expression.expression)
      && n.expression.expression.expression.kind === ts.SyntaxKind.ThisKeyword
      && ts.isPrivateIdentifier(n.expression.expression.name)
    ) {
      const campo = n.expression.expression.name.text;
      const set = empujados.get(campo) ?? new Set<string>();
      for (const arg of n.arguments) {
        const t = checker.getTypeAtLocation(arg);
        set.add(checker.typeToString(t, undefined, ts.TypeFormatFlags.NoTruncation));
      }
      empujados.set(campo, set);
    }
    ts.forEachChild(n, visitar);
  };
  visitar(sf);

  const ediciones: Edicion[] = [];
  for (const [campo, decl] of vacios) {
    const tipos = empujados.get(campo);
    if (!tipos || tipos.size !== 1) continue;
    const tipo = [...tipos][0]!;
    if (INUTILES.has(tipo) || tipo.includes('=>') || tipo.length > 60) continue;
    // El nombre acaba donde empieza `= []`; la anotación va justo ahí.
    ediciones.push({ pos: decl.name.end, fin: decl.name.end, texto: `: ${tipo}[]` });
  }
  if (ediciones.length) porFichero.set(sf.fileName, ediciones);
}

let tocados = 0;
let campos = 0;
for (const [ruta, ediciones] of porFichero) {
  const texto = readFileSync(ruta, 'utf8');
  ediciones.sort((a, b) => a.pos - b.pos);
  let out = '';
  let ultimo = 0;
  for (const e of ediciones) {
    if (e.pos < ultimo) continue;
    out += texto.slice(ultimo, e.pos) + e.texto;
    ultimo = e.fin;
  }
  out += texto.slice(ultimo);

  const rev = ts.createSourceFile(ruta, out, ts.ScriptTarget.ESNext, true, ts.ScriptKind.TS);
  if ((rev as unknown as { parseDiagnostics: unknown[] }).parseDiagnostics?.length) {
    console.error(`  ! ${ruta}: la anotación rompería la sintaxis, se deja intacto`);
    continue;
  }
  writeFileSync(ruta, out, 'utf8');
  tocados++;
  campos += ediciones.length;
}
console.log(`arrays tipados: ${campos} campos en ${tocados} ficheros`);
