// aplanar.mjs — fusiona y mueve módulos según un mapa JSON y reescribe todas las referencias del repo (F9a, B1).
//
//   deno run -A scripts/codemods/aplanar.mjs scripts/codemods/aplanar-<fase>.json [--dry] [--raiz=<repo>]
//
// Mapa: `{ "core/dom-utils": "core/dom", "core/misc-utils": "core/dom", "core/json-html": "components/isp/utils/isp-json" }`
// (rutas desde `src/`, sin extensión). Por cada destino:
//   1. `git mv` del primero del grupo al nombre nuevo; los demás se concatenan detrás y se borran (`git rm`).
//      Imports arriba, uno por línea y por módulo, sin duplicados; los imports entre partes del mismo grupo desaparecen.
//      La cabecera JSDoc de cada parte se conserva como sección `// ── <nombre> ──`.
//   2. Los `*.schemas.ts` de cada parte (`<dir>/schemas/<x>.schemas.ts`, `<cat>/schemas/<x>.schemas.ts` o hermano
//      `<dir>/<x>.schemas.ts`) se mueven/fusionan igual, al lado del destino con su mismo estilo. Una clave terminada en
//      `.schemas` en el mapa fija el destino a mano.
//   3. Se reescriben TODOS los especificadores y rutas: imports por alias (`@jeff-aporta/iswc-base/<ruta>.js`),
//      relativos (`./x.js`; si el nuevo relativo sube de carpeta dentro de src/, pasa al alias), `import()`,
//      `import('…').X`, y los textos de tests, md, skills, scripts, deno.json y specs (`src/<ruta>.ts`, `<ruta>.js`,
//      `dist/cdn/<cat>/<x>.min.mjs`).
// Se detiene sin escribir nada si dos partes de un grupo declaran el mismo nombre top-level (lo reporta para
// resolverlo a mano). Idempotente: una clave cuyo archivo ya no existe y cuyo destino sí, se da por aplicada.
//
// category: "how"
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join, posix, relative, resolve } from 'node:path';
import ts from 'npm:typescript@5.9.3';

const ALIAS = '@jeff-aporta/iswc-base/';
const EXTS = ['.ts', '.mjs', '.js'];
const TEXTO = /\.(ts|mts|mjs|js|cjs|md|json|jsonc|html|yml|yaml|txt|scss|css)$/;
// Los mapas de aplanar y el historial (specs/health) conservan los nombres viejos a propósito.
const FUERA = /^(dist|node_modules|\.tmp|\.audit|labs\/[^/]+\/out|assets|specs\/health)\/|^scripts\/codemods\/aplanar[^/]*\.(json|mjs)$|^tests\/gobernanza\/aplanar-codemod\.test\.ts$/;

const argumentos = Deno.args.filter((a) => !a.startsWith('--'));
const dry = Deno.args.includes('--dry');
const raiz = (Deno.args.find((a) => a.startsWith('--raiz='))?.slice(7) ?? Deno.cwd()).replaceAll('\\', '/');
if (!argumentos[0]) {
  console.error('uso: aplanar.mjs <mapa.json> [--dry] [--raiz=<repo>]');
  Deno.exit(2);
}
const mapa = JSON.parse(readFileSync(argumentos[0], 'utf8'));

const abs = (rel) => join(raiz, rel);
const hay = (rel) => existsSync(abs(rel));
const leer = (rel) => readFileSync(abs(rel), 'utf8');
const git = (...a) => execFileSync('git', a, { cwd: raiz, encoding: 'utf8', maxBuffer: 1 << 28 });

/** `src/<clave>.<ext>` que existe, o ''. */
function fuenteDe(clave) {
  for (const e of EXTS) if (hay(`src/${clave}${e}`)) return `src/${clave}${e}`;
  return '';
}

