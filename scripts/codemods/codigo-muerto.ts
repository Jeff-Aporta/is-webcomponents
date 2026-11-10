// @contexto INDICE.md · scripts/README.md
// codigo-muerto.ts — análisis estático de código muerto del repo (sin type checker, solo el AST de TypeScript):
// exports sin consumidor y archivos sin importador. Lo usan `scripts/codemods/depurar.mjs --exports` (aplica) y el
// guardián `tests/gobernanza/sin-codigo-muerto.test.ts` (M2, M3).
//
// Consumidor = cualquier archivo versionado (código, html o md) que importe el símbolo por el alias
// `@jeff-aporta/iswc-base/<ruta>`, por ruta relativa, por `dist/cdn/<cat>/<x>.min.mjs`, por `import()` o por
// `import('…').X` en tipos/JSDoc. Un archivo citado como texto (`'src/core/x.ts'`, `join(…, 'x.ts')`) por otro archivo
// de código cuenta como consumido entero: lo cargan por ruta (tests, scripts, galería).
//
// category: "how"
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { basename, join, posix } from 'node:path';
import ts from 'npm:typescript@5.9.3';
import type { ArchivoAnalizado, Excepciones, ExportMuerto, ExportLocal, InformeCodigoMuerto } from './codigo-muerto.schemas.ts';

const ALIAS = '@jeff-aporta/iswc-base/';
const CODIGO = /\.(ts|mts|mjs|js|cjs)$/;
const FUERA = /^(dist|node_modules|\.tmp|assets|\.audit)\//;
/** Archivos generados que repiten nombres de exports (no son consumidores). */
const GENERADOS = new Set(['package.json', 'src/previews/shared-modules.json', 'manifest.js']);

function barras(p: string): string {
  return p.replaceAll('\\', '/');
}

function coincide(ruta: string, patron: string): boolean {
  if (patron.endsWith('/')) return ruta.startsWith(patron);
  if (!patron.includes('*')) return ruta === patron;
  const [a, b] = patron.split('*');
  return ruta.startsWith(a) && ruta.endsWith(b);
}

/** Razón de excepción del archivo, o '' si no la tiene. */
function excepcionDeArchivo(ruta: string, excepciones: Excepciones): string {
  for (const [patron, razon] of excepciones.archivo) if (coincide(ruta, patron)) return razon;
  return '';
}

function versionados(raiz: string): string[] {
  const salida = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: raiz, encoding: 'utf8', maxBuffer: 1 << 28 });
  return [...new Set(salida.split('\n').map((l) => l.trim()).filter(Boolean))].filter((r) => existsSync(join(raiz, r)));
}

function tieneExport(n: ts.Node): boolean {
  return !!ts.canHaveModifiers(n) && !!ts.getModifiers(n)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword);
}

function tieneDefault(n: ts.Node): boolean {
  return !!ts.canHaveModifiers(n) && !!ts.getModifiers(n)?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword);
}

function nombresDePatron(n: ts.BindingName, out: ts.Identifier[]): void {
  if (ts.isIdentifier(n)) out.push(n);
  else for (const e of n.elements) if (!ts.isOmittedExpression(e)) nombresDePatron(e.name, out);
}

/** `const { a, b: c } = await import('x')` → ['a', 'b']; cualquier otra forma → '*'. */
function destructurados(llamada: ts.CallExpression): string[] | '*' {
  let n: ts.Node = llamada.parent;
  if (n && ts.isAwaitExpression(n)) n = n.parent;
  if (!n || !ts.isVariableDeclaration(n) || !ts.isObjectBindingPattern(n.name)) return '*';
  const nombres: string[] = [];
  for (const e of n.name.elements) {
    if (e.dotDotDotToken) return '*';
    const prop = e.propertyName ?? e.name;
    if (!ts.isIdentifier(prop)) return '*';
    nombres.push(prop.text);
  }
  return nombres;
}

