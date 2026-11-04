/**
 * molde-iswc-element.mjs — Lleva los componentes de `src/components` al molde `IswcElement` (plan F2, D4/D6).
 *
 *   deno run -A --no-check scripts/codemods/molde-iswc-element.mjs [--dry-run] [--categoria=<carpeta>]
 *
 * Caso común que entiende (idempotente: un archivo ya migrado no cambia):
 *   extends ElementBase | HTMLElement | withStyleAttrs(HTMLElement)  → extends IswcElement | withStyleAttrs(IswcElement)
 *   static TEMPLATE / __TEMPLATE = X                                   → static template = X
 *   static get observedAttributes() { return EXPR; }                   → static observed = EXPR;  (sin ...styleAttrNames)
 *   this.attachShadow(OPTS) en el constructor                          → this.shadowRoot! + static shadowInit = OPTS
 *   this.attachShadow(OPTS) fuera del constructor                      → this.initShadow(OPTS) + static shadowInit = null
 *   this.initShadow() / initShadow(OPTS) como sentencia del constructor → se borra (+ static shadowInit = OPTS)
 *   clase sin shadow propio (extendía ElementBase/HTMLElement)         → static shadowInit = null (light DOM)
 *   adoptCss(X, import.meta.url);                                      → se borra; static css = css + import css from 'iswc:css'
 *   defineElement('iswc-x', IswcX[, global])                           → static tag = 'iswc-x' + define(IswcX[, global])
 *   import '@jeff-aporta/iswc-base/components/<c>/<hoja>.js';          → static deps = ['iswc-<hoja>'] (solo hojas de LEAVES)
 *
 * Lo que no entiende lo deja igual y lo lista (`MANUAL`): se migra a mano. Cada archivo reescrito se valida con
 * `esbuild.transform`; si no compila se descarta el cambio y va a la lista.
 */