/** Schemas de un módulo: el primero que exista entre los estilos del repo. */
function schemasDe(ruta) {
  const dir = posix.dirname(ruta);
  const nombre = posix.basename(ruta).replace(/\.(ts|mjs|js)$/, '');
  const cat = ruta.match(/^src\/components\/[^/]+/)?.[0];
  const candidatos = [`${dir}/schemas/${nombre}.schemas.ts`, `${dir}/${nombre}.schemas.ts`];
  if (cat) candidatos.push(`${cat}/schemas/${nombre}.schemas.ts`);
  return candidatos.find(hay) ?? '';
}

/** Dónde van los schemas del destino, imitando el estilo de los del primero. */
function schemasDestino(schemasOrigen, origen, destino) {
  const dirO = posix.dirname(origen);
  const nombreD = posix.basename(destino).replace(/\.(ts|mjs|js)$/, '');
  const dirD = posix.dirname(destino);
  const catD = destino.match(/^src\/components\/[^/]+/)?.[0];
  // En src/components los schemas de los utils viven en `<cat>/schemas/` (no en `utils/schemas/`).
  if (schemasOrigen === `${dirO}/schemas/${posix.basename(schemasOrigen)}`) return catD ? `${catD}/schemas/${nombreD}.schemas.ts` : `${dirD}/schemas/${nombreD}.schemas.ts`;
  if (schemasOrigen.startsWith(`${dirO}/`) && !schemasOrigen.includes('/schemas/')) return `${dirD}/${nombreD}.schemas.ts`;
  return catD ? `${catD}/schemas/${nombreD}.schemas.ts` : `${dirD}/schemas/${nombreD}.schemas.ts`;
}

// ── 1. Plan: grupos destino → partes (código y schemas) ──
const grupos = new Map();
const aplicadas = [];
const agregar = (destino, origen) => {
  if (!grupos.has(destino)) grupos.set(destino, []);
  if (!grupos.get(destino).includes(origen)) grupos.get(destino).push(origen);
};
const explicitos = new Set();
for (const [clave, valor] of Object.entries(mapa)) {
  if (clave.startsWith('//')) continue;
  const origen = fuenteDe(clave);
  if (!origen) {
    if (fuenteDe(valor)) aplicadas.push(clave);
    else throw new Error(`aplanar: no existe src/${clave}.{ts,mjs,js} ni su destino src/${valor}`);
    continue;
  }
  const ext = posix.extname(origen);
  const destino = `src/${valor}${valor.endsWith('.schemas') ? '.ts' : ext}`;
  agregar(destino, origen);
  if (clave.endsWith('.schemas')) explicitos.add(origen);
}
for (const [destino, partes] of [...grupos]) {
  if (destino.endsWith('.schemas.ts')) continue;
  for (const p of partes) {
    const s = schemasDe(p);
    if (!s || explicitos.has(s)) continue;
    agregar(schemasDestino(schemasDe(partes[0]) || s, partes[0], destino), s);
  }
}
// Un grupo que solo se contiene a sí mismo ya está aplicado (idempotencia).
for (const [destino, partes] of [...grupos]) {
  if (partes.length === 1 && partes[0] === destino) {
    grupos.delete(destino);
    aplicadas.push(destino);
  }
}
/** origen (ruta del repo) → destino. */
const movidas = new Map();
for (const [destino, partes] of grupos) for (const p of partes) movidas.set(p, destino);

