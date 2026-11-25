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
import type { AutoloadEnsureTag, AutoloadObserver, AutoloadRaiz } from './schemas/loader.schemas.js';

/** Prefijo de los tags del kit; los plugins (`loadPlugin`) suman los suyos. */
const PREFIJO = 'iswc-';

/** ¿`tag` es de una familia observada? (`iswc-` más los prefijos de los plugins que se hayan cargado). */
const esObservado = (tag: string, prefijos: readonly string[]): boolean => tag.startsWith(PREFIJO) || prefijos.some((p) => tag.startsWith(p));

/** ¿El tag ya está registrado en el registro de custom elements? */
function definido(tag: string): boolean {
  return typeof customElements !== 'undefined' && Boolean(customElements.get(tag));
}

/** La raíz de trabajo: la que se pasa o el documento; `null` si no hay DOM. */
function raizDe(raiz: ParentNode | undefined): AutoloadRaiz | null {
  if (raiz) return raiz as AutoloadRaiz;
  return typeof document !== 'undefined' ? document : null;
}

/** Tags `iswc-*` sin definir que cuelgan de `raiz` (incluido `raiz` si es uno). */
function pendientes(raiz: AutoloadRaiz, prefijos: readonly string[] = []): string[] {
  const out = new Set<string>();
  if (raiz.nodeType === 1) {
    const el = raiz as Element;
    if (esObservado(el.localName, prefijos) && !definido(el.localName)) out.add(el.localName);
  }
  for (const el of raiz.querySelectorAll('*')) {
    if (esObservado(el.localName, prefijos) && !definido(el.localName)) out.add(el.localName);
  }
  return [...out].sort();
}

/**
 * Observa `raiz` (o el documento) y pide `ensure` de cada tag `iswc-*` sin definir que aparezca:
 * primero los que ya están en el árbol y luego los que se monten después. Entregar el tirador
 * `parar()` deja de observar.
 */
export function observar(raiz: ParentNode | undefined, ensure: AutoloadEnsureTag, prefijos: () => readonly string[] = () => []): AutoloadObserver {
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
    if (esObservado(el.localName, prefijos())) pedir(el.localName);
    for (const hijo of el.querySelectorAll('*')) {
      if (esObservado(hijo.localName, prefijos())) pedir(hijo.localName);
    }
  };
  for (const tag of pendientes(nodo, prefijos())) pedir(tag);
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
export function listos(raiz: ParentNode | undefined, prefijos: readonly string[] = []): boolean {
  const nodo = raizDe(raiz);
  if (!nodo) return true;
  return pendientes(nodo, prefijos).length === 0;
}
