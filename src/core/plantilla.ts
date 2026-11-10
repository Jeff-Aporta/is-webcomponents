// @contexto INDICE.md · src/core/README.md
/**
 * plantilla.ts — Plantilla `html` con diff por parte para `render()` de `IswcReactive` (F8; separada del molde para que
 * las clases que no pintan con `render()` no la carguen).
 *
 *   import { html, repetir, svg } from '@jeff-aporta/iswc-base/core/plantilla.js';
 *   render() { return html`<p ?hidden=${!this.label}>${this.label}</p>`; }
 *
 * Se prepara UNA vez por literal (marcadores + recorrido) y después solo se tocan las partes cuyo valor cambió. Partes:
 * hijo `${x}` (texto, `html`, lista, `repetir()`, null), atributo `a=${x}` (null/false lo quita), booleano `?a=${x}`,
 * propiedad `.p=${x}` y evento `@e=${fn}` (con `this` = el componente). No se admiten valores parciales de atributo
 * (`class="a ${x}"`: usar `class=${`a ${x}`}`) ni marcadores dentro de `<textarea>`, `<title>` o `<style>` (usar
 * `.value=${x}`). `svg\`…\`` parsea un fragmento suelto en el espacio SVG. Importar este módulo registra su `render`
 * como pintor de `IswcReactive`.
 */
import { registrarPintor } from './iswc-reactive.js';
import type { DescParte, Instancia, ParteViva, Preparada, Repeticion, Resultado, TipoParte } from './schemas/plantilla.schemas.js';


/** Plantilla HTML: `render()` la devuelve y el molde la pinta con diff por parte. */
export const html = (s: TemplateStringsArray, ...v: unknown[]): Resultado => ({ s, v, svg: false });

/** Fragmento SVG suelto (sin `<svg>` envolvente en el literal). */
export const svg = (s: TemplateStringsArray, ...v: unknown[]): Resultado => ({ s, v, svg: true });

/** Lista con clave: los ítems que se mueven conservan su DOM (foco, estado de los controles). */
export function repetir<T>(items: readonly T[], clave: (item: T, i: number) => unknown, plantilla: (item: T, i: number) => Resultado): Repeticion {
  return { repetir: true, items, clave: clave as Repeticion['clave'], plantilla: plantilla as Repeticion['plantilla'] };
}