// ── 2. Resolución de especificadores ──
function probar(rel) {
  const n = posix.normalize(rel);
  for (const c of [n, n.replace(/\.m?js$/, '.ts'), `${n}.ts`, n.replace(/\.js$/, '.mjs')]) if (hay(c) || movidas.has(c) || grupos.has(c)) return c;
  return '';
}
function resolver(desde, esp) {
  const s = esp.replace(/[?#].*$/, '');
  if (s.startsWith(ALIAS)) return probar(`src/${s.slice(ALIAS.length)}`);
  if (s.startsWith('./') || s.startsWith('../')) return probar(posix.join(posix.dirname(desde), s));
  return '';
}
/** Especificador hacia `destino` escrito desde `archivo`, con el estilo del original. */
function especificador(archivo, original, destino) {
  const query = original.match(/[?#].*$/)?.[0] ?? '';
  const ext = (original.replace(/[?#].*$/, '').match(/\.(m?js|ts)$/)?.[0]) ?? '';
  const sinExt = destino.replace(/\.(ts|mjs|js)$/, '');
  if (original.startsWith(ALIAS)) return `${ALIAS}${sinExt.slice(4)}${ext}${query}`;
  let rel = posix.relative(posix.dirname(archivo), sinExt);
  if (!rel.startsWith('.')) rel = `./${rel}`;
  // Dentro de src/ (salvo vendor-distributions), lo que sube de carpeta va por alias (gobernanza/alias-imports).
  if (rel.startsWith('../') && archivo.startsWith('src/') && !archivo.startsWith('src/vendor-distributions/') && sinExt.startsWith('src/')) return `${ALIAS}${sinExt.slice(4)}${ext}${query}`;
  return `${rel}${ext}${query}`;
}

const fuenteTs = (ruta, texto) => ts.createSourceFile(ruta, texto, ts.ScriptTarget.Latest, true, /\.m?ts$/.test(ruta) ? ts.ScriptKind.TS : ts.ScriptKind.JS);

/** Literales que son especificadores de módulo: import/export from, import(), import('…') de tipos, JSDoc. */
function especificadores(fuente) {
  const out = [];
  const visitar = (n) => {
    const p = n.parent;
    if (ts.isStringLiteralLike(n) && p && (ts.isImportDeclaration(p) || ts.isExportDeclaration(p) || ts.isLiteralTypeNode(p) || (ts.isCallExpression(p) && p.expression.kind === ts.SyntaxKind.ImportKeyword && p.arguments[0] === n))) out.push(n);
    ts.forEachChild(n, visitar);
  };
  visitar(fuente);
  return out;
}

/** Reescribe los especificadores de `texto` (escrito para `viejo`) como si viviera en `nuevo`. */
function reescribirEspecificadores(viejo, nuevo, texto) {
  const fuente = fuenteTs(viejo, texto);
  const cambios = [];
  for (const lit of especificadores(fuente)) {
    const objetivo = resolver(viejo, lit.text);
    if (!objetivo) continue;
    const final = movidas.get(objetivo) ?? objetivo;
    if (final === objetivo && viejo === nuevo) continue;
    const nuevoEsp = especificador(nuevo, lit.text, final);
    if (nuevoEsp !== lit.text) cambios.push([lit.getStart(fuente) + 1, lit.getEnd() - 1, nuevoEsp]);
  }
  // JSDoc: import('x').Y en comentarios
  for (const m of texto.matchAll(/import\(\s*(['"])([^'"]+)\1\s*\)/g)) {
    const ini = m.index + m[0].indexOf(m[2]);
    if (cambios.some(([a]) => a === ini)) continue;
    const objetivo = resolver(viejo, m[2]);
    if (!objetivo) continue;
    const final = movidas.get(objetivo) ?? objetivo;
    if (final === objetivo && viejo === nuevo) continue;
    cambios.push([ini, ini + m[2].length, especificador(nuevo, m[2], final)]);
  }
  cambios.sort((a, b) => b[0] - a[0]);
  let salida = texto;
  for (const [a, b, s] of cambios) salida = salida.slice(0, a) + s + salida.slice(b);
  return salida;
}

/** Une los `import { … } from 'x'` repetidos (mismo módulo y mismo `type`) que deja la reescritura. */
function unirImportsDuplicados(ruta, texto) {
  const fuente = fuenteTs(ruta, texto);
  const grupo = new Map();
  for (const st of fuente.statements) {
    const c = ts.isImportDeclaration(st) ? st.importClause : null;
    if (!c || c.name || !c.namedBindings || !ts.isNamedImports(c.namedBindings) || st.attributes) continue;
    const clave = `${c.isTypeOnly}:${st.moduleSpecifier.text}`;
    if (!grupo.has(clave)) grupo.set(clave, []);
    grupo.get(clave).push(st);
  }
  const cambios = [];
  for (const sts of grupo.values()) {
    if (sts.length < 2) continue;
    const nombres = [];
    for (const st of sts) for (const e of st.importClause.namedBindings.elements) if (!nombres.includes(e.getText(fuente))) nombres.push(e.getText(fuente));
    const [primero, ...resto] = sts;
    const q = primero.moduleSpecifier.getText(fuente);
    cambios.push([primero.getStart(fuente), primero.getEnd(), `import ${primero.importClause.isTypeOnly ? 'type ' : ''}{ ${nombres.join(', ')} } from ${q};`]);
    for (const st of resto) {
      let fin = st.getEnd();
      if (texto[fin] === '\r') fin++;
      if (texto[fin] === '\n') fin++;
      cambios.push([st.getStart(fuente), fin, '']);
    }
  }
  cambios.sort((a, b) => b[0] - a[0]);
  let salida = texto;
  for (const [a, b, s] of cambios) salida = salida.slice(0, a) + s + salida.slice(b);
  return salida;
}

// ── 3. Fusión de un grupo ──
/** Nombres top-level que declara una sentencia. */
function declarados(st) {
  const out = [];
  const patron = (n) => {
    if (ts.isIdentifier(n)) out.push(n.text);
    else for (const e of n.elements) if (!ts.isOmittedExpression(e)) patron(e.name);
  };
  if (ts.isVariableStatement(st)) for (const d of st.declarationList.declarations) patron(d.name);
  else if (st.name && ts.isIdentifier(st.name)) out.push(st.name.text);
  return out;
}

/** Cabecera (comentarios antes de la primera sentencia), imports y cuerpo de una parte. */
function partir(ruta, texto) {
  const fuente = fuenteTs(ruta, texto);
  const sts = fuente.statements;
  const primera = sts[0];
  const inicioPrimera = primera ? primera.getStart(fuente) : texto.length;
  let cabecera = texto.slice(0, inicioPrimera);
  // La cabecera llega hasta antes de los comentarios pegados a la primera sentencia (JSDoc de una función).
  const jsdocPrimera = primera && !ts.isImportDeclaration(primera) ? (ts.getJSDocCommentsAndTags(primera)[0] ?? null) : null;
  if (jsdocPrimera && jsdocPrimera.pos >= 0 && jsdocPrimera.getStart(fuente) < inicioPrimera) cabecera = texto.slice(0, jsdocPrimera.getStart(fuente));
  const imports = sts.filter((st) => ts.isImportDeclaration(st));
  const nombres = new Set();
  for (const st of sts) for (const n of declarados(st)) nombres.add(n);
  return { fuente, texto, finImports: cabecera.length, cabecera: cabecera.trimEnd(), imports, cuerpo: sinImports(texto, imports, cabecera.length), nombres };
}

/** Texto desde `desde` sin las declaraciones import (estén donde estén: hay imports después de código). */
function sinImports(texto, imports, desde, quitarTambien = []) {
  const rangos = [...imports, ...quitarTambien].map((st) => {
    let fin = st.getEnd();
    while (texto[fin] === ' ' || texto[fin] === '\t') fin++;
    // Un comentario de línea pegado al import (`import 'x'; // por qué`) se va con él.
    if (texto[fin] === '/' && texto[fin + 1] === '/') while (fin < texto.length && texto[fin] !== '\n') fin++;
    if (texto[fin] === '\r') fin++;
    if (texto[fin] === '\n') fin++;
    return [st.getStart(), fin];
  }).filter(([a]) => a >= desde).sort((a, b) => b[0] - a[0]);
  let salida = texto;
  for (const [a, b] of rangos) salida = salida.slice(0, a) + salida.slice(b);
  return salida.slice(desde).replace(/^\s*\n/, '');
}

/** Fusiona las partes (en orden) para el destino; devuelve el texto o lanza con las colisiones. */
function fusionar(destino, partes) {
  const piezas = partes.map((p) => ({ ruta: p, ...partir(p, reescribirEspecificadores(p, destino, leer(p))) }));
  const colisiones = [];
  const vistos = new Map();
  // Una declaración top-level idéntica (mismo texto) en dos partes no es colisión: se queda la primera.
  const textoDe = new Map();
  for (const pz of piezas) {
    const quitar = [];
    for (const st of pz.fuente.statements) {
      const nombres = ts.isImportDeclaration(st) ? [] : declarados(st);
      if (!nombres.length) continue;
      const t = st.getText(pz.fuente).replace(/\s+/g, ' ');
      // Los ayudantes `var __x` que dejó un transpilado (`__publicField`…) son equivalentes: basta el primero.
      const ayudanteVar = ts.isVariableStatement(st) && !(st.declarationList.flags & ts.NodeFlags.BlockScoped) && nombres.every((n) => /^__/.test(n) && vistos.has(n));
      if (ayudanteVar || nombres.every((n) => textoDe.get(n) === t)) {
        quitar.push(st);
        continue;
      }
      for (const n of nombres) {
        if (vistos.has(n)) colisiones.push(`${n}: ${vistos.get(n)} y ${pz.ruta}`);
        else {
          vistos.set(n, pz.ruta);
          textoDe.set(n, t);
        }
      }
    }
    if (quitar.length) pz.cuerpo = sinImports(pz.texto, pz.imports, pz.finImports, quitar);
  }
  // Imports: por módulo y tipo; los que apuntan a otra parte del grupo (o al propio destino) se van.
  const porModulo = new Map();
  const efecto = [];
  for (const pz of piezas) {
    for (const st of pz.imports) {
      const esp = st.moduleSpecifier.text;
      const objetivo = resolver(destino, esp);
      if (objetivo === destino) {
        const c = st.importClause;
        const renombres = c?.namedBindings && ts.isNamedImports(c.namedBindings) ? c.namedBindings.elements.filter((e) => e.propertyName && e.propertyName.text !== e.name.text) : [];
        if (renombres.length) colisiones.push(`${pz.ruta}: importa con alias (${renombres.map((e) => e.getText()).join(', ')}) de otra parte del grupo`);
        if (c?.namedBindings && ts.isNamespaceImport(c.namedBindings)) colisiones.push(`${pz.ruta}: import * de otra parte del grupo`);
        // Lo importado de otra parte debe ser una declaración top-level (no un alias `export { a as b }`).
        if (c?.namedBindings && ts.isNamedImports(c.namedBindings)) {
          for (const e of c.namedBindings.elements) if (!vistos.has((e.propertyName ?? e.name).text)) colisiones.push(`${pz.ruta}: importa ${(e.propertyName ?? e.name).text}, que en el grupo no es una declaración top-level (¿alias de export?)`);
        }
        continue;
      }
      const c = st.importClause;
      if (!c) {
        if (!efecto.includes(esp)) efecto.push(esp);
        continue;
      }
      const atributos = st.attributes ? ` ${st.attributes.getText(pz.fuente)}` : '';
      if (c.name || (c.namedBindings && ts.isNamespaceImport(c.namedBindings))) {
        const texto = `${st.getText(pz.fuente).replace(/\s+/g, ' ').replace(/;?$/, ';')}`;
        const clave = `crudo:${texto}`;
        if (!porModulo.has(clave)) porModulo.set(clave, { crudo: texto });
        for (const n of [c.name?.text, c.namedBindings && ts.isNamespaceImport(c.namedBindings) ? c.namedBindings.name.text : null].filter(Boolean)) {
          if (vistos.has(n) && vistos.get(n) !== pz.ruta) colisiones.push(`${n}: importado en ${pz.ruta} y declarado en ${vistos.get(n)}`);
        }
        continue;
      }
      const clave = `${c.isTypeOnly ? 'type' : 'valor'}:${esp}${atributos}`;
      if (!porModulo.has(clave)) porModulo.set(clave, { tipo: c.isTypeOnly, esp, atributos, nombres: [] });
      const entrada = porModulo.get(clave);
      for (const e of c.namedBindings?.elements ?? []) {
        const t = e.getText(pz.fuente);
        if (!entrada.nombres.includes(t)) entrada.nombres.push(t);
        if (vistos.has(e.name.text)) colisiones.push(`${e.name.text}: importado en ${pz.ruta} y declarado en ${vistos.get(e.name.text)}`);
      }
    }
  }
  // Un mismo nombre importado como valor y como tipo del mismo módulo: basta el de valor.
  for (const [clave, e] of porModulo) {
    if (!e.tipo) continue;
    const valor = porModulo.get(`valor:${e.esp}${e.atributos}`);
    if (valor) e.nombres = e.nombres.filter((n) => !valor.nombres.includes(n) && !valor.nombres.includes(n.replace(/^type\s+/, '')));
    if (!e.nombres.length) porModulo.delete(clave);
  }
  if (colisiones.length) throw new Error(`aplanar: colisiones en ${destino}:\n  ${[...new Set(colisiones)].join('\n  ')}`);
  const comilla = (s) => `'${s}'`;
  const lineas = [];
  for (const e of porModulo.values()) {
    if (e.crudo) lineas.push(e.crudo);
    else lineas.push(`import ${e.tipo ? 'type ' : ''}{ ${e.nombres.join(', ')} } from ${comilla(e.esp)}${e.atributos};`);
  }
  for (const esp of efecto) lineas.push(`import ${comilla(esp)};`);
  // La cabecera del archivo es la de la parte que ya se llama como el destino (si la hay) o la de la primera;
  // el orden de los cuerpos es el del mapa (dependencias primero: las `const` top-level no se elevan).
  const lider = piezas.find((pz) => pz.ruta === destino) ?? piezas[0];
  let salida = lider.cabecera ? `${lider.cabecera}\n` : '';
  salida += lineas.length ? `${lineas.join('\n')}\n` : '';
  piezas.forEach((pz, i) => {
    if (i === 0 && pz === lider) {
      salida += `\n${pz.cuerpo.trimEnd()}`;
      return;
    }
    const nombre = posix.basename(pz.ruta).replace(/\.(ts|mjs|js)$/, '');
    salida += `\n\n// ── ${nombre} ──\n`;
    const cab = pz === lider ? '' : pz.cabecera.replace(/^(\/\/ category: .*\n?)/m, '').trim();
    if (cab) salida += `${cab}\n`;
    salida += pz.cuerpo.trimEnd();
  });
  return `${salida.replace(/^\n+/, '')}\n`;
}

// ── 4. Referencias de texto (md, json, html, comentarios, rutas en cadenas) ──
const sinExt = (r) => r.replace(/\.(ts|mjs|js)$/, '');
/** Ruta pública en dist/cdn: core/<x> o <cat>/<nombre> (los utils se aplanan en su categoría). */
function rutaDist(r) {
  const s = sinExt(r).slice(4);
  if (s.startsWith('core/')) return s;
  const m = s.match(/^components\/([^/]+)\/(?:.*\/)?([^/]+)$/);
  return m ? `${m[1]}/${m[2]}` : '';
}
function reemplazosDeTexto() {
  const pares = [];
  for (const [o, d] of movidas) {
    const so = sinExt(o);
    const sd = sinExt(d);
    pares.push([`${so}.`, `${sd}.`]);
    pares.push([`${ALIAS}${so.slice(4)}.`, `${ALIAS}${sd.slice(4)}.`]);
    const dO = rutaDist(o);
    const dD = rutaDist(d);
    if (dO && dD && dO !== dD) pares.push([`${dO}.min.`, `${dD}.min.`]);
    // Ruta sin extensión en prosa: `core/dom-utils`, `diagrams/utils/diagram-curve`.
    pares.push([so.slice(4), sd.slice(4), true]);
    // Tramos de `join(raiz, 'src', 'core', 'x.ts')`: carpeta y nombre como cadenas sueltas (misma carpeta).
    if (posix.dirname(o) === posix.dirname(d)) {
      const dir = posix.basename(posix.dirname(o));
      // Enlaces relativos de los md (`./utils/x.js`, `../core/x.ts`): `<carpeta>/<nombre>.`.
      pares.push([`${dir}/${posix.basename(so)}.`, `${dir}/${posix.basename(sd)}.`]);
      for (const q of ["'", '"']) {
        for (const ext of ['.ts', '.js']) pares.push([`${q}${dir}${q}, ${q}${posix.basename(so)}${ext}${q}`, `${q}${dir}${q}, ${q}${posix.basename(sd)}${ext}${q}`]);
      }
    }
    if (so.startsWith('src/components/')) pares.push([so.slice('src/components/'.length), sd.slice('src/components/'.length), true]);
  }
  // Más largos primero: `src/core/x.` antes que `core/x`.
  return pares.sort((a, b) => b[0].length - a[0].length);
}
const escapar = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
function reemplazarTexto(texto, pares) {
  let salida = texto;
  for (const [de, a, palabra] of pares) {
    if (!salida.includes(de)) continue;
    const re = palabra ? new RegExp(`(?<![\\w./-])${escapar(de)}(?![\\w-])`, 'g') : new RegExp(`(?<![\\w-])${escapar(de)}`, 'g');
    salida = salida.replace(re, a);
  }
  return salida;
}

// ── 5. Ejecutar ──
if (!grupos.size) {
  console.log(`aplanar: nada que hacer (${aplicadas.length} claves ya aplicadas)`);
  Deno.exit(0);
}
const nuevos = new Map();
const errores = [];
for (const [destino, partes] of grupos) {
  try {
    nuevos.set(destino, fusionar(destino, partes));  } catch (e) {
    errores.push(String(e.message ?? e));
  }
}
if (errores.length) {
  console.error(errores.join('\n'));
  Deno.exit(1);
}
const pares = reemplazosDeTexto();
const versionados = git('ls-files', '--cached', '--others', '--exclude-standard').split('\n').map((l) => l.trim()).filter((r) => r && TEXTO.test(r) && !FUERA.test(r) && !r.includes('/node_modules/') && hay(r));
const archivoMapa = relative(raiz, resolve(argumentos[0])).replaceAll('\\', '/');
const tocados = [];
for (const r of versionados) {
  if (movidas.has(r) || r === archivoMapa) continue;
  const texto = leer(r);
  const esCodigo = /\.(ts|mts|mjs|js|cjs)$/.test(r) && !r.endsWith('.d.ts');
  let salida = esCodigo ? reescribirEspecificadores(r, r, texto) : texto;
  if (esCodigo && salida !== texto) salida = unirImportsDuplicados(r, salida);
  salida = reemplazarTexto(salida, pares);
  if (salida !== texto) {
    tocados.push(r);
    if (!dry) writeFileSync(abs(r), salida);
  }
}
for (const [destino, partes] of grupos) {
  const nombres = partes.map((p) => posix.basename(p)).join(' + ');
  console.log(`${dry ? '[dry] ' : ''}${destino} ← ${nombres}`);
  if (dry) continue;
  // `git mv` del primero al destino, salvo que una parte ya se llame como el destino (se queda y absorbe a las demás).
  const queda = partes.includes(destino) ? destino : partes[0];
  if (queda !== destino) {
    if (hay(destino)) throw new Error(`aplanar: ${destino} ya existe y no es parte del grupo`);
    execFileSync('git', ['mv', queda, destino], { cwd: raiz });
  }
  for (const p of partes) if (p !== queda) execFileSync('git', ['rm', '-q', '-f', p], { cwd: raiz });
  writeFileSync(abs(destino), reemplazarTexto(nuevos.get(destino), pares));
}
console.log(`aplanar: ${grupos.size} destinos, ${movidas.size} archivos movidos/fusionados, ${tocados.length} archivos con referencias reescritas${aplicadas.length ? `, ${aplicadas.length} ya aplicadas` : ''}${dry ? ' (dry)' : ''}`);
