/**
 * md-hydrate.ts — contratos de la carga perezosa de los componentes que pinta el markdown.
 */
import { z } from "zod";

/** Lo que md-hydrate usa del loader del kit (`globalThis.ISWebComponentsLoader`). */
export const LoaderLikeSchema = z.object({
  ensure: z.function({ input: [z.string()], output: z.promise(z.boolean()) }),
});
export type LoaderLike = z.infer<typeof LoaderLikeSchema>;

/** Un elemento del árbol pintado (basta su nombre de tag). */
export interface NodoMd { readonly localName: string }

/** El árbol pintado: un ShadowRoot o Element lo cumple. */
export interface RaizMd<N extends NodoMd = Element> {
  querySelector(selectors: string): N | null;
  querySelectorAll(selectors: string): Iterable<N>;
}

/** Vigila nodos y avisa cuando uno se acerca a la pantalla. */
export interface VigiaMd<N extends NodoMd = Element> {
  observar(nodo: N): void;
  dejar(nodo: N): void;
  cancelar(): void;
}

/** Crea el vigía; `null` si el entorno no puede vigilar (entonces se carga de una vez). */
export type CrearVigiaMd<N extends NodoMd = Element> = (alVer: (nodo: N) => void) => VigiaMd<N> | null;

/** Hidratación en curso de un render: lo pedido al pintar y la vigilancia de lo que espera a verse. */
export interface HidratacionMd {
  /** Tags pedidos al pintar; resuelve cuando el loader los entrega (los de "en vista" no esperan). */
  listo: Promise<string[]>;
  /** Tags que esperan a entrar en pantalla. */
  enEspera: readonly string[];
  /** Deja de vigilar (nuevo render o el host salió del DOM). */
  cancelar(): void;
}