const PREPARADAS = new WeakMap<TemplateStringsArray, Preparada>();
const VIVAS = new WeakMap<Node, Instancia>();
/** Fin de un trozo en posición de atributo: `nombre=`, `nombre="`, `?nombre=`, `.nombre=`, `@nombre=`. */
const EN_ATRIBUTO = /([.?@]?)([\w:-]+)=(["']?)$/;
const TEXTO_CRUDO = /<(textarea|title|style|script)\b[^>]*>[^<]*$/i;

const esResultado = (v: unknown): v is Resultado => !!v && typeof v === 'object' && 's' in v && 'v' in v;
const esRepeticion = (v: unknown): v is Repeticion => !!v && typeof v === 'object' && (v as Repeticion).repetir === true;

/** Construye el HTML con marcadores y localiza las partes una sola vez por literal. */
function preparar(r: Resultado): Preparada {
  const s = r.s;
  let fuente = '';
  let comilla = '';
  const atributos = new Map<number, DescParte>();
  for (let i = 0; i < s.length; i++) {
    let trozo = s[i] ?? '';
    if (comilla && trozo.startsWith(comilla)) trozo = trozo.slice(1);
    comilla = '';
    if (i === s.length - 1) {
      fuente += trozo;
      break;
    }
    const hasta = fuente + trozo;
    const enEtiqueta = hasta.lastIndexOf('<') > hasta.lastIndexOf('>');
    const m = enEtiqueta ? EN_ATRIBUTO.exec(trozo) : null;
    if (enEtiqueta && !m) throw new Error(`html: atributo parcial «${trozo.slice(-20)}»`);
    if (!enEtiqueta && TEXTO_CRUDO.test(hasta)) throw new Error('html: valor en texto crudo');
    if (m) {
      fuente += `${trozo.slice(0, -m[0].length)} isw-${i}=""`;
      comilla = m[3] ?? '';
      atributos.set(i, { i, nodo: -1, tipo: (m[1] || 'a') as TipoParte, nombre: m[2] ?? '' });
    } else {
      fuente += `${trozo}<!--isw-${i}-->`;
    }
  }
  const t = document.createElement('template');
  if (r.svg) {
    t.innerHTML = `<svg>${fuente}</svg>`;
    const raiz = t.content.firstChild as Element;
    t.content.replaceChildren(...raiz.childNodes);
  } else t.innerHTML = fuente;
  const partes: DescParte[] = [];
  const w = document.createTreeWalker(t.content, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT);
  let n = 0;
  for (let nodo = w.nextNode(); nodo; nodo = w.nextNode(), n++) {
    if (nodo.nodeType === Node.COMMENT_NODE) {
      const dato = (nodo as Comment).data;
      if (dato.startsWith('isw-')) partes.push({ i: Number(dato.slice(4)), nodo: n, tipo: 'h', nombre: '' });
      continue;
    }
    const el = nodo as Element;
    for (const a of [...el.attributes]) {
      if (!a.name.startsWith('isw-')) continue;
      const d = atributos.get(Number(a.name.slice(4)));
      if (d) partes.push({ ...d, nodo: n });
      el.removeAttribute(a.name);
    }
  }
  partes.sort((a, b) => a.i - b.i);
  const prep = { t, partes };
  PREPARADAS.set(s, prep);
  return prep;
}

/** Clona la plantilla dentro de un rango [inicio, fin] y aplica los valores. Devuelve la instancia y su fragmento. */
function instanciar(r: Resultado, host: unknown): [Instancia, DocumentFragment] {
  const prep = PREPARADAS.get(r.s) ?? preparar(r);
  const frag = prep.t.content.cloneNode(true) as DocumentFragment;
  const w = document.createTreeWalker(frag, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_COMMENT);
  const nodos: Node[] = [];
  for (let nodo = w.nextNode(); nodo; nodo = w.nextNode()) nodos.push(nodo);
  const partes: ParteViva[] = prep.partes.map((d) => ({ d, el: nodos[d.nodo]!, ultimo: undefined, texto: null, sub: null, lista: null, claves: null, host }));
  const inicio = document.createComment('');
  const fin = document.createComment('');
  frag.prepend(inicio);
  frag.append(fin);
  const inst: Instancia = { s: r.s, inicio, fin, partes };
  aplicar(inst, r.v);
  return [inst, frag];
}

/** Nodos del rango de una instancia, marcadores incluidos. */
function rango(inst: Instancia): Node[] {
  const out: Node[] = [];
  for (let n: Node | null = inst.inicio; n; n = n.nextSibling) {
    out.push(n);
    if (n === inst.fin) break;
  }
  return out;
}

function quitarRango(inst: Instancia | null): void {
  if (inst) for (const n of rango(inst)) (n as ChildNode).remove();
}

/** Mueve el rango de `inst` delante de `antes` (si no está ya ahí). */
function moverRango(inst: Instancia, antes: Node): void {
  if (inst.fin.nextSibling === antes) return;
  const padre = antes.parentNode;
  if (!padre) return;
  for (const n of rango(inst)) padre.insertBefore(n, antes);
}

/** Vacía una parte hija (texto, plantilla o listas). */
function vaciarHijo(p: ParteViva): void {
  p.texto?.remove();
  p.texto = null;
  quitarRango(p.sub);
  p.sub = null;
  for (const i of p.lista ?? []) quitarRango(i);
  p.lista = null;
  p.claves = null;
}

function hijoPlantilla(p: ParteViva, r: Resultado): void {
  if (p.sub && p.sub.s === r.s) {
    aplicar(p.sub, r.v);
    return;
  }
  vaciarHijo(p);
  const [inst, frag] = instanciar(r, p.host);
  p.el.parentNode?.insertBefore(frag, p.el);
  p.sub = inst;
}

/** Lista por índice: reutiliza la instancia de la misma posición si es del mismo literal. */
function hijoLista(p: ParteViva, items: readonly unknown[]): void {
  if (!p.lista) vaciarHijo(p);
  const previas = p.lista ?? [];
  const siguientes: Instancia[] = [];
  items.forEach((item, k) => {
    const r = esResultado(item) ? item : html`${item}`;
    const ya = previas[k];
    if (ya && ya.s === r.s) {
      aplicar(ya, r.v);
      siguientes.push(ya);
      return;
    }
    quitarRango(ya ?? null);
    const [inst, frag] = instanciar(r, p.host);
    const antes = previas[k + 1]?.inicio ?? p.el;
    antes.parentNode?.insertBefore(frag, antes);
    siguientes.push(inst);
  });
  for (const sobra of previas.slice(items.length)) quitarRango(sobra);
  p.lista = siguientes;
}

/** Lista con clave: conserva y reordena los rangos existentes. */
function hijoRepetir(p: ParteViva, rep: Repeticion): void {
  if (!p.claves) vaciarHijo(p);
  const previas = p.claves ?? new Map<unknown, Instancia>();
  const siguientes = new Map<unknown, Instancia>();
  const orden: Instancia[] = [];
  rep.items.forEach((item, k) => {
    const clave = rep.clave(item, k);
    const r = rep.plantilla(item, k);
    let inst = previas.get(clave);
    if (inst && inst.s !== r.s) {
      quitarRango(inst);
      inst = undefined;
    }
    if (inst) aplicar(inst, r.v);
    else {
      const [nueva, frag] = instanciar(r, p.host);
      p.el.parentNode?.insertBefore(frag, p.el);
      inst = nueva;
    }
    previas.delete(clave);
    siguientes.set(clave, inst);
    orden.push(inst);
  });
  for (const sobra of previas.values()) quitarRango(sobra);
  for (let k = orden.length - 1, antes: Node = p.el; k >= 0; k--) {
    moverRango(orden[k]!, antes);
    antes = orden[k]!.inicio;
  }
  p.claves = siguientes;
}

function hijoTexto(p: ParteViva, v: unknown): void {
  const texto = v == null || v === false ? '' : String(v);
  if (p.texto) {
    if (p.texto.data !== texto) p.texto.data = texto;
    return;
  }
  vaciarHijo(p);
  p.texto = document.createTextNode(texto);
  p.el.parentNode?.insertBefore(p.texto, p.el);
}

function hijo(p: ParteViva, v: unknown): void {
  if (esResultado(v)) hijoPlantilla(p, v);
  else if (esRepeticion(v)) hijoRepetir(p, v);
  else if (Array.isArray(v)) hijoLista(p, v);
  else if (v instanceof Node) {
    vaciarHijo(p);
    p.el.parentNode?.insertBefore(v, p.el);
  } else hijoTexto(p, v);
}

/** Aplica los valores a las partes que cambiaron. Las plantillas y listas hijas siempre se revisan por dentro. */
function aplicar(inst: Instancia, valores: readonly unknown[]): void {
  for (const p of inst.partes) {
    const v = valores[p.d.i];
    const compuesto = p.d.tipo === 'h' && v !== null && typeof v === 'object';
    if (!compuesto && p.ultimo !== undefined && Object.is(v, p.ultimo)) continue;
    const el = p.el as Element & Record<string, unknown>;
    const { tipo, nombre } = p.d;
    if (tipo === 'h') hijo(p, v);
    else if (tipo === '?') el.toggleAttribute(nombre, !!v);
    else if (tipo === '.') el[nombre] = v;
    else if (tipo === '@') {
      if (p.ultimo === undefined) el.addEventListener(nombre, (e) => (p.ultimo as ((e: Event) => void) | null)?.call(p.host, e));
    } else if (v == null || v === false) el.removeAttribute(nombre);
    else {
      const texto = String(v);
      if (el.getAttribute(nombre) !== texto) el.setAttribute(nombre, texto);
    }
    p.ultimo = tipo === '@' ? (v ?? null) : v;
  }
}

/**
 * Pinta `r` dentro de `raiz` (al final de lo que ya tenga). La primera vez clona; las siguientes solo tocan las partes
 * que cambiaron. Un literal distinto reemplaza el rango anterior. `host` es el `this` de los `@evento`.
 */
export function render(r: Resultado | null, raiz: Element | ShadowRoot | DocumentFragment, host: unknown = raiz): void {
  const viva = VIVAS.get(raiz);
  if (r && viva && viva.s === r.s && viva.inicio.parentNode === raiz) {
    aplicar(viva, r.v);
    return;
  }
  quitarRango(viva ?? null);
  VIVAS.delete(raiz);
  if (!r) return;
  const [inst, frag] = instanciar(r, host);
  raiz.appendChild(frag);
  VIVAS.set(raiz, inst);
}


registrarPintor(render);