/** Cadena dentro del argumento de un `import(…)`: los nombres que se destructuran; si no, '*'. */
function nombresDeImportEnvolvente(n: ts.Node): string[] | '*' {
  let p: ts.Node | undefined = n.parent;
  for (let i = 0; p && i < 10; i++, p = p.parent) {
    if (ts.isCallExpression(p) && p.expression.kind === ts.SyntaxKind.ImportKeyword) return destructurados(p);
    if (ts.isStatement(p)) break;
  }
  return '*';
}

/** Uso de un import: '*' = todos los exports. */
type Uso = { especificador: string; nombres: string[] | '*' };

/** Analiza un archivo de código: exports, usos (imports) y cadenas literales. */
function analizarArchivo(ruta: string, texto: string): ArchivoAnalizado {
  const fuente = ts.createSourceFile(ruta, texto, ts.ScriptTarget.Latest, true, ruta.endsWith('.ts') || ruta.endsWith('.mts') ? ts.ScriptKind.TS : ts.ScriptKind.JS);
  const exportsLocales: ExportLocal[] = [];
  const usos: Uso[] = [];
  const cadenas: ArchivoAnalizado['cadenas'] = [];
  const conteo = new Map<string, number>();
  const visitar = (n: ts.Node): void => {
    if (ts.isIdentifier(n)) conteo.set(n.text, (conteo.get(n.text) ?? 0) + 1);
    const p = n.parent;
    const esEspecificador = p && (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isLiteralTypeNode(p) || ts.isExternalModuleReference(p) || (ts.isCallExpression(p) && p.expression.kind === ts.SyntaxKind.ImportKeyword));
    if (ts.isStringLiteralLike(n) && !esEspecificador) cadenas.push({ texto: n.text, nombres: nombresDeImportEnvolvente(n) });
    if (ts.isTemplateExpression(n)) for (const t of [n.head.text, ...n.templateSpans.map((s) => s.literal.text)]) cadenas.push({ texto: t, nombres: nombresDeImportEnvolvente(n) });
    if (ts.isImportDeclaration(n) && ts.isStringLiteral(n.moduleSpecifier)) {
      const c = n.importClause;
      const nombres: string[] = [];
      let todos = false;
      if (c?.name) nombres.push('default');
      if (c?.namedBindings && ts.isNamespaceImport(c.namedBindings)) todos = true;
      else if (c?.namedBindings) for (const e of c.namedBindings.elements) nombres.push((e.propertyName ?? e.name).text);
      usos.push({ especificador: n.moduleSpecifier.text, nombres: todos ? '*' : nombres });
    }
    if (ts.isExportDeclaration(n) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
      const nombres = n.exportClause && ts.isNamedExports(n.exportClause) ? n.exportClause.elements.map((e) => (e.propertyName ?? e.name).text) : '*';
      usos.push({ especificador: n.moduleSpecifier.text, nombres });
    }
    if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword && n.arguments[0] && ts.isStringLiteralLike(n.arguments[0])) {
      usos.push({ especificador: n.arguments[0].text, nombres: destructurados(n) });
    }
    if (ts.isImportTypeNode(n) && ts.isLiteralTypeNode(n.argument) && ts.isStringLiteral(n.argument.literal)) {
      const q = n.qualifier;
      const primero = q ? (ts.isIdentifier(q) ? q.text : ts.isQualifiedName(q) ? leftmost(q) : '') : '';
      usos.push({ especificador: n.argument.literal.text, nombres: primero ? [primero] : '*' });
    }
    ts.forEachChild(n, visitar);
  };
  const leftmost = (q: ts.QualifiedName): string => (ts.isIdentifier(q.left) ? q.left.text : leftmost(q.left));
  visitar(fuente);
  // JSDoc: `import('x').Y` en comentarios de .js
  for (const m of texto.matchAll(/import\(\s*['"]([^'"]+)['"]\s*\)\.(\w+)/g)) usos.push({ especificador: m[1], nombres: [m[2]] });
  for (const st of fuente.statements) {
    const empujar = (nombre: string, local: string, decl: ts.Node, tipo: ExportLocal['tipo']) => {
      exportsLocales.push({ nombre, local, tipo, linea: fuente.getLineAndCharacterOfPosition(decl.getStart(fuente)).line + 1 });
    };
    if (ts.isExportAssignment(st)) {
      empujar('default', '', st, 'default');
      continue;
    }
    if (ts.isExportDeclaration(st) && !st.moduleSpecifier && st.exportClause && ts.isNamedExports(st.exportClause)) {
      for (const e of st.exportClause.elements) empujar(e.name.text, (e.propertyName ?? e.name).text, st, 'lista');
      continue;
    }
    if (ts.isExportDeclaration(st) && st.moduleSpecifier) {
      if (st.exportClause && ts.isNamedExports(st.exportClause)) for (const e of st.exportClause.elements) empujar(e.name.text, '', st, 'reexport');
      continue;
    }
    if (!tieneExport(st)) continue;
    if (tieneDefault(st)) {
      empujar('default', '', st, 'default');
      continue;
    }
    if (ts.isVariableStatement(st)) {
      const ids: ts.Identifier[] = [];
      for (const d of st.declarationList.declarations) nombresDePatron(d.name, ids);
      for (const id of ids) {
        empujar(id.text, id.text, st, st.declarationList.declarations.length > 1 || !ts.isIdentifier(st.declarationList.declarations[0].name) ? 'multiple' : 'declaracion');
      }
      continue;
    }
    const nombre = (st as ts.DeclarationStatement).name;
    if (nombre && ts.isIdentifier(nombre)) {
      const tipo = ts.isClassDeclaration(st) ? 'clase' : 'declaracion';
      if (!exportsLocales.some((e) => e.nombre === nombre.text)) empujar(nombre.text, nombre.text, st, tipo);
    }
  }
  // Uso interno: el nombre aparece más veces que sus declaraciones (las sobrecargas cuentan como declaración).
  const declaraciones = new Map<string, number>();
  for (const st of fuente.statements) {
    const n = (st as ts.DeclarationStatement).name;
    if (n && ts.isIdentifier(n)) declaraciones.set(n.text, (declaraciones.get(n.text) ?? 0) + 1);
    if (ts.isVariableStatement(st)) {
      const ids: ts.Identifier[] = [];
      for (const d of st.declarationList.declarations) nombresDePatron(d.name, ids);
      for (const id of ids) declaraciones.set(id.text, (declaraciones.get(id.text) ?? 0) + 1);
    }
  }
  for (const e of exportsLocales) {
    if (!e.local) continue;
    const listas = exportsLocales.filter((x) => x.tipo === 'lista' && x.local === e.local).length;
    e.usoInterno = (conteo.get(e.local) ?? 0) - listas > (declaraciones.get(e.local) ?? 1);
  }
  return { ruta, exports: exportsLocales, usos, cadenas, define: /^\s*(define\(|customElements\.define)/m.test(texto) };
}

