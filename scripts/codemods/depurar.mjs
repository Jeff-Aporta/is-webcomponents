// depurar.mjs — depuración de código muerto (F9a).
//   · imports en desuso: los que reporta `deno lint` (no-unused-vars) se quitan de su declaración `import`
//     (parser de TypeScript); si no queda ningún nombre, la declaración se borra. Un import cuyo módulo tiene efecto
//     al cargarse (registra un tag o una función) queda como `import './x.js'`.
//   · `--exports`: además, hasta punto fijo, los exports sin consumidor (`codigo-muerto.ts`): si el archivo lo usa,
//     se quita solo `export`; si no, se borra la declaración con su JSDoc. Después se borran las declaraciones
//     top-level sin uso (lint) que quedaron huérfanas: funciones, clases, tipos y constantes sin efecto.
//
//   deno run -A scripts/codemods/depurar.mjs [--dry] [--exports] [rutas…]   (por defecto src scripts tests skills)
//
// category: "how"
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { execFileSync } from 'node:child_process';
import ts from 'npm:typescript@5.9.3';
import { analizarCodigoMuerto } from './codigo-muerto.ts';
import { EXCEPCIONES_ARCHIVO, EXCEPCIONES_SIMBOLO } from '../../tests/gobernanza/sin-codigo-muerto.test.ts';

const args = Deno.args.filter((a) => !a.startsWith('--'));
const dry = Deno.args.includes('--dry');
const conExports = Deno.args.includes('--exports');
const rutas = args.length ? args : ['src', 'scripts', 'tests', 'skills'];
const raiz = Deno.cwd().replaceAll('\\', '/');

