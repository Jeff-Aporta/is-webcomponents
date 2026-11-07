// reactivo.mjs — F8 (specs/paridad-webawesome.md HOW-9): convierte el reflejo a mano en propiedades `@prop` sobre
// `IswcReactive`. Solo lo mecánico y verificable; lo demás queda como estaba y se informa.
//
//   deno run -A scripts/codemods/reactivo.mjs <archivo|carpeta>... [--dry]
//
// Por cada clase de un archivo:
//   1. Pares get/set de UNA línea sobre el mismo atributo, con estas formas:
//        get x() { return this.hasAttribute('x'); }            set x(v) { this.toggleAttribute('x', !!v); }  → @prop({ type: 'bool' })
//                                                              set x(v) { this.setBooleanAttr('x', v); }
//        get x() { return this.getAttribute('x') ?? 'D'; }     set x(v) { setStringAttr(this, 'x', v); }      → @prop()
//        get x() { return this.getAttribute('x') || 'D'; }     set x(v) { v ? this.setAttribute('x', v) : this.removeAttribute('x'); }
//        get x() { return this.getAttribute('x'); }            set x(v) { setOptionalAttr(this, 'x', v); }    → @prop({ vacio: true })
//                                                              set x(v) { this.setAttribute('x', String(v)); }
//      pasan a `@prop(…) accessor x: T = D;` (con `attr: 'a'` si el atributo no es el kebab del nombre). El tipo sale
//      de la anotación del getter (o del valor por defecto).
//   2. Si la clase convirtió algo y extiende `IswcElement` (o `withStyleAttrs(IswcElement)`), pasa a `IswcReactive`;
//      si extiende otra base que no sea ya reactiva (`IswcReactive`, `IswcFormControl`, `PropsElement`), la clase NO se
//      toca y se informa (la base va primero).
//   (5) Quita de `static observed` (o de la `const` a la que apunta) los atributos que pasaron a `@prop`.
//   3. `setCustomState(this.#x, 'e', v)` → `this.estado('e', v)` en clases que extienden `IswcFormControl`.
// Añade `import { IswcReactive, prop } from '@jeff-aporta/iswc-base/core/iswc-reactive.js';` (lo que haga falta) y deja
// los imports que quedan sin uso para `scripts/codemods/depurar.mjs`. Idempotente.
//
// category: "how"
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dry = Deno.args.includes('--dry');
const rutas = Deno.args.filter((a) => !a.startsWith('--'));
if (!rutas.length) {
  console.error('uso: reactivo.mjs <archivo|carpeta>... [--dry]');
  Deno.exit(2);
}

const BASES_REACTIVAS = new Set(['IswcReactive', 'IswcFormControl', 'PropsElement', 'withStyleAttrs(IswcReactive)', 'withStyleAttrs(IswcFormControl)']);
const MOLDE = new Set(['IswcElement', 'withStyleAttrs(IswcElement)']);
const ALIAS_REACTIVO = '@jeff-aporta/iswc-base/core/iswc-reactive.js';

const kebab = (s) => s.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

function archivos(ruta, out = []) {
  if (!existsSync(ruta)) return out;
  if (statSync(ruta).isDirectory()) {
    for (const n of readdirSync(ruta)) if (n !== 'schemas') archivos(join(ruta, n), out);
  } else if (/\.ts$/.test(ruta) && !/\.(schemas|preview|test)\.ts$/.test(ruta)) out.push(ruta);
  return out;
}

const RE_GET = /^([ \t]*)get ([A-Za-z_$][\w$]*)\(\)(?:\s*:\s*([^{]+?))?\s*\{\s*return this\.(hasAttribute|getAttribute)\('([a-z0-9-]+)'\)(?:\s*(\?\?|\|\|)\s*('[^'\\]*'|-?\d+(?:\.\d+)?|null|true|false))?\s*;?\s*\}[ \t]*$/;
const RE_SETS = [
  [/^\s*set ([A-Za-z_$][\w$]*)\((\w+)(?:\s*:[^)]*)?\)\s*\{\s*this\.toggleAttribute\('([a-z0-9-]+)',\s*!!\2\);?\s*\}\s*$/, 'bool'],
  [/^\s*set ([A-Za-z_$][\w$]*)\((\w+)(?:\s*:[^)]*)?\)\s*\{\s*this\.setBooleanAttr\('([a-z0-9-]+)',\s*\2\);?\s*\}\s*$/, 'bool'],
  [/^\s*set ([A-Za-z_$][\w$]*)\((\w+)(?:\s*:[^)]*)?\)\s*\{\s*setStringAttr\(this,\s*'([a-z0-9-]+)',\s*\2\);?\s*\}\s*$/, 'str'],
  [/^\s*set ([A-Za-z_$][\w$]*)\((\w+)(?:\s*:[^)]*)?\)\s*\{\s*\2\s*\?\s*this\.setAttribute\('([a-z0-9-]+)',\s*\2\)\s*:\s*this\.removeAttribute\('[a-z0-9-]+'\);?\s*\}\s*$/, 'str'],
  [/^\s*set ([A-Za-z_$][\w$]*)\((\w+)(?:\s*:[^)]*)?\)\s*\{\s*setOptionalAttr\(this,\s*'([a-z0-9-]+)',\s*\2\);?\s*\}\s*$/, 'vacio'],
  [/^\s*set ([A-Za-z_$][\w$]*)\((\w+)(?:\s*:[^)]*)?\)\s*\{\s*this\.setAttribute\('([a-z0-9-]+)',\s*(?:String\(\2\)|\2)\);?\s*\}\s*$/, 'vacio'],
];

