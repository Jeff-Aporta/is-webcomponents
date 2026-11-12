// @contexto INDICE.md · src/cdn/loader.md
/**
 * loader-autoload — capa 2 opcional del loader: observa el DOM y pide los tags `iswc-*` que
 * aparezcan sin estar definidos; y dice si los de una raíz ya lo están.
 *
 * Contrato (specs/paridad-webawesome.md, W3.1 y HOW-13):
 *   - `observar()`: hace `ensure` de cada `iswc-*` sin definir que aparezca (al empezar y en
 *     cada mutación del árbol observado).
 *   - `listos(raiz)`: el equivalente de `allDefined()`: `true` cuando ningún tag `iswc-*` sin
 *     definir cuelga de `raiz`.
 *
 * El módulo no importa el núcleo (sin ciclo): recibe `ensure` por argumento. El núcleo lo pide
 * con `import()` solo cuando alguien llama a `observar()` o `listos()`, así el loader no crece.
 */
import type { AutoloadObserver } from './schemas/loader.schemas.js';

/** Prefijo de los tags del kit. */
const PREFIJO = 'iswc-';

/** Pide un tag: resuelve `true` si el custom element quedó definido. */
type EnsureTag = (tag: string) => Promise<boolean>;

/** Raíz de DOM (document, element o fragment): un `ParentNode` que además es `Node`. */
type Raiz = ParentNode & Node;

/** ¿El tag ya está registrado en el registro de custom elements? */
function definido(tag: string): boolean {
  return typeof customElements !== 'undefined' && Boolean(customElements.get(tag));
}

/** La raíz de trabajo: la que se pasa o el documento; `null` si no hay DOM. */
function raizDe(raiz: ParentNode | undefined): Raiz | null {
  if (raiz) return raiz as Raiz;
  return typeof document !== 'undefined' ? document : null;
}

/** Tags `iswc-*` sin definir que cuelgan de `raiz` (incluido `raiz` si es uno). */
function pendientes(raiz: Raiz): string[] {
  const out = new Set<string>();
  if (raiz.nodeType === 1) {
    const el = raiz as Element;
    if (el.localName.startsWith(PREFIJO) && !definido(el.localName)) out.add(el.localName);
  }
  for (const el of raiz.querySelectorAll('*')) {
    if (el.localName.startsWith(PREFIJO) && !definido(el.localName)) out.add(el.localName);
  }
  return [...out].sort();
}

/**
 * Observa `raiz` (o el documento) y pide `ensure` de cada tag `iswc-*` sin definir que aparezca:
 * primero los que ya están en el árbol y luego los que se monten después. Entregar el tirador
 * `parar()` deja de observar.
 */
export function observar(raiz: ParentNode | undefined, ensure: EnsureTag): AutoloadObserver {
  const nodo = raizDe(raiz);
  if (!nodo || typeof MutationObserver === 'undefined') {
    return { parar() { /* sin DOM no hay nada que observar */ } };
  }
  const enVuelo = new Set<string>();
  const pedir = (tag: string): void => {
    if (enVuelo.has(tag) || definido(tag)) return;
    enVuelo.add(tag);
    void Promise.resolve()
      .then(() => ensure(tag))
      .catch(() => false)
      .finally(() => { enVuelo.delete(tag); });
  };
  const pedirDe = (nodo: Node): void => {
    if (nodo.nodeType !== 1) return;
    const el = nodo as Element;
    if (el.localName.startsWith(PREFIJO)) pedir(el.localName);
    for (const hijo of el.querySelectorAll('*')) {
      if (hijo.localName.startsWith(PREFIJO)) pedir(hijo.localName);
    }
  };
  for (const tag of pendientes(nodo)) pedir(tag);
  const observador = new MutationObserver((mutaciones) => {
    for (const mutacion of mutaciones) {
      for (const anadido of mutacion.addedNodes) pedirDe(anadido);
    }
  });
  observador.observe(nodo, { childList: true, subtree: true });
  return { parar() { observador.disconnect(); } };
}

/**
 * `true` si todos los tags `iswc-*` que cuelgan de `raiz` (o del documento) ya están definidos:
 * el equivalente de `allDefined()`.
 */
export function listos(raiz: ParentNode | undefined): boolean {
  const nodo = raizDe(raiz);
  if (!nodo) return true;
  return pendientes(nodo).length === 0;
}
