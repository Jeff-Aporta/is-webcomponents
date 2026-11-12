// @contexto INDICE.md · src/components/layout/README.md
/**
 * preview-component.ts — tipos extraídos de este módulo.
 *
 * W54: los tipos viven aquí. `DrawerEl` describe el `<iswc-drawer>` real
 * (un HTMLElement con la API pública de ModalBase), no un objeto plano:
 * el consumidor lo mete en el DOM (append / setAttribute) y le escucha
 * eventos, así que el tipo tiene que ser un elemento de verdad.
 */

/**
 * `<iswc-drawer>`: el elemento del drawer con la API pública de ModalBase.
 *
 * `show()`/`hide()` son opcionales porque el consumidor siempre los invoca
 * con `?.`: un drawer sin esos métodos sigue siendo un HTMLElement válido
 * (y el código cae al `setAttribute('open','')` de siempre).
 */
export interface DrawerEl extends HTMLElement {
  show?: () => void;
  hide?: () => void;
}

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type PreviewComponentEventos = { 'iswc-preview-ready': { tag: string } };