/** Clases del texto: nombre, base y rango [inicio, fin) del cuerpo (por llaves equilibradas, sin entrar en cadenas). */
function clases(texto) {
  const out = [];
  const re = /\bclass\s+([A-Za-z_$][\w$]*)\s*(?:<[^{]*?>)?\s*extends\s+(withStyleAttrs\(\s*\w+\s*\)|[A-Za-z_$][\w$.]*)(?:<[^{]*>)?[^{]*\{/g;
  for (const m of texto.matchAll(re)) {
    const inicio = m.index + m[0].length;
    let prof = 1;
    let i = inicio;
    let cad = '';
    for (; i < texto.length && prof > 0; i++) {
      const c = texto[i];
      if (cad) {
        if (c === '\\') i++;
        else if (c === cad) cad = '';
        continue;
      }
      if (c === '"' || c === "'" || c === '`') cad = c;
      else if (c === '{') prof++;
      else if (c === '}') prof--;
    }
    out.push({ nombre: m[1], base: m[2].replace(/\s+/g, ''), baseInicio: m.index + m[0].indexOf(m[2], m[0].indexOf('extends')), baseTexto: m[2], inicio, fin: i - 1 });
  }
  return out;
}

function tipoDe(anotado, clase, defecto) {
  if (anotado) return anotado.trim();
  if (clase === 'bool') return 'boolean';
  if (defecto === 'null') return 'string | null';
  return 'string';
}

function convertirCuerpo(cuerpo, eol) {
  const lineas = cuerpo.split(/\r?\n/);
  const hechos = [];
  for (let k = 0; k < lineas.length; k++) {
    const g = RE_GET.exec(lineas[k]);
    if (!g) continue;
    const [, sangria, nombre, anotado, lectura, attr, op, valor] = g;
    const iSet = lineas.findIndex((l) => new RegExp(`^\\s*set ${nombre.replace(/\$/g, '\\$')}\\(`).test(l));
    if (iSet < 0) continue;
    const tipoSet = RE_SETS.map(([re, t]) => [re.exec(lineas[iSet]), t]).find(([m]) => m && m[3] === attr && m[1] === nombre);
    if (!tipoSet) continue;
    const t = tipoSet[1];
    const esBool = lectura === 'hasAttribute';
    if (esBool !== (t === 'bool') || (esBool && op)) continue;
    const opciones = [];
    if (attr !== kebab(nombre)) opciones.push(`attr: '${attr}'`);
    if (esBool) opciones.unshift(`type: 'bool'`);
    if (t === 'vacio') opciones.push('vacio: true');
    const defecto = esBool ? 'false' : (valor ?? 'null');
    if (!esBool && /^-?\d/.test(defecto)) continue; // número leído como texto: a mano (type: 'num')
    const tipo = tipoDe(anotado, t, defecto);
    const nula = defecto === 'null' && !/null/.test(tipo) ? `${tipo} | null` : tipo;
    lineas[k] = `${sangria}@prop(${opciones.length ? `{ ${opciones.join(', ')} }` : ''}) accessor ${nombre}: ${nula} = ${defecto};`;
    lineas[iSet] = null;
    hechos.push(attr);
  }
  return [lineas.filter((l) => l !== null).join(eol), hechos];
}

/** Quita de una lista literal `['a', 'b', …]` los atributos que pasaron a `@prop` (los suma `IswcReactive`). */
function sinAtributos(lista, attrs) {
  return lista
    .replace(/(['"])([a-z0-9-]+)\1\s*,?\s*/g, (todo, _c, a) => (attrs.has(a) ? '' : todo))
    .replace(/,\s*\]/, ']')
    .replace(/\[\s*,\s*/, '[');
}

/**
 * (5) Saca de los `static observed` del archivo (literal o `const X = [...]` al que apunten) los atributos que pasaron
 * a `@prop`: `IswcReactive` ya los suma a `observedAttributes` (guardián `reactivo` R4).
 */
function limpiarObserved(texto, attrs) {
  if (!attrs.size) return texto;
  const literal = /(static\s+(?:override\s+)?observed\s*(?::[^=]+)?=\s*)(\[[^\]]*\])/g;
  let out = texto.replace(literal, (_t, a, l) => a + sinAtributos(l, attrs));
  for (const ref of out.matchAll(/static\s+(?:override\s+)?observed\s*(?::[^=]+)?=\s*([A-Z_][A-Z0-9_]*)\b/g)) {
    const decl = new RegExp(`(const\\s+${ref[1]}\\b[^=]*=\\s*)(\\[[^\\]]*\\])`);
    out = out.replace(decl, (_t, a, l) => a + sinAtributos(l, attrs));
  }
  return out;
}

function asegurarImport(texto, nombres, eol) {
  const re = new RegExp(`import\\s*\\{([^}]*)\\}\\s*from\\s*'${ALIAS_REACTIVO.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&')}';`);
  const m = re.exec(texto);
  if (m) {
    const ya = m[1].split(',').map((s) => s.trim()).filter(Boolean);
    const todos = [...new Set([...ya, ...nombres])];
    return texto.replace(re, `import { ${todos.join(', ')} } from '${ALIAS_REACTIVO}';`);
  }
  const linea = `import { ${nombres.join(', ')} } from '${ALIAS_REACTIVO}';`;
  const ultimo = [...texto.matchAll(/^import[^\n]*\n/gm)].pop();
  if (!ultimo) return `${linea}${eol}${texto}`;
  const fin = ultimo.index + ultimo[0].length;
  return `${texto.slice(0, fin)}${linea}${eol}${texto.slice(fin)}`;
}

const informe = { archivos: 0, props: 0, clases: 0, saltadas: [] };
const reactivas = new Set(BASES_REACTIVAS);

for (const ruta of rutas.flatMap((r) => archivos(r))) {
  const original = readFileSync(ruta, 'utf8');
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  let texto = original;
  const usados = new Set();
  let n = 0;
  const convertidos = new Set();
  // De la última clase a la primera: los índices de las anteriores siguen valiendo.
  for (const c of clases(texto).reverse()) {
    const cuerpo = texto.slice(c.inicio, c.fin);
    let [nuevo, hechos] = convertirCuerpo(cuerpo, eol);
    const deFormulario = c.base === 'IswcFormControl' || c.base === 'withStyleAttrs(IswcFormControl)';
    if (deFormulario) nuevo = nuevo.replace(/setCustomState\(\s*this\.#?\w+\s*,\s*('[a-z0-9-]+')\s*,\s*/g, 'this.estado($1, ');
    if (!hechos.length && nuevo === cuerpo) continue;
    let base = c.baseTexto;
    if (hechos.length && MOLDE.has(c.base)) {
      base = c.base === 'IswcElement' ? 'IswcReactive' : 'withStyleAttrs(IswcReactive)';
      usados.add('IswcReactive');
    } else if (hechos.length && !reactivas.has(c.base)) {
      informe.saltadas.push(`${ruta}: ${c.nombre} extends ${c.base} (${hechos.length} props): la base va primero`);
      continue;
    }
    if (hechos.length) usados.add('prop');
    for (const a of hechos) convertidos.add(a);
    reactivas.add(c.nombre);
    texto = texto.slice(0, c.baseInicio) + base + texto.slice(c.baseInicio + c.baseTexto.length, c.inicio) + nuevo + texto.slice(c.fin);
    n += hechos.length;
    if (hechos.length) informe.clases++;
  }
  texto = limpiarObserved(texto, convertidos);
  if (texto === original) continue;
  if (usados.size) texto = asegurarImport(texto, [...usados], eol);
  informe.archivos++;
  informe.props += n;
  console.log(`${dry ? '[dry] ' : ''}${ruta}: ${n} props`);
  if (!dry) writeFileSync(ruta, texto);
}
console.log(`reactivo: ${informe.props} props en ${informe.clases} clases de ${informe.archivos} archivos`);
for (const s of informe.saltadas) console.log(`  saltada: ${s}`);