import { readdirSync, readFileSync, statSync, writeFileSync, existsSync } from 'node:fs';
import { basename, join, relative, sep, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { transform } from 'esbuild';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const COMPONENTES = join(RAIZ, 'src', 'components');
const SECO = process.argv.includes('--dry-run');
const CATEGORIA = (process.argv.find((a) => a.startsWith('--categoria=')) ?? '').slice('--categoria='.length);
const MOLDE = '@jeff-aporta/iswc-base/core/iswc-element.js';

/**
 * Hijos «hoja» que el padre solo pinta (atributos y slots, ninguna API síncrona): su import de efecto pasa a
 * `static deps`. El resto (inputs, selects, diálogos, menús…) se queda como import: el padre lee `.value`, llama
 * `.show()`, etc. justo después de crearlos y eso exige la clase definida ya.
 */
const LEAVES = new Set(['icon', 'button', 'spinner', 'tag', 'divider', 'callout', 'empty-state', 'avatar', 'figure', 'skeleton', 'copy-button', 'badge']);

/* ───────────────────────────── escáner de llaves ───────────────────────────── */

/**
 * Si en `i` empieza un comentario, cadena, plantilla o literal regex, devuelve la posición de su último carácter;
 * si no, -1. El regex se reconoce por el token anterior (operador, `(`, `,`, `return`…), como hace un lexer.
 */
function saltar(s, i) {
  const c = s[i];
  if (c === '/' && s[i + 1] === '/') { const f = s.indexOf('\n', i); return f < 0 ? s.length : f; }
  if (c === '/' && s[i + 1] === '*') { const f = s.indexOf('*/', i + 2); return f < 0 ? s.length : f + 1; }
  if (c === '"' || c === "'") return finCadena(s, i, c);
  if (c === '`') return finPlantilla(s, i);
  if (c === '/') {
    let k = i - 1;
    while (k >= 0 && /\s/.test(s[k])) k--;
    const previo = k >= 0 ? s[k] : '';
    const palabra = /(?:return|typeof|case|of|in|=>)$/.test(s.slice(Math.max(0, k - 6), k + 1));
    if (previo === '' || /[(,=:[!&|?{};+\-*%<>~^]/.test(previo) || palabra) {
      let enClase = false;
      for (let j = i + 1; j < s.length; j++) {
        const d = s[j];
        if (d === '\\') { j++; continue; }
        if (d === '\n') return -1;
        if (d === '[') enClase = true;
        else if (d === ']') enClase = false;
        else if (d === '/' && !enClase) { while (/[a-z]/i.test(s[j + 1] ?? '')) j++; return j; }
      }
    }
  }
  return -1;
}

/** Posición del cierre que empareja `abre` en `pos` (`{`, `(`, `[`), saltando cadenas, plantillas, regex y comentarios. */
function cierre(s, pos) {
  const pares = { '{': '}', '(': ')', '[': ']' };
  const pila = [];
  for (let i = pos; i < s.length; i++) {
    const c = s[i];
    const f = saltar(s, i);
    if (f >= 0) { i = f; continue; }
    if (c in pares) { pila.push(pares[c]); continue; }
    if (c === '}' || c === ')' || c === ']') {
      if (pila.pop() !== c) return -1;
      if (pila.length === 0) return i;
    }
  }
  return -1;
}

function finCadena(s, i, q) {
  for (let j = i + 1; j < s.length; j++) {
    if (s[j] === '\\') { j++; continue; }
    if (s[j] === q || s[j] === '\n') return j;
  }
  return s.length;
}

function finPlantilla(s, i) {
  for (let j = i + 1; j < s.length; j++) {
    if (s[j] === '\\') { j++; continue; }
    if (s[j] === '`') return j;
    if (s[j] === '$' && s[j + 1] === '{') { const f = cierre(s, j + 1); if (f < 0) return s.length; j = f; }
  }
  return s.length;
}

/** Rangos `[ini, fin)` de los miembros de profundidad 0 de un cuerpo de clase que empiezan con `re`. */
function miembros(cuerpo, re) {
  const out = [];
  let prof = 0;
  for (let i = 0; i < cuerpo.length; i++) {
    const c = cuerpo[i];
    const f = saltar(cuerpo, i);
    if (f >= 0) { i = f; continue; }
    if (c === '{' || c === '(' || c === '[') { prof++; continue; }
    if (c === '}' || c === ')' || c === ']') { prof--; continue; }
    if (prof === 0 && (i === 0 || /[\s;}]/.test(cuerpo[i - 1]))) {
      const m = re.exec(cuerpo.slice(i, i + 300));
      if (m && m.index === 0) out.push({ ini: i, m });
    }
  }
  return out;
}

/* ───────────────────────────── clases del archivo ──────────────────────────── */

const RE_CLASE = /\bclass\s+([A-Za-z_$][\w$]*)?\s*(?:<[^{]*?>)?\s*extends\s+(withStyleAttrs\(\s*(?:HTMLElement|IswcElement|ElementBase)\s*\)|[A-Za-z_$][\w$.]*)(?:<[^{]*?>)?\s*(?:implements\s+[^{]+)?\{/g;

function clases(s) {
  const out = [];
  RE_CLASE.lastIndex = 0;
  for (let m; (m = RE_CLASE.exec(s));) {
    const abre = m.index + m[0].length - 1;
    const fin = cierre(s, abre);
    if (fin < 0) continue;
    out.push({ nombre: m[1] ?? null, base: m[2].replace(/\s+/g, ''), ini: m.index, abre, fin });
  }
  return out;
}

const BASES_MOLDE = new Set(['ElementBase', 'HTMLElement', 'withStyleAttrs(HTMLElement)', 'withStyleAttrs(ElementBase)']);

/* ───────────────────────────────── migración ───────────────────────────────── */

const normOpts = (t) => t.replace(/\s+/g, '').replace(/"/g, "'").replace(/,}/, '}');

const RE_ADOPT = /^[ \t]*adoptCss\(\s*[^,()]+(?:\(\))?!?\s*,\s*import\.meta\.url\s*\);[^\n]*\n/gm;

const sinImports = (s) => s.replace(/^import\b[^;]*;/gm, '');

/** ¿`pos` está directamente en el bloque que abre en `abre` (sin llaves intermedias)? */
function directo(s, abre, pos) {
  let prof = 0;
  for (let i = abre + 1; i < pos; i++) {
    const c = s[i];
    const f = saltar(s, i);
    if (f >= 0) { i = f; continue; }
    if (c === '{') prof++;
    if (c === '}') prof--;
  }
  return prof === 0;
}

function migrar(original, archivo) {
  const eol = original.includes('\r\n') ? '\r\n' : '\n';
  let s = original.replace(/\r\n/g, '\n');
  const notas = [];
  const manual = [];

  // Registros: defineElement('iswc-x', Clase[, global]).
  const registros = new Map();
  for (const m of s.matchAll(/\bdefineElement\(\s*(?:(['"])(iswc-[a-z0-9-]+)\1|([A-Z_][A-Z0-9_]*))\s*,\s*([A-Za-z_$][\w$]*)(?:\s+as\s+unknown\s+as\s+CustomElementConstructor)?\s*(?:,\s*([^)]+?))?\s*\)/g)) {
    // Tag en una constante: `const TAG = 'iswc-x';` en el mismo archivo.
    const tag = m[2] ?? (new RegExp(`\\bconst\\s+${m[3]}\\s*=\\s*['"](iswc-[a-z0-9-]+)['"]`).exec(s) ?? [])[1];
    if (tag) registros.set(m[4], { tag, global: m[5]?.trim() ?? null, texto: m[0] });
  }
  if (/\bdefineElement\(/.test(s.replace(/import[^;]*;/g, '')) && registros.size === 0) manual.push('defineElement sin tag literal o con clase no declarada');

  // adoptCss: solo el caso `adoptCss(x, import.meta.url);` como sentencia propia.
  const adopciones = [...s.matchAll(RE_ADOPT)];
  const llamadas = (sinImports(s).replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '').match(/\badoptCss\(/g) ?? []).length;
  if (llamadas !== adopciones.length) manual.push('adoptCss con URL distinta de import.meta.url o fuera de una sentencia propia');

  // Deps: imports de efecto a componentes hoja.
  const deps = [];
  let agregoCss = false;
  const conClases = clases(s);
  const migrables = conClases.filter((c) => BASES_MOLDE.has(c.base) || registros.has(c.nombre ?? ''));
  if (registros.size > 0) {
    s = s.replace(/^import '@jeff-aporta\/iswc-base\/components\/[a-z-]+\/([a-z0-9-]+)\.js';[^\n]*\n/gm, (linea, hoja) => {
      if (!LEAVES.has(hoja)) return linea;
      deps.push(`iswc-${hoja}`);
      return '';
    });
  }

  // Reescritura por clase, de la última a la primera (las posiciones de las anteriores no cambian).
  const actuales = clases(s).sort((a, b) => b.ini - a.ini);
  const tieneAdopt = adopciones.length > 0;
  for (const c of actuales) {
    const debe = BASES_MOLDE.has(c.base) || registros.has(c.nombre ?? '');
    if (!debe) continue;
    let cuerpo = s.slice(c.abre + 1, c.fin);
    const estaticos = [];
    const lineaClase = s.lastIndexOf('\n', c.ini) + 1;
    const sangria = (/^[ \t]*/.exec(s.slice(lineaClase, c.ini)) ?? [''])[0] + '  ';

    // 1. template
    cuerpo = cuerpo.replace(/\bstatic\s+(?:override\s+)?(?:TEMPLATE|__TEMPLATE)\s*=/g, 'static template =');

    // 2. observedAttributes → observed
    for (const { ini, m } of miembros(cuerpo, /static\s+(?:override\s+)?get\s+observedAttributes\s*\(\s*\)\s*(?::\s*[^{]+)?\{/).reverse()) {
      const abre = ini + m[0].length - 1;
      const fin = cierre(cuerpo, abre);
      const dentro = cuerpo.slice(abre + 1, fin).replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '').trim();
      const r = /^return\s+([\s\S]+?);?$/.exec(dentro);
      if (!r || /\breturn\b/.test(r[1]) || /;\s*\S/.test(r[1])) { manual.push(`${c.nombre}: observedAttributes no es un solo return`); continue; }
      let expr = r[1].trim()
        .replace(/,?\s*\.\.\.\s*(?:this|super|[A-Z][\w$]*)\.styleAttrNames\s*/g, '')
        .replace(/\b(super|[A-Z][\w$]*)\.observedAttributes\b/g, '$1.observed')
        .replace(/\[\s*,/, '[');
      // TDZ: una constante MAYÚSCULA declarada después de la clase no existe al evaluar el campo estático.
      for (const id of new Set(expr.match(/\b[A-Z_][A-Z0-9_]{2,}\b/g) ?? [])) {
        const decl = new RegExp(`\\b(?:const|let|var)\\s+${id}\\b`).exec(s);
        if (decl && decl.index > c.ini) manual.push(`${c.nombre}: ${id} se declara después de la clase`);
      }
      cuerpo = `${cuerpo.slice(0, ini)}static observed = ${expr};${cuerpo.slice(fin + 1)}`;
    }

    // 3. shadow
    const ctor = miembros(cuerpo, /constructor\s*\(/)[0];
    let ctorIni = -1;
    let ctorFin = -1;
    if (ctor) {
      const par = cierre(cuerpo, ctor.ini + ctor.m[0].length - 1);
      ctorIni = cuerpo.indexOf('{', par);
      ctorFin = cierre(cuerpo, ctorIni);
    }
    const eraPlana = BASES_MOLDE.has(c.base);
    let shadowInit = undefined;
    let creaShadow = false;
    // initShadow como sentencia directa del constructor: lo hace el molde.
    cuerpo = cuerpo.replace(/^([ \t]*)this\.initShadow\(([^)]*)\);[^\n]*\n/gm, (linea, _sp, args, off) => {
      creaShadow = true;
      if (!(off > ctorIni && off < ctorFin && directo(cuerpo, ctorIni, off))) { shadowInit = null; return linea; }
      shadowInit = args.trim() || "{ mode: 'open' }";
      return '';
    });
    // attachShadow
    const ataques = [...cuerpo.matchAll(/this\.attachShadow\(/g)];
    for (const a of ataques.reverse()) {
      const abre = a.index + 'this.attachShadow'.length;
      const fin = cierre(cuerpo, abre);
      const opts = cuerpo.slice(abre + 1, fin).trim();
      creaShadow = true;
      const enCtor = a.index > ctorIni && a.index < ctorFin && directo(cuerpo, ctorIni, a.index);
      const antes = enCtor ? cuerpo.slice(ctorIni, a.index) : '';
      const previo = cuerpo.slice(Math.max(0, a.index - 40), a.index);
      if (enCtor && !/shadowRoot/.test(antes.replace(/this\.shadowRoot\s*(?:\?\?|\|\|)\s*$/, ''))) {
        const cerrado = /mode\s*:\s*['"]closed['"]/.test(opts);
        const reemplazo = cerrado ? 'this.shadow!' : 'this.shadowRoot!';
        let ini = a.index;
        const coalesce = /this\.shadowRoot\s*(?:\?\?|\|\|)\s*$/.exec(previo);
        if (coalesce) ini = a.index - coalesce[0].length;
        cuerpo = `${cuerpo.slice(0, ini)}${reemplazo}${cuerpo.slice(fin + 1)}`;
        // Con base plana el molde ya abre `{ mode: 'open' }`; sobre otra base (que puede tener null) se declara.
        if (normOpts(opts) !== "{mode:'open'}" || !(eraPlana || c.base === 'PropsElement')) shadowInit = opts;
      } else {
        cuerpo = `${cuerpo.slice(0, a.index)}this.initShadow(${opts})${cuerpo.slice(fin + 1)}`;
        shadowInit = null;
      }
    }
    // Una sentencia `this.shadowRoot!;` suelta (era `this.attachShadow(...)` sin asignar) sobra.
    cuerpo = cuerpo.replace(/^[ \t]*this\.shadow(?:Root)?!;[^\n]*\n/gm, '');

    // 4. adoptCss
    if (tieneAdopt) {
      const antes = cuerpo;
      cuerpo = cuerpo.replace(/^[ \t]*adoptCss\(\s*[^,()]+(?:\(\))?!?\s*,\s*import\.meta\.url\s*\);[^\n]*\n/gm, '');
      if (antes !== cuerpo && !/\bstatic\s+css\s*=/.test(cuerpo)) { estaticos.push('static css = css;'); agregoCss = true; }
    }

    // 5. base
    let base = c.base;
    if (base === 'ElementBase' || base === 'HTMLElement') base = 'IswcElement';
    if (base.startsWith('withStyleAttrs(')) base = 'withStyleAttrs(IswcElement)';
    if (eraPlana && !creaShadow && !/\bstatic\s+shadowInit\b/.test(cuerpo)) shadowInit = null;
    if (shadowInit === "{ mode: 'open' }" && eraPlana) shadowInit = undefined;
    if (estaticos.includes('static css = css;') && !creaShadow && shadowInit === null) manual.push(`${c.nombre}: adopta CSS pero no crea shadow en la clase`);

    // 6. estáticos al principio del cuerpo
    const reg = registros.get(c.nombre ?? '');
    if (reg && !/\bstatic\s+tag\s*=/.test(cuerpo)) estaticos.unshift(`static tag = '${reg.tag}';`);
    if (shadowInit !== undefined && !/\bstatic\s+shadowInit\b/.test(cuerpo)) {
      estaticos.push(`static shadowInit: ShadowRootInit | null = ${shadowInit === null ? 'null' : shadowInit};`);
    }
    // Las deps van en la clase principal: la del tag que nombra el archivo (`button.ts` → `iswc-button`).
    const principal = reg && (reg.tag === `iswc-${basename(archivo, '.ts')}` || registros.size === 1);
    if (principal && deps.length && !/\bstatic\s+deps\s*=/.test(cuerpo)) {
      estaticos.push(`static deps = [${deps.map((d) => `'${d}'`).join(', ')}];`);
      // Una clase que pisa connectedCallback sin llamar al molde no pediría sus deps.
      const cc = miembros(cuerpo, /connectedCallback\s*\(\s*\)\s*(?::\s*void\s*)?\{/)[0];
      if (cc && eraPlana && c.base !== 'ElementBase') {
        const abre = cc.ini + cc.m[0].length - 1;
        const fin = cierre(cuerpo, abre);
        if (!/super\.connectedCallback/.test(cuerpo.slice(abre, fin))) {
          const sang = (/\n([ \t]*)\S/.exec(cuerpo.slice(abre)) ?? ['', sangria + '  '])[1];
          cuerpo = `${cuerpo.slice(0, abre + 1)}\n${sang}super.connectedCallback();${cuerpo.slice(abre + 1)}`;
          notas.push(`${c.nombre}: super.connectedCallback() para pedir deps`);
        }
      }
    }
    if (eraPlana && c.base !== 'ElementBase' && /\bonConnected\s*\(\s*\)\s*(?::\s*void\s*)?\{/.test(cuerpo) && /super\.connectedCallback/.test(cuerpo)) {
      manual.push(`${c.nombre}: define onConnected y además llama super.connectedCallback() (doble llamada)`);
    }

    // Constructor vacío: sobra.
    cuerpo = cuerpo.replace(/\n[ \t]*constructor\s*\(\s*\)\s*\{\s*super\(\);\s*\}[ \t]*\n/, '\n');

    const cabecera = s.slice(c.ini, c.abre + 1).replace(c.base === base ? /$^/ : new RegExp(`extends\\s+${c.base.replace(/[()]/g, '\\$&')}`), `extends ${base}`);
    const bloque = estaticos.length ? `\n${estaticos.map((e) => sangria + e).join('\n')}` : '';
    s = `${s.slice(0, c.ini)}${cabecera}${bloque}${cuerpo}${s.slice(c.fin)}`;
  }

  // Registros → define(Clase[, global]).
  for (const [clase, r] of registros) {
    if (!clases(s).some((c) => c.nombre === clase)) { manual.push(`defineElement(${r.tag}) con clase no declarada en el archivo`); continue; }
    s = s.replace(r.texto, `define(${clase}${r.global ? `, ${r.global}` : ''})`);
  }

  // Imports.
  const codigo = sinImports(s).replace(/\/\*[\s\S]*?\*\/|(^|[^:'"`])\/\/[^\n]*/g, '$1');
  const usa = (id) => new RegExp(`\\b${id}\\b`).test(codigo);
  s = s.replace(/^import\s*\{([^}]*)\}\s*from\s*'([^']*core\/element\.js)';\n/m, (linea, nombres, ruta) => {
    const quedan = nombres.split(',').map((n) => n.trim()).filter(Boolean).filter((n) => usa(n.split(/\s+as\s+/).pop()));
    return quedan.length ? `import { ${quedan.join(', ')} } from '${ruta}';\n` : '';
  });
  s = s.replace(/^import\s*\{\s*ElementBase\s*\}\s*from\s*'[^']*core\/element-base\.js';\n/m, (linea) => (usa('ElementBase') ? linea : ''));
  const nuevos = [];
  const quiere = [];
  if (/extends\s+(?:withStyleAttrs\()?IswcElement\b/.test(codigo) && !/import\s*\{[^}]*\bIswcElement\b[^}]*\}\s*from\s*'[^']*iswc-element\.js'/.test(s)) quiere.push('IswcElement');
  if (/\bdefine\([A-Z]/.test(codigo) && !/import\s*\{[^}]*\bdefine\b[^}]*\}\s*from\s*'[^']*iswc-element\.js'/.test(s)) quiere.push('define');
  if (quiere.length) nuevos.push(`import { ${quiere.join(', ')} } from '${MOLDE}';`);
  if (agregoCss && !/import css from 'iswc:css';/.test(s)) nuevos.push(`import css from 'iswc:css';`);
  if (nuevos.length) {
    const ultimo = [...s.matchAll(/^import\b[^;]*;[^\n]*\n/gm)].at(-1);
    const pos = ultimo ? ultimo.index + ultimo[0].length : 0;
    s = `${s.slice(0, pos)}${nuevos.join('\n')}\n${s.slice(pos)}`;
  }

  if (deps.length) notas.push(`deps: ${deps.join(', ')}`);
  return { texto: s.replace(/\n/g, eol), notas, manual };
}

/* ───────────────────────────────── recorrido ───────────────────────────────── */

function archivos(dir, out = []) {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) { if (n !== 'schemas') archivos(p, out); continue; }
    if (n.endsWith('.ts') && !n.endsWith('.d.ts') && !/\.(schemas|preview|selfcheck|test)\./.test(n)) out.push(p);
  }
  return out;
}

/** No son componentes del kit: `helpers/ui.ts` es la fábrica `crearComponente` para tags de las apps consumidoras. */
const EXCLUIDOS = new Set(['src/components/helpers/ui.ts']);

const raizCat = CATEGORIA ? join(COMPONENTES, CATEGORIA) : COMPONENTES;
if (!existsSync(raizCat)) { console.error(`no existe ${raizCat}`); process.exit(2); }
let cambiados = 0;
const pendientes = [];
for (const archivo of archivos(raizCat)) {
  const original = readFileSync(archivo, 'utf8');
  const registra = /\bdefineElement\(|customElements\.define\(|\bdefine\([A-Z]/.test(original);
  const extiende = /\bclass\s+\w*\s*(?:<[^{]*?>)?\s*extends\s+(?:HTMLElement|ElementBase|withStyleAttrs\(HTMLElement\))\b/.test(original);
  if (!registra && !extiende) continue;
  const rel = relative(RAIZ, archivo).split(sep).join('/');
  if (EXCLUIDOS.has(rel)) continue;
  let r;
  try { r = migrar(original, archivo); } catch (e) { pendientes.push(`${rel}: error ${e.message}`); continue; }
  if (r.texto !== original) {
    try {
      await transform(r.texto, { loader: 'ts', format: 'esm', target: 'es2022' });
    } catch (e) {
      pendientes.push(`${rel}: no compila tras migrar (${String(e.message).split('\n')[1] ?? e.message})`);
      continue;
    }
    cambiados++;
    if (!SECO) writeFileSync(archivo, r.texto);
    console.log(`${SECO ? '[seco] ' : ''}migrado ${rel}${r.notas.length ? `  (${r.notas.join('; ')})` : ''}`);
  }
  for (const m of r.manual) pendientes.push(`${rel}: ${m}`);
}
console.log(`\n${cambiados} archivos ${SECO ? 'se migrarían' : 'migrados'}.`);
if (pendientes.length) {
  console.log(`\nMANUAL (${pendientes.length}):`);
  for (const p of pendientes) console.log(`  ${p}`);
}
