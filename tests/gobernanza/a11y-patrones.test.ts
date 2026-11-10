// @contexto INDICE.md · tests/gobernanza/README.md
// a11y-patrones.test.ts — guardián estático de F8 hito 6 (specs/paridad-webawesome.md HOW-7): patrones ARIA en las
// plantillas de los componentes (`TEMPLATE.innerHTML = \`…\``, `.innerHTML = \`…\`` y literales `html\`…\``) y en
// `setAttribute('role' | 'aria-*', …)` / `.role = '…'` del código.
//   A1 rol válido: todo `role` literal es un rol concreto de ARIA 1.2.
//   A2 pares obligatorios: `tab` ⇒ `aria-selected`; `combobox` ⇒ `aria-expanded` + `aria-controls`; `dialog` y
//      `alertdialog` ⇒ `aria-labelledby` o `aria-label`, y `aria-modal`; `treeitem` con un `group` dentro ⇒
//      `aria-expanded`. El atributo vale en el elemento o puesto por el código del archivo (`setAttribute`).
//   A3 padre requerido: `option` dentro de `listbox` (o `group`), `menuitem*` dentro de `menu`/`menubar` (o `group`),
//      `treeitem` dentro de `tree` (o `group`). Si la plantilla es un fragmento sin ancestro con rol, el archivo debe
//      pintar ese padre en otra plantilla o con `setAttribute('role', …)`.
//   A4 `aria-*` válidos: el nombre existe en ARIA 1.2 y, con rol explícito, es global o admitido por ese rol; los
//      roles sin nombre (`generic`, `none`, `presentation`, `paragraph`…) no llevan `aria-label`/`aria-labelledby`.
// Trinquete por archivo con `a11y-patrones-pendientes.json` (como `reactivo-pendientes.json`): las faltas solo bajan; un
// archivo fuera de la lista tiene 0. Al bajar, la prueba reescribe el JSON con lo medido.
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { coleccionPruebas } from '../../src/vendor-distributions/shared/testing/pruebas.ts';

const { test, lista } = coleccionPruebas({ categoria: 'how' });

const KIT = join(import.meta.dirname!, '..', '..');
const COMPONENTES = join(KIT, 'src', 'components');
const PENDIENTES = join(import.meta.dirname!, 'a11y-patrones-pendientes.json');
/** Marca de una expresión `${…}` dentro de la plantilla. */
const EXPR = '\u0001';

/** Roles concretos (no abstractos) de WAI-ARIA 1.2. */
const ROLES = new Set(('alert alertdialog application article banner blockquote button caption cell checkbox code columnheader combobox ' +
  'complementary contentinfo definition deletion dialog directory document emphasis feed figure form generic grid gridcell group heading ' +
  'img insertion link list listbox listitem log main marquee math menu menubar menuitem menuitemcheckbox menuitemradio meter navigation ' +
  'none note option paragraph presentation progressbar radio radiogroup region row rowgroup rowheader scrollbar search searchbox separator ' +
  'slider spinbutton status strong subscript superscript switch tab table tablist tabpanel term textbox time timer toolbar tooltip tree ' +
  'treegrid treeitem').split(' '));

/** Estados y propiedades globales de ARIA 1.2 (con los cuatro que 1.2 desaconseja como globales pero siguen admitidos). */
const GLOBALES = new Set(('atomic busy controls current describedby details disabled dropeffect errormessage flowto grabbed haspopup hidden ' +
  'invalid keyshortcuts label labelledby live owns relevant roledescription').split(' ').map((a) => `aria-${a}`));

