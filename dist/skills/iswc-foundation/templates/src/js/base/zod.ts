/**
 * zod.ts — el ÚNICO módulo que importa el paquete `zod`. Los schemas importan `z` de aquí.
 * El build lo empaqueta con zod dentro (el navegador no resuelve `import "zod"`).
 */
import { z } from 'zod';

export { z };

/** Atributos HTML globales: nunca se avisan como «no identificados». */
const HTML_GLOBAL = new Set([
  'id', 'class', 'style', 'slot', 'part', 'title', 'hidden', 'lang', 'dir', 'role', 'tabindex', 'accesskey',
  'draggable', 'contenteditable', 'spellcheck', 'translate', 'inputmode', 'popover', 'inert', 'autofocus',
  'exportparts', 'is', 'name',
]);

/** Claves declaradas en el shape de un `z.object`. */
export const clavesDe = (esquema: { shape: object }): ReadonlySet<string> => new Set(Object.keys(esquema.shape));

/** Avisa por consola cada clave de `valor` fuera de `claves`. No lanza: la pieza no falla por ello. */
export function avisarPropsNoIdentificadas(tag: string, claves: ReadonlySet<string>, valor: object): void {
  for (const k of Object.keys(valor)) if (!claves.has(k)) console.warn(`[${tag}] prop no identificada: "${k}"`);
}

let vigilando = false;
/**
 * Vigila (una vez por documento) atributos de los tags de la app que no están en `observedAttributes`,
 * ni son `data-*`/`aria-*`/globales: los avisa por consola.
 */
export function instalarVigilanciaAtributos(prefijo: string): void {
  if (vigilando || typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
  vigilando = true;
  const revisar = (el: Element) => {
    const tag = el.localName;
    if (!tag.startsWith(`${prefijo}-`)) return;
    const observados = (customElements.get(tag) as { observedAttributes?: string[] } | undefined)?.observedAttributes ?? [];
    for (const a of el.getAttributeNames()) {
      if (HTML_GLOBAL.has(a) || a.startsWith('data-') || a.startsWith('aria-') || observados.includes(a)) continue;
      console.warn(`[${tag}] atributo no identificado: "${a}"`);
    }
  };
  new MutationObserver((cambios) => {
    for (const c of cambios) {
      if (c.type === 'attributes' && c.target instanceof Element) revisar(c.target);
      for (const n of c.addedNodes) if (n instanceof Element) revisar(n);
    }
  }).observe(document.documentElement, { subtree: true, childList: true, attributes: true });
}