/** Diagnósticos de no-unused-vars agrupados por archivo: nombre → líneas. */
function diagnosticos() {
  let salida = '';
  try {
    salida = execFileSync(Deno.execPath(), ['lint', '--rules-include=no-unused-vars', '--rules-tags=', '--json', ...rutas], { encoding: 'utf8', maxBuffer: 1 << 28 });
  } catch (e) {
    salida = String(e.stdout);
  }
  const porArchivo = new Map();
  for (const d of JSON.parse(salida).diagnostics) {
    if (d.code !== 'no-unused-vars') continue;
    const archivo = decodeURIComponent(new URL(d.filename).pathname).replace(/^\/([A-Za-z]:)/, '$1');
    if (/[\\/](vendor|node_modules|dist)[\\/]/.test(archivo)) continue;
    const nombre = d.message.match(/^`([^`]+)`/)?.[1];
    if (!nombre) continue;
    if (!porArchivo.has(archivo)) porArchivo.set(archivo, []);
    porArchivo.get(archivo).push({ nombre, linea: d.range.start.line });
  }
  return porArchivo;
}

const fuenteDe = (archivo, texto) => ts.createSourceFile(archivo, texto, ts.ScriptTarget.Latest, true, /\.m?ts$/.test(archivo) ? ts.ScriptKind.TS : ts.ScriptKind.JS);
const lineaDe = (fuente, nodo) => fuente.getLineAndCharacterOfPosition(nodo.getStart(fuente)).line + 1;

/** Reescribe una declaración import sin los nombres indicados; '' si no queda ninguno. */
function reescribir(fuente, decl, quitar) {
  const clausula = decl.importClause;
  const modulo = decl.moduleSpecifier.getText(fuente);
  const tipo = clausula.isTypeOnly ? 'type ' : '';
  const defecto = clausula.name && !quitar.has(clausula.name) ? clausula.name.getText(fuente) : '';
  const enlaces = clausula.namedBindings;
  let resto = '';
  if (enlaces && ts.isNamespaceImport(enlaces)) {
    if (!quitar.has(enlaces.name)) resto = enlaces.getText(fuente);
  } else if (enlaces) {
    const vivos = enlaces.elements.filter((e) => !quitar.has(e.name)).map((e) => e.getText(fuente));
    if (vivos.length) resto = `{ ${vivos.join(', ')} }`;
  }
  const partes = [defecto, resto].filter(Boolean);
  if (!partes.length) return '';
  const atributos = decl.attributes ? ` ${decl.attributes.getText(fuente)}` : '';
  return `import ${tipo}${partes.join(', ')} from ${modulo}${atributos};`;
}

/** ¿El módulo importado tiene efecto al cargarse (registra un tag, una función o toca window)? */
function conEfecto(desde, especificador) {
  let ruta = '';
  if (especificador.startsWith('@jeff-aporta/iswc-base/')) ruta = join('src', especificador.slice('@jeff-aporta/iswc-base/'.length));
  else if (especificador.startsWith('.')) ruta = join(dirname(desde), especificador);
  else return false;
  for (const candidato of [ruta.replace(/\.js$/, '.ts'), ruta]) {
    if (!existsSync(candidato)) continue;
    return /^\s*(define\(|customElements\.define|if \(typeof window|registrar)/m.test(readFileSync(candidato, 'utf8'));
  }
  return true;
}

/** Inicio de la declaración con sus comentarios pegados (JSDoc o `//` sin línea en blanco de por medio). */
function inicioConComentarios(texto, st) {
  let ini = st.getStart();
  const rangos = ts.getLeadingCommentRanges(texto, st.getFullStart()) ?? [];
  for (let i = rangos.length - 1; i >= 0; i--) {
    const entre = texto.slice(rangos[i].end, ini);
    if ((entre.match(/\n/g) ?? []).length > 1) break;
    ini = rangos[i].pos;
  }
  while (ini > 0 && (texto[ini - 1] === ' ' || texto[ini - 1] === '\t')) ini--;
  return ini;
}

/** Fin de la declaración con su salto de línea; si queda una línea en blanco doble, se come una. */
function finConSalto(texto, fin) {
  while (texto[fin] === ' ' || texto[fin] === '\t') fin++;
  if (texto[fin] === '\r') fin++;
  if (texto[fin] === '\n') fin++;
  return fin;
}

/** Aplica cambios {ini, fin, nuevo} y escribe; colapsa las líneas en blanco triples que deje un borrado. */
function aplicar(archivo, texto, cambios) {
  if (!cambios.length) return false;
  cambios.sort((a, b) => b.ini - a.ini);
  let salida = texto;
  let tope = Infinity;
  for (const { ini, fin, nuevo } of cambios) {
    if (fin > tope) continue;
    salida = salida.slice(0, ini) + nuevo + salida.slice(fin);
    tope = ini;
  }
  salida = salida.replace(/(\r?\n){3,}/g, (m) => (m.includes('\r') ? '\r\n\r\n' : '\n\n'));
  if (!dry) writeFileSync(archivo, salida);
  return true;
}

/** Imports en desuso de un archivo; devuelve cuántos nombres quitó. */
function depurarImports(archivo, lista) {
  const texto = readFileSync(archivo, 'utf8');
  const fuente = fuenteDe(archivo, texto);
  const cambios = [];
  let quitados = 0;
  for (const decl of fuente.statements) {
    if (!ts.isImportDeclaration(decl) || !decl.importClause) continue;
    const nodos = [];
    const c = decl.importClause;
    if (c.name) nodos.push(c.name);
    if (c.namedBindings && ts.isNamespaceImport(c.namedBindings)) nodos.push(c.namedBindings.name);
    else if (c.namedBindings) for (const e of c.namedBindings.elements) nodos.push(e.name);
    const quitar = new Set();
    for (const n of nodos) if (lista.some((d) => d.nombre === n.text && d.linea === lineaDe(fuente, n))) quitar.add(n);
    if (!quitar.size) continue;
    quitados += quitar.size;
    let nuevo = reescribir(fuente, decl, quitar);
    if (!nuevo && !c.isTypeOnly && conEfecto(archivo, decl.moduleSpecifier.text)) nuevo = `import ${decl.moduleSpecifier.getText(fuente)};`;
    cambios.push({ ini: decl.getStart(fuente), fin: nuevo ? decl.getEnd() : finConSalto(texto, decl.getEnd()), nuevo });
  }
  aplicar(archivo, texto, cambios);
  return quitados;
}

/** Inicializador sin efecto: borrar la constante no cambia nada al cargar el módulo. */
function sinEfecto(expr) {
  if (!expr) return true;
  if (ts.isArrowFunction(expr) || ts.isFunctionExpression(expr) || ts.isClassExpression(expr)) return true;
  if (ts.isLiteralExpression(expr) || ts.isNoSubstitutionTemplateLiteral(expr) || ts.isIdentifier(expr)) return true;
  if ([ts.SyntaxKind.TrueKeyword, ts.SyntaxKind.FalseKeyword, ts.SyntaxKind.NullKeyword].includes(expr.kind)) return true;
  if (ts.isAsExpression(expr) || ts.isSatisfiesExpression(expr) || ts.isParenthesizedExpression(expr) || ts.isTypeAssertionExpression(expr)) return sinEfecto(expr.expression);
  if (ts.isPrefixUnaryExpression(expr)) return sinEfecto(expr.operand);
  if (ts.isArrayLiteralExpression(expr)) return expr.elements.every(sinEfecto);
  if (ts.isObjectLiteralExpression(expr)) return expr.properties.every((p) => (ts.isPropertyAssignment(p) ? sinEfecto(p.initializer) : !ts.isSpreadAssignment(p)));
  if (ts.isTemplateExpression(expr)) return expr.templateSpans.every((s) => sinEfecto(s.expression));
  if (ts.isPropertyAccessExpression(expr)) return sinEfecto(expr.expression);
  // zod (`z.object(…)`, `XSchema.extend(…)`), `Object.freeze`, `new Set/Map` y `String.raw`: puros.
  const texto = expr.getText();
  if (ts.isCallExpression(expr) && /^(z\.|\w+Schema\.|Object\.freeze\(|Object\.fromEntries\(|String\.raw)/.test(texto)) return true;
  if (ts.isNewExpression(expr) && /^new (Set|Map|WeakMap|WeakSet|RegExp)\b/.test(texto)) return true;
  if (ts.isTaggedTemplateExpression(expr) && /^String\.raw/.test(texto)) return true;
  return false;
}

/** Nombres que declara una sentencia top-level (vacío si no es una declaración). */
function nombresDe(st) {
  if (ts.isVariableStatement(st)) return st.declarationList.declarations.map((d) => (ts.isIdentifier(d.name) ? d.name : null));
  if (ts.isFunctionDeclaration(st) || ts.isClassDeclaration(st) || ts.isInterfaceDeclaration(st) || ts.isTypeAliasDeclaration(st) || ts.isEnumDeclaration(st)) return st.name ? [st.name] : [];
  return [];
}

function exportKeyword(st) {
  return ts.canHaveModifiers(st) ? ts.getModifiers(st)?.find((m) => m.kind === ts.SyntaxKind.ExportKeyword) : undefined;
}

/** Exports muertos de un archivo: quita `export` o borra la declaración. Devuelve { despublicados, borrados, saltados }. */
function quitarExports(archivo, muertos) {
  const texto = readFileSync(archivo, 'utf8');
  const fuente = fuenteDe(archivo, texto);
  const porNombre = new Map(muertos.map((m) => [m.nombre, m]));
  const cuenta = { despublicados: [], borrados: [], saltados: [] };
  const cambios = [];
  for (const st of fuente.statements) {
    if (ts.isExportDeclaration(st) && !st.moduleSpecifier && st.exportClause && ts.isNamedExports(st.exportClause)) {
      const vivos = st.exportClause.elements.filter((e) => !porNombre.has(e.name.text));
      if (vivos.length === st.exportClause.elements.length) continue;
      for (const e of st.exportClause.elements) if (porNombre.has(e.name.text)) cuenta.despublicados.push(e.name.text);
      const tipo = st.isTypeOnly ? 'type ' : '';
      if (vivos.length) cambios.push({ ini: st.getStart(), fin: st.getEnd(), nuevo: `export ${tipo}{ ${vivos.map((e) => e.getText(fuente)).join(', ')} };` });
      else cambios.push({ ini: inicioConComentarios(texto, st), fin: finConSalto(texto, st.getEnd()), nuevo: '' });
      continue;
    }
    const kw = exportKeyword(st);
    if (!kw) continue;
    if (ts.canHaveModifiers(st) && ts.getModifiers(st)?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)) continue;
    const nombres = nombresDe(st);
    if (!nombres.length || nombres.some((n) => !n)) continue;
    const muertosAqui = nombres.map((n) => porNombre.get(n.text));
    if (muertosAqui.every((m) => !m)) continue;
    if (muertosAqui.some((m) => !m)) {
      cuenta.saltados.push(`${archivo}:${lineaDe(fuente, st)} ${nombres.map((n) => n.text).join(',')} (declaración múltiple mixta)`);
      continue;
    }
    const interno = muertosAqui.some((m) => m.usoInterno);
    const conEfectoAlCargar = ts.isVariableStatement(st) && st.declarationList.declarations.some((d) => !sinEfecto(d.initializer));
    if (interno || conEfectoAlCargar) {
      let fin = kw.getEnd();
      while (texto[fin] === ' ') fin++;
      cambios.push({ ini: kw.getStart(fuente), fin, nuevo: '' });
      cuenta.despublicados.push(...nombres.map((n) => n.text));
    } else {
      cambios.push({ ini: inicioConComentarios(texto, st), fin: finConSalto(texto, st.getEnd()), nuevo: '' });
      cuenta.borrados.push(...nombres.map((n) => n.text));
    }
  }
  aplicar(archivo, texto, cambios);
  return cuenta;
}

/** Veces que aparece el identificador `nombre` en el archivo (declaración incluida). */
function apariciones(fuente, nombre) {
  let n = 0;
  const visitar = (nodo) => {
    if (ts.isIdentifier(nodo) && nodo.text === nombre) n++;
    ts.forEachChild(nodo, visitar);
  };
  visitar(fuente);
  return n;
}

/** Declaraciones top-level sin uso (lint) que no son export: se borran si no tienen efecto al cargar. */
function borrarHuerfanos(archivo, lista) {
  const texto = readFileSync(archivo, 'utf8');
  const fuente = fuenteDe(archivo, texto);
  const borrados = [];
  const cambios = [];
  for (const st of fuente.statements) {
    if (exportKeyword(st)) continue;
    const nombres = nombresDe(st);
    if (!nombres.length || nombres.some((n) => !n)) continue;
    if (!nombres.every((n) => lista.some((d) => d.nombre === n.text && d.linea === lineaDe(fuente, n)))) continue;
    if (ts.isVariableStatement(st) && !st.declarationList.declarations.every((d) => sinEfecto(d.initializer))) continue;
    // Escrita pero nunca leída (`x = …` en otro sitio): borrar la declaración rompería esas escrituras.
    if (nombres.some((n) => apariciones(fuente, n.text) > 1)) continue;
    cambios.push({ ini: inicioConComentarios(texto, st), fin: finConSalto(texto, st.getEnd()), nuevo: '' });
    borrados.push(...nombres.map((n) => n.text));
  }
  aplicar(archivo, texto, cambios);
  return borrados;
}

function pasadaImports() {
  let total = 0;
  let huerfanos = [];
  for (const [archivo, lista] of diagnosticos()) {
    total += depurarImports(archivo, lista);
    if (conExports) huerfanos = huerfanos.concat(borrarHuerfanos(archivo, lista).map((n) => `${archivo.replace(`${raiz}/`, '')}#${n}`));
  }
  return { total, huerfanos };
}

const informe = { imports: 0, despublicados: [], borrados: [], huerfanos: [], saltados: [] };
for (let vuelta = 1; vuelta <= 12; vuelta++) {
  const { total, huerfanos } = pasadaImports();
  informe.imports += total;
  informe.huerfanos.push(...huerfanos);
  let cambiosExports = 0;
  if (conExports) {
    const { muertos } = analizarCodigoMuerto(raiz, { archivo: EXCEPCIONES_ARCHIVO, simbolo: EXCEPCIONES_SIMBOLO });
    const porArchivo = Map.groupBy(muertos, (m) => m.archivo);
    for (const [archivo, lista] of porArchivo) {
      const c = quitarExports(join(raiz, archivo), lista);
      informe.despublicados.push(...c.despublicados.map((n) => `${archivo}#${n}`));
      informe.borrados.push(...c.borrados.map((n) => `${archivo}#${n}`));
      informe.saltados.push(...c.saltados);
      cambiosExports += c.despublicados.length + c.borrados.length;
    }
  }
  console.log(`vuelta ${vuelta}: ${total} imports, ${huerfanos.length} huérfanos, ${cambiosExports} exports`);
  if (dry || (!total && !huerfanos.length && !cambiosExports)) break;
}
informe.saltados = [...new Set(informe.saltados)];
if (conExports) writeFileSync(join(raiz, '.tmp', 'depurar-informe.json'), JSON.stringify(informe, null, 1));
console.log(`depurar: ${informe.imports} imports en desuso fuera · ${informe.despublicados.length} exports despublicados · ${informe.borrados.length} exports borrados · ${informe.huerfanos.length} declaraciones huérfanas borradas · ${informe.saltados.length} saltados${dry ? ' (dry)' : ''}`);
