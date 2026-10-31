/**
 * anatomia.ts — sección «Anatomía» de todo demo: lo que el componente construye de verdad, para auditarlo.
 *   - Estructura: el shadow DOM vivo del `target`, sin `<style>`: los fragmentos de HTML que inyecta.
 *   - Consume: los componentes que usa esa estructura.
 *   - SCSS: la fuente de sus estilos, junto a su `.json` (`resolverAnatomia`); `bundle-scripts.mjs` la publica en dist/previews.
 * Todo sale del componente montado: el JSON no repite nada, así que no se desactualiza. El presentador es el mismo
 * `<iswc-code>` del snippet «Ver código».
 */
import { ZAnatomia, type Anatomia } from './schemas/anatomia.schemas.js';

export type DefinicionConAnatomia = {
  tag: string;
  anatomy?: Anatomia | undefined;
  sections?: Array<{ blocks?: Array<{ target?: string | undefined }> | undefined }> | undefined;
};

const MAX_LINEAS = 400;
const IGNORADOS = new Set(['style', 'link', 'script']);
const ESPERA_MS = 500;

/**
 * `scss` va relativo al `.json` que la declara (`kanban.scss` en un subcomponente). Sin `anatomy` es el `.scss` hermano;
 * `"anatomy": {}` dice que no tiene estilos propios y la galería no los pide.
 */
export function resolverAnatomia(anatomia: Anatomia | undefined, json: string | URL): Anatomia {
  if (anatomia && !anatomia.scss) return anatomia;
  const url = new URL(json);
  const hermano = (url.pathname.split('/').pop() ?? '').replace(/.json$/, '.scss');
  return { scss: new URL(anatomia?.scss ?? hermano, url).href };
}

/** Serializa un nodo con sangría; no entra en la sombra de los hijos: cada uno tiene su anatomía. */
function lineasDe(nodo: Node, nivel: number, out: string[]): void {
  const sangria = '  '.repeat(nivel);
  if (nodo.nodeType === Node.TEXT_NODE) {
    const texto = nodo.textContent?.trim();
    if (texto) out.push(`${sangria}${texto.length > 80 ? `${texto.slice(0, 80)}…` : texto}`);
    return;
  }
  if (nodo.nodeType !== Node.ELEMENT_NODE) return;
  const el = nodo as Element;
  const tag = el.localName;
  if (IGNORADOS.has(tag)) return;
  const attrs = [...el.attributes].filter((a) => a.name !== 'style' && !a.name.startsWith('data-size') && !a.name.startsWith('data-sz')).map((a) => (a.value ? ` ${a.name}="${a.value.length > 60 ? `${a.value.slice(0, 60)}…` : a.value}"` : ` ${a.name}`)).join('');
  const hijos = [...el.childNodes].filter((n) => n.nodeType === Node.ELEMENT_NODE || n.textContent?.trim());
  if (!hijos.length) {
    out.push(`${sangria}<${tag}${attrs}></${tag}>`);
    return;
  }
  out.push(`${sangria}<${tag}${attrs}>`);
  for (const h of hijos) lineasDe(h, nivel + 1, out);
  out.push(`${sangria}</${tag}>`);
}

/** HTML legible de la estructura que construye un componente. */
export function estructuraDe(host: Element): string {
  const out: string[] = [];
  for (const n of (host.shadowRoot ?? host).childNodes) lineasDe(n, 0, out);
  return out.length > MAX_LINEAS ? [...out.slice(0, MAX_LINEAS), `… ${out.length - MAX_LINEAS} líneas más`].join('\n') : out.join('\n');
}

/** Componentes que usa su estructura, sin repetir. */
export function consumeDe(host: Element): string[] {
  const raiz = host.shadowRoot ?? host;
  return [...new Set([...raiz.querySelectorAll('*')].map((e) => e.localName).filter((t) => t.includes('-')))].sort();
}

function bloqueCodigo(valor: string, lang: string): HTMLElement {
  const code = document.createElement('iswc-code');
  code.className = 'code demo-code-pop__pre iswc-code-view';
  for (const a of ['readonly', 'compact', 'wrap']) code.setAttribute(a, '');
  code.setAttribute('line-numbers', 'false');
  code.setAttribute('lang', lang);
  code.dataset['forceCm'] = '1';
  code.dataset['src'] = valor;
  code.dataset['cmSource'] = valor;
  code.setAttribute('value', valor);
  return code;
}

function pestana(grupo: HTMLElement, nombre: string, rotulo: string, contenido: Node): void {
  const tab = document.createElement('iswc-tab');
  tab.slot = 'nav';
  tab.setAttribute('panel', nombre);
  tab.textContent = rotulo;
  const panel = document.createElement('iswc-tab-panel');
  panel.setAttribute('name', nombre);
  panel.append(contenido);
  grupo.append(tab, panel);
}

/** El componente vivo del primer bloque demo que lo apunta; si no, el primero con ese tag. */
function hostDe(def: DefinicionConAnatomia, main: ParentNode): Element | null {
  for (const s of def.sections ?? []) {
    for (const b of s.blocks ?? []) {
      const el = b.target ? main.querySelector(b.target) : null;
      if (el) return el;
    }
  }
  return main.querySelector(def.tag);
}

async function scssDe(anatomia: Anatomia | undefined): Promise<string> {
  const r = ZAnatomia.safeParse(anatomia ?? {});
  if (!r.success || !r.data.scss) return '';
  try {
    const res = await fetch(r.data.scss);
    return res.ok ? await res.text() : '';
  } catch {
    return '';
  }
}

/** Agrega la sección al final del demo cuando el componente ya pintó. */
export function montarAnatomia(def: DefinicionConAnatomia, main: HTMLElement): void {
  main.querySelector('#anatomia')?.remove();
  setTimeout(async () => {
    const host = hostDe(def, main);
    if (!host || !main.isConnected) return;
    const consume = consumeDe(host);
    const scss = await scssDe(def.anatomy);
    if (!main.isConnected || main.querySelector('#anatomia')) return;
    const seccion = document.createElement('iswc-demo-section');
    seccion.className = 'section';
    seccion.id = 'anatomia';
    const titulo = document.createElement('h2');
    titulo.slot = 'title';
    titulo.textContent = 'Anatomía';
    const lede = document.createElement('div');
    lede.className = 'lede';
    lede.slot = 'lede';
    lede.textContent = 'La estructura que construye, lo que consume y sus estilos.';
    const grupo = document.createElement('iswc-tab-group');
    grupo.setAttribute('active', 'estructura');
    pestana(grupo, 'estructura', 'Estructura', bloqueCodigo(estructuraDe(host) || 'Sin estructura propia: pinta sus hijos.', 'html'));
    const lista = document.createElement('div');
    if (consume.length) lista.append(bloqueCodigo(consume.map((t) => `<${t}>`).join('\n'), 'html'));
    else lista.textContent = 'No consume otros componentes.';
    pestana(grupo, 'consume', `Consume (${consume.length})`, lista);
    if (scss) pestana(grupo, 'scss', 'SCSS', bloqueCodigo(scss, 'css'));
    seccion.append(titulo, lede, grupo);
    main.append(seccion);
  }, ESPERA_MS);
}