const RANGO = 'meter progressbar scrollbar separator slider spinbutton';
const POSICION = 'article comment listitem menuitem menuitemcheckbox menuitemradio option radio row tab treeitem';
/** Atributos no globales de ARIA 1.2 y los roles que los admiten (con la herencia ya resuelta). */
const POR_ROL: Record<string, string> = {
  'aria-activedescendant': 'application combobox grid group listbox menu menubar radiogroup row searchbox spinbutton tablist textbox toolbar tree treegrid',
  'aria-autocomplete': 'combobox searchbox textbox',
  'aria-checked': 'checkbox menuitemcheckbox menuitemradio option radio switch treeitem',
  'aria-colcount': 'grid table treegrid',
  'aria-colindex': 'cell columnheader gridcell row rowheader',
  'aria-colspan': 'cell columnheader gridcell rowheader',
  'aria-expanded': 'application button checkbox columnheader combobox gridcell link listbox menuitem menuitemcheckbox menuitemradio row rowheader switch tab treeitem',
  'aria-level': 'heading listitem row treeitem comment',
  'aria-modal': 'alertdialog dialog',
  'aria-multiline': 'searchbox textbox',
  'aria-multiselectable': 'grid listbox tablist tree treegrid',
  'aria-orientation': 'listbox menu menubar radiogroup scrollbar separator slider tablist toolbar tree treegrid',
  'aria-placeholder': 'searchbox textbox',
  'aria-posinset': POSICION,
  'aria-pressed': 'button',
  'aria-readonly': 'checkbox columnheader combobox grid gridcell listbox menuitemcheckbox menuitemradio radiogroup rowheader searchbox slider spinbutton switch textbox treegrid',
  'aria-required': 'checkbox columnheader combobox gridcell listbox radiogroup rowheader searchbox spinbutton switch textbox tree treegrid',
  'aria-rowcount': 'grid table treegrid',
  'aria-rowindex': 'cell columnheader gridcell row rowheader',
  'aria-rowspan': 'cell columnheader gridcell rowheader',
  'aria-selected': 'columnheader gridcell option row rowheader tab treeitem',
  'aria-setsize': POSICION,
  'aria-sort': 'columnheader rowheader',
  'aria-valuemax': RANGO,
  'aria-valuemin': RANGO,
  'aria-valuenow': RANGO,
  'aria-valuetext': RANGO,
};
const ARIA = new Set([...GLOBALES, ...Object.keys(POR_ROL)]);
/** Roles a los que ARIA 1.2 prohíbe poner nombre accesible. */
const SIN_NOMBRE = new Set('caption code deletion emphasis generic insertion none paragraph presentation strong subscript superscript'.split(' '));
/** Pares obligatorios: rol ⇒ grupos de atributos (basta uno de cada grupo). */
const PARES: Record<string, string[][]> = {
  tab: [['aria-selected']],
  combobox: [['aria-expanded'], ['aria-controls']],
  dialog: [['aria-labelledby', 'aria-label'], ['aria-modal']],
  alertdialog: [['aria-labelledby', 'aria-label'], ['aria-modal']],
};
/** Padre requerido: rol ⇒ roles de ancestro admitidos. */
const PADRES: Record<string, string[]> = {
  option: ['listbox', 'group'],
  menuitem: ['menu', 'menubar', 'group'],
  menuitemcheckbox: ['menu', 'menubar', 'group'],
  menuitemradio: ['menu', 'menubar', 'group'],
  treeitem: ['tree', 'group'],
};
const VACIOS = new Set('area base br col embed hr img input link meta param source track wbr'.split(' '));

type Nodo = { tag: string; attrs: Map<string, string>; padre: Nodo | null; hijos: Nodo[] };

const rel = (abs: string) => relative(KIT, abs).split(sep).join('/');

function fuentes(dir: string, out: string[] = []): string[] {
  for (const n of readdirSync(dir)) {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) fuentes(p, out);
    else if (n.endsWith('.ts') && !/\.(schemas|preview|selfcheck|test|d)\.ts$/.test(n)) out.push(p);
  }
  return out;
}