/** Resuelve un especificador a una ruta versionada (o '' si es externo/desconocido). */
function resolutor(existe: Set<string>, porNombre: Map<string, string[]>) {
  const probar = (p: string): string => {
    const n = posix.normalize(p);
    const candidatos = [n, n.replace(/\.m?js$/, '.ts'), `${n}.ts`, `${n}.js`, `${n}/index.ts`, n.replace(/\.js$/, '.mjs')];
    for (const c of candidatos) if (existe.has(c)) return c;
    return '';
  };
  const deDist = (resto: string): string => {
    const limpio = resto.replace(/\.min\.(mjs|js)$/, '').replace(/\.(mjs|js|ts)$/, '');
    const [cat, ...partes] = limpio.split('/');
    const nombre = partes.join('/');
    if (cat === 'core') return probar(`src/core/${nombre}`) || probar(`src/cdn/${nombre}`);
    if (cat === 'lib') return probar(`src/vendor-distributions/shared/lib/${nombre}`);
    if (cat === 'vendor-distributions' || cat === 'build') return probar(`src/${cat === 'build' ? 'cdn/build' : cat}/${nombre}`);
    const lista = porNombre.get(basename(nombre)) ?? [];
    return lista.find((r) => r.startsWith(`src/components/${cat}/`)) ?? lista[0] ?? '';
  };
  return (desde: string, esp: string): string => {
    const s = esp.replace(/[?#].*$/, '');
    if (s.startsWith(ALIAS)) {
      const resto = s.slice(ALIAS.length);
      if (/\.min\.(mjs|js)$/.test(resto)) return deDist(resto);
      return probar(`src/${resto}`);
    }
    const iDist = s.indexOf('dist/cdn/');
    if (iDist >= 0) return deDist(s.slice(iDist + 'dist/cdn/'.length));
    if (s.startsWith('.') || s.startsWith('/')) {
      const r = s.startsWith('/') ? s.slice(1) : posix.join(posix.dirname(desde), s);
      return probar(r);
    }
    return '';
  };
}

/** Imports sin uso según `deno lint` (no-unused-vars) sobre `rutas`: `archivo:línea nombre`. */
export function importsSinUso(raiz: string, rutas: string[] = ['src', 'scripts', 'tests', 'skills']): string[] {
  let salida = '';
  try {
    salida = execFileSync(Deno.execPath(), ['lint', '--rules-include=no-unused-vars', '--rules-tags=', '--json', ...rutas], { cwd: raiz, encoding: 'utf8', maxBuffer: 1 << 28 });
  } catch (e) {
    salida = String((e as { stdout?: string }).stdout ?? '');
  }
  const hallados: string[] = [];
  const fuentes = new Map<string, ts.SourceFile>();
  for (const d of JSON.parse(salida).diagnostics as { filename: string; message: string; range: { start: { line: number } } }[]) {
    const abs = barras(decodeURIComponent(new URL(d.filename).pathname).replace(/^\/([A-Za-z]:)/, '$1'));
    const rel = abs.replace(`${barras(raiz).replace(/\/$/, '')}/`, '');
    if (/(^|\/)(vendor|node_modules|dist)\//.test(rel)) continue;
    const nombre = d.message.match(/^`([^`]+)`/)?.[1];
    if (!nombre) continue;
    if (!fuentes.has(abs)) fuentes.set(abs, ts.createSourceFile(abs, readFileSync(abs, 'utf8'), ts.ScriptTarget.Latest, true));
    const fuente = fuentes.get(abs)!;
    for (const st of fuente.statements) {
      if (!ts.isImportDeclaration(st) || !st.importClause) continue;
      const c = st.importClause;
      const nodos: ts.Identifier[] = [];
      if (c.name) nodos.push(c.name);
      if (c.namedBindings && ts.isNamespaceImport(c.namedBindings)) nodos.push(c.namedBindings.name);
      else if (c.namedBindings) for (const e of c.namedBindings.elements) nodos.push(e.name);
      if (nodos.some((n) => n.text === nombre && fuente.getLineAndCharacterOfPosition(n.getStart(fuente)).line + 1 === d.range.start.line)) hallados.push(`${rel}:${d.range.start.line} ${nombre}`);
    }
  }
  return hallados;
}

/** Recorre todo el repo y devuelve exports sin consumidor y archivos sin importador. */
export function analizarCodigoMuerto(raiz: string, excepciones: Excepciones, ambito: string[] = ['src/', 'scripts/', 'tests/']): InformeCodigoMuerto {
  const todos = versionados(raiz).map(barras).filter((r) => !FUERA.test(r) && !r.includes('/node_modules/'));
  const existe = new Set(todos);
  const porNombre = new Map<string, string[]>();
  for (const r of todos) {
    if (!r.startsWith('src/components/') || !CODIGO.test(r)) continue;
    const b = basename(r).replace(CODIGO, '');
    porNombre.set(b, [...(porNombre.get(b) ?? []), r]);
  }
  const resolver = resolutor(existe, porNombre);
  const analizados = new Map<string, ArchivoAnalizado>();
  const usados = new Map<string, Set<string>>();
  const importadores = new Map<string, Set<string>>();
  const enteros: Record<string, string> = {};
  const marcar = (archivo: string, nombre: string, desde: string) => {
    if (nombre === '*' && desde !== archivo) enteros[archivo] ??= desde;
    if (!usados.has(archivo)) usados.set(archivo, new Set());
    usados.get(archivo)!.add(nombre);
    if (!importadores.has(archivo)) importadores.set(archivo, new Set());
    if (desde !== archivo) importadores.get(archivo)!.add(desde);
  };
  const textos: [string, string][] = [];
  for (const r of todos) {
    if (GENERADOS.has(r)) continue;
    const esCodigo = CODIGO.test(r) && !r.endsWith('.d.ts');
    const esTexto = /\.(md|html|json|jsonc|yml|yaml|txt|sh|ps1|py)$/.test(r) || r === 'deno.json';
    if (!esCodigo && !esTexto) continue;
    let texto = '';
    try {
      texto = readFileSync(join(raiz, r), 'utf8');
    } catch {
      continue;
    }
    if (esCodigo) {
      const a = analizarArchivo(r, texto);
      analizados.set(r, a);
      for (const u of a.usos) {
        const destino = resolver(r, u.especificador);
        if (!destino) continue;
        // Un import de efecto (`import './x.js'`) no usa nombres pero sí cuenta como importador.
        for (const n of u.nombres === '*' ? ['*'] : u.nombres.length ? u.nombres : ['']) marcar(destino, n, r);
      }
    } else {
      textos.push([r, texto]);
      for (const m of texto.matchAll(/import\s*(?:type\s*)?(\*\s*as\s*\w+|\{([^}]*)\}|\w+)\s*from\s*['"]([^'"]+)['"]/g)) {
        const destino = resolver(r, m[3]);
        if (!destino) continue;
        const nombres = m[1].startsWith('*') ? ['*'] : m[2] !== undefined ? m[2].split(',').map((x) => x.trim().replace(/^type\s+/, '').split(/\s+as\s+/)[0]).filter(Boolean) : ['default'];
        for (const n of nombres) marcar(destino, n, r);
      }
      for (const m of texto.matchAll(/import\(\s*['"`]([^'"`$]+)['"`]\s*\)/g)) {
        const destino = resolver(r, m[1]);
        if (destino) marcar(destino, '*', r);
      }
    }
  }
  // Referencias por ruta en cadenas de código: el archivo se carga entero por URL/ruta.
  const porBase = new Map<string, string[]>();
  const sinExtension = (p: string) => p.replace(/(\.min)?\.(ts|mts|mjs|js|cjs)$/, '');
  for (const r of analizados.keys()) {
    const b = basename(sinExtension(r));
    porBase.set(b, [...(porBase.get(b) ?? []), r]);
  }
  for (const [desde, a] of analizados) {
    for (const { texto: c, nombres } of a.cadenas) {
      const limpia = c.replace(/[?#].*$/, '').replace(/^\.?\//, '');
      if (c.length > 300 || !/\.(ts|mjs|js|cjs)$/.test(limpia)) continue;
      const base = sinExtension(limpia);
      const usar = (r: string) => {
        for (const n of nombres === '*' ? ['*'] : nombres) marcar(r, n, desde);
      };
      for (const r of porBase.get(basename(base)) ?? []) {
        if (r === desde) continue;
        const rSin = sinExtension(r);
        if (!base.includes('/') || rSin.endsWith(`/${base}`) || rSin === base || base.endsWith(rSin.replace(/^src\//, ''))) usar(r);
      }
      const d = resolver(desde, c);
      if (d && d !== desde) usar(d);
    }
  }
  // Referencias por ruta en md/json/html/deno.json (entradas legítimas: scripts, tests, docs).
  const citados = new Set<string>();
  // El historial de trabajo (specs/health) no hace vivo a nadie.
  const cuerpo = textos.filter(([r]) => !r.startsWith('specs/health/')).map(([, t]) => t).join('\n');
  for (const r of analizados.keys()) {
    const sinExt = r.replace(CODIGO, '');
    const sinSrc = sinExt.replace(/^src\//, '');
    if (cuerpo.includes(r) || cuerpo.includes(`${sinSrc}.`) || cuerpo.includes(`${sinExt}.`)) citados.add(r);
  }
  // Nombres documentados como API en skills, specs/cdn.md y la ficha .md de cada componente o util (`src/**/<x>.md`).
  const docSkills = textos.filter(([r]) => r.startsWith('skills/') || r === 'specs/cdn.md' || (r.startsWith('src/') && r.endsWith('.md'))).map(([, t]) => t).join('\n');
  const documentados = new Set<string>();
  for (const m of docSkills.matchAll(/`([A-Za-z_$][\w$]*)/g)) documentados.add(m[1]);
  for (const m of docSkills.matchAll(/\b([A-Za-z_$][\w$]{2,})\s*\(/g)) documentados.add(m[1]);

  const muertos: ExportMuerto[] = [];
  const conservados: { archivo: string; nombre: string; razon: string }[] = [];
  const sinImportador: string[] = [];
  for (const [r, a] of analizados) {
    if (!ambito.some((p) => r.startsWith(p))) continue;
    const u = usados.get(r);
    const razonArchivo = excepcionDeArchivo(r, excepciones);
    if (!u?.has('*')) {
      for (const e of a.exports) {
        if (u?.has(e.nombre)) continue;
        let razon = razonArchivo;
        if (!razon && e.tipo === 'clase' && a.define) razon = 'clase de componente (manifest/galería)';
        if (!razon && documentados.has(e.nombre) && r.startsWith('src/')) razon = 'documentado como API en skills o specs/cdn.md';
        const sim = excepciones.simbolo.find(([f, n]) => f === r && n === e.nombre);
        if (!razon && sim) razon = sim[2];
        if (!razon && e.tipo === 'reexport') razon = 'reexport (lo vigila no-reexports)';
        if (!razon && e.nombre === 'default' && /\.test\.ts$/.test(r)) razon = 'default de archivo de pruebas';
        if (razon) conservados.push({ archivo: r, nombre: e.nombre, razon });
        else muertos.push({ archivo: r, ...e });
      }
    }
    if ((importadores.get(r)?.size ?? 0) > 0 || citados.has(r)) continue;
    if (esEntradaLegitima(r, a, existe, excepciones)) continue;
    sinImportador.push(r);
  }
  return { muertos, conservados, sinImportador, enteros };
}

/** Entradas que no necesitan importador: tests, componentes, core público, previews, schemas de un .ts vivo, CLI. */
function esEntradaLegitima(r: string, a: ArchivoAnalizado, existe: Set<string>, excepciones: Excepciones): boolean {
  if (/\.test\.ts$|\.ratchet\.ts$/.test(r)) return true;
  if (r.startsWith('tests/.audit/')) return true;
  if (a.define) return true;
  if (/\.preview\.ts$/.test(r) || r.startsWith('src/previews/') || r.startsWith('src/pages/')) return true;
  if (r.startsWith('src/core/') || r.startsWith('src/cdn/') || r.startsWith('src/vendor-distributions/')) return true;
  if (r.endsWith('.schemas.ts')) {
    const hermano = r.replace(/schemas\/([^/]+)\.schemas\.ts$/, '$1.ts').replace(/\.schemas\.ts$/, '.ts');
    if (existe.has(hermano)) return true;
  }
  return !!excepcionDeArchivo(r, excepciones);
}
