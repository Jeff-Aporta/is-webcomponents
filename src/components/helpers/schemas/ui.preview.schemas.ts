// @contexto INDICE.md · src/components/helpers/README.md
/**
 * ui.preview.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
/**
 * API que `helpers/ui.ts` expone en globalThis (`IswcUi` / `Ui`): la
 * plantilla `html`, el escapador `esc`, `define` y `css`.
 */
export type IswcUiApi = {
  html: (strings: TemplateStringsArray, ...values: unknown[]) => DocumentFragment;
  esc: (s: unknown) => string;
  define: (tag: string, clase: CustomElementConstructor) => void;
  css: (shadow: ShadowRoot, cssText: string) => void;
};