/** Literales de plantilla HTML del código: los de `innerHTML = ` y los etiquetados con `html`. Las `${…}` quedan como `EXPR`. */
function plantillas(codigo: string): string[] {
  const out: string[] = [];
  let i = 0;
  const previoSignificativo = (j: number): string => {
    let k = j - 1;
    while (k >= 0 && /\s/.test(codigo[k]!)) k--;
    return codigo[k] ?? '';
  };
  /** Lee un literal desde el backtick en `j`; devuelve su texto y el índice tras el cierre. */
  const literal = (j: number): [string, number] => {
    let texto = '';
    let k = j + 1;
    while (k < codigo.length && codigo[k] !== '`') {
      if (codigo[k] === '\\') { texto += codigo.slice(k, k + 2); k += 2; continue; }
      if (codigo[k] === '$' && codigo[k + 1] === '{') { k = expresion(k + 2); texto += EXPR; continue; }
      texto += codigo[k];
      k++;
    }
    return [texto, k + 1];
  };
  /** Salta una expresión `${…}` (con plantillas anidadas, que también se recogen) y devuelve el índice tras `}`. */
  const expresion = (j: number): number => {
    let nivel = 1;
    let k = j;
    while (k < codigo.length && nivel > 0) {
      const c = codigo[k]!;
      if (c === "'" || c === '"') { k = cadena(k); continue; }
      if (c === '`') { k = recoger(k); continue; }
      if (c === '{') nivel++;
      if (c === '}') nivel--;
      k++;
    }
    return k;
  };
  const cadena = (j: number): number => {
    const q = codigo[j];
    let k = j + 1;
    while (k < codigo.length && codigo[k] !== q && codigo[k] !== '\n') k += codigo[k] === '\\' ? 2 : 1;
    return k + 1;
  };
  /** Literal en `j`: si es HTML (tras `innerHTML =` o con la etiqueta `html`), lo guarda. */
  const recoger = (j: number): number => {
    const antes = codigo.slice(Math.max(0, j - 60), j).replace(/\/\*[\s\S]*?\*\/\s*$/, '');
    const esHtml = /\bhtml\s*$/.test(antes) || /\binnerHTML\s*[+]?=\s*$/.test(antes);
    const [texto, fin] = literal(j);
    if (esHtml) out.push(texto);
    return fin;
  };
  while (i < codigo.length) {
    const c = codigo[i]!;
    if (c === '/' && codigo[i + 1] === '/') { i = codigo.indexOf('\n', i); if (i < 0) break; continue; }
    if (c === '/' && codigo[i + 1] === '*') { const f = codigo.indexOf('*/', i + 2); i = f < 0 ? codigo.length : f + 2; continue; }
    if (c === "'" || c === '"') { i = cadena(i); continue; }
    if (c === '`') { i = recoger(i); continue; }
    if (c === '/' && /[(,=:[!&|?{};]|^$/.test(previoSignificativo(i))) {
      let k = i + 1;
      let clase = false;
      while (k < codigo.length && codigo[k] !== '\n' && (clase || codigo[k] !== '/')) {
        if (codigo[k] === '\\') k++;
        else if (codigo[k] === '[') clase = true;
        else if (codigo[k] === ']') clase = false;
        k++;
      }
      i = k + 1;
      continue;
    }
    i++;
  }
  return out;
}

/** Árbol de elementos de un fragmento HTML (tolerante: cierra lo que quede abierto). */
function arbol(html: string): Nodo[] {
  const raiz: Nodo = { tag: '#raiz', attrs: new Map(), padre: null, hijos: [] };
  const todos: Nodo[] = [];
  let actual = raiz;
  const sinComentarios = html.replace(/<!--[\s\S]*?-->/g, '');
  for (const m of sinComentarios.matchAll(/<(\/?)([a-zA-Z][\w-]*)((?:[^<>"']|"[^"]*"|'[^']*')*)>/g)) {
    const [, cierra, tagCrudo, resto] = m;
    const tag = tagCrudo!.toLowerCase();
    if (cierra) {
      let n: Nodo | null = actual;
      while (n && n.tag !== tag) n = n.padre;
      if (n?.padre) actual = n.padre;
      continue;
    }
    const attrs = new Map<string, string>();
    for (const a of resto!.matchAll(/([?.@]?[\w:-]+)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'>]+))?/g)) {
      const nombre = a[1]!;
      if (nombre.startsWith('.') || nombre.startsWith('@')) continue;
      attrs.set(nombre.replace(/^\?/, '').toLowerCase(), (a[2] ?? '').replace(/^["']|["']$/g, ''));
    }
    const nodo: Nodo = { tag, attrs, padre: actual, hijos: [] };
    actual.hijos.push(nodo);
    todos.push(nodo);
    if (!VACIOS.has(tag) && !/\/\s*$/.test(resto!)) actual = nodo;
  }
  return todos;
}

const rolDe = (n: Nodo): string | null => {
  const v = n.attrs.get('role');
  if (v == null || v.includes(EXPR)) return null;
  return v.trim().split(/\s+/)[0] ?? null;
};

/** `aria-*` que el código pone con `setAttribute`/`toggleAttribute`/`removeAttribute`. */
const ariaPuestos = (codigo: string) => [...codigo.matchAll(/\b(?:set|toggle|remove)Attribute\(\s*['"](aria-[a-z]+)['"]/g)].map((m) => m[1]!);

/** Código de las clases base del kit que el archivo importa y extiende (`extends ModalBase` → `utils/modal-base.ts`). */
function bases(codigo: string, ruta: string): string[] {
  const extendidas = new Set([...codigo.matchAll(/\bextends\s+(?:\w+\()?(\w+)/g)].map((m) => m[1]!));
  const out: string[] = [];
  for (const m of codigo.matchAll(/^import\s*\{([^}]*)\}\s*from\s*['"]([^'"]+)['"]/gm)) {
    if (!m[1]!.split(',').some((n) => extendidas.has(n.trim().split(/\s+as\s+/).pop()!))) continue;
    const espec = m[2]!;
    const destino = (espec.startsWith('.') ? join(ruta, '..', espec) : join(KIT, 'src', espec.replace(/^@jeff-aporta\/iswc-base\//, ''))).replace(/\.js$/, '.ts');
    if (destino.startsWith(COMPONENTES) && existsSync(destino)) out.push(readFileSync(destino, 'utf8'));
  }
  return out;
}

/** Faltas de un archivo de componente (`ruta` permite sumar lo que ponen sus clases base). */
function faltas(codigo: string, ruta = ''): string[] {
  const out: string[] = [];
  const nodos = plantillas(codigo).flatMap((p) => arbol(p));
  const puestos = new Set([...ariaPuestos(codigo), ...(ruta ? bases(codigo, ruta).flatMap(ariaPuestos) : [])]);
  const rolesCodigo = [...codigo.matchAll(/\bsetAttribute\(\s*['"]role['"]\s*,\s*['"]([a-z ]+)['"]/g), ...codigo.matchAll(/(?<!\bdataset)\.role\s*=\s*['"]([a-z ]+)['"]/g)].map((m) => m[1]!.trim().split(/\s+/)[0]!);
  const rolesArchivo = new Set([...nodos.map(rolDe).filter((r): r is string => !!r), ...rolesCodigo]);
  const tiene = (n: Nodo | null, a: string) => (n?.attrs.has(a) ?? false) || puestos.has(a);
  // A1 y A4 en plantillas.
  for (const n of nodos) {
    const crudo = n.attrs.get('role');
    const rol = rolDe(n);
    if (crudo != null && !crudo.includes(EXPR)) for (const r of crudo.trim().split(/\s+/)) if (!ROLES.has(r)) out.push(`A1 role="${r}" no es un rol de ARIA 1.2 (<${n.tag}>)`);
    for (const a of n.attrs.keys()) {
      if (!a.startsWith('aria-')) continue;
      if (!ARIA.has(a)) { out.push(`A4 ${a} no existe en ARIA 1.2 (<${n.tag}>)`); continue; }
      if (rol && ROLES.has(rol) && !GLOBALES.has(a) && !POR_ROL[a]!.split(' ').includes(rol)) out.push(`A4 ${a} no está admitido en role=${rol} (<${n.tag}>)`);
      if (rol && SIN_NOMBRE.has(rol) && (a === 'aria-label' || a === 'aria-labelledby')) out.push(`A4 role=${rol} no admite nombre (${a})`);
    }
    if (!rol) continue;
    // A2 pares.
    for (const grupo of PARES[rol] ?? []) if (!grupo.some((a) => tiene(n, a))) out.push(`A2 role=${rol} sin ${grupo.join(' ni ')} (<${n.tag}>)`);
    if (rol === 'treeitem' && hayDescendiente(n, 'group') && !tiene(n, 'aria-expanded')) out.push('A2 treeitem con group dentro sin aria-expanded');
    // A3 padre.
    const admitidos = PADRES[rol];
    if (!admitidos) continue;
    let p = n.padre;
    while (p && !rolDe(p)) p = p.padre;
    const padre = p ? rolDe(p) : null;
    if (padre ? !admitidos.includes(padre) : !admitidos.some((r) => rolesArchivo.has(r))) out.push(`A3 role=${rol} fuera de ${admitidos.join('|')}${padre ? ` (dentro de ${padre})` : ''}`);
  }
  // A1 y A2 de los roles puestos por código.
  for (const r of rolesCodigo) {
    if (!ROLES.has(r)) out.push(`A1 setAttribute('role', '${r}') no es un rol de ARIA 1.2`);
    for (const grupo of PARES[r] ?? []) if (!grupo.some((a) => puestos.has(a) || nodos.some((n) => n.attrs.has(a)))) out.push(`A2 role=${r} (por código) sin ${grupo.join(' ni ')}`);
  }
  for (const a of ariaPuestos(codigo)) if (!ARIA.has(a)) out.push(`A4 ${a} (por código) no existe en ARIA 1.2`);
  return out;
}

function hayDescendiente(n: Nodo, rol: string): boolean {
  return n.hijos.some((h) => rolDe(h) === rol || hayDescendiente(h, rol));
}

test('a11y-patrones: lector de plantillas (html``, innerHTML, ${…} anidados)', () => {
  const codigo = "const x = 1 / 2; T.innerHTML = /* html */ `<div role=\"tablist\"><b role=\"tab\" aria-selected=${s}></b></div>`; const y = html`<ul role=\"listbox\">${a.map((i) => html`<li role=\"option\">${i}</li>`)}</ul>`;";
  const ps = plantillas(codigo);
  assert.equal(ps.length, 3);
  assert.deepEqual(faltas(codigo), []);
  assert.deepEqual(faltas('el.innerHTML = `<div role="tab"></div><div role="dialog" aria-label="x"></div><i role="botón"></i>`;').map((f) => f.slice(0, 2)), ['A2', 'A2', 'A1']);
  assert.deepEqual(faltas('el.innerHTML = `<div role="tree"><div role="treeitem" aria-pressed="true"><div role="group"></div></div></div>`;').map((f) => f.slice(0, 2)), ['A4', 'A2']);
  assert.deepEqual(faltas('el.innerHTML = `<div role="menu"><div role="option"></div></div>`;').map((f) => f.slice(0, 2)), ['A3']);
});

test('a11y-patrones: A1–A4 por archivo (pendientes solo bajan)', () => {
  const previo = existsSync(PENDIENTES) ? (JSON.parse(readFileSync(PENDIENTES, 'utf8')) as Record<string, number>) : {};
  const detalle = Object.fromEntries(fuentes(COMPONENTES).map((p) => [rel(p), faltas(readFileSync(p, 'utf8'), p)]));
  const medido = Object.fromEntries(Object.entries(detalle).filter(([, f]) => f.length > 0).map(([r, f]) => [r, f.length] as const).sort(([a], [b]) => a.localeCompare(b)));
  const suben = Object.entries(medido).filter(([r, n]) => n > (previo[r] ?? 0)).map(([r, n]) => `${r}: ${n} (pendiente ${previo[r] ?? 0}) — ${detalle[r]!.join('; ')}`);
  assert.deepEqual(suben, [], 'patrón ARIA roto: mira la lista por familia en specs/paridad-webawesome.md HOW-7');
  if (JSON.stringify(medido) !== JSON.stringify(previo)) writeFileSync(PENDIENTES, `${JSON.stringify(medido, null, 2)}\n`, 'utf8');
  console.log(`  faltas ARIA pendientes: ${Object.values(medido).reduce((a, b) => a + b, 0)} en ${Object.keys(medido).length} archivos`);
});

export default lista();
