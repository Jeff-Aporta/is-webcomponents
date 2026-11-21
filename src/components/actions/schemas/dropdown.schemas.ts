// @contexto INDICE.md · src/components/actions/README.md
/**
 * dropdown.ts — tipos extraídos de este módulo.
 *
 * W54: los tipos viven aquí.
 */

/**
 * `<iswc-dropdown-item>`: el elemento del item con la API que consume
 * `<iswc-dropdown>`.
 *
 * No se importa su clase: crearía una dependencia circular (el item ya
 * importa cosas de aquí) y el bundle los trata como módulos externos.
 * Declarar solo lo que se usa es además lo que documenta el acoplamiento
 * real entre los dos.
 *
 * Al ser un HTMLElement de verdad, `querySelector<DropdownItemEl>` y el
 * type guard del slot funcionan sin casts.
 */
export interface DropdownItemEl extends HTMLElement {
  /** Item deshabilitado: el dropdown lo salta al navegar con flechas. */
  disabled?: boolean;
  /** Rol del item dentro del menú. */
  type?: string;
  /** Cierra el submenú propio del item (si lo tiene). */
  closeSubmenu?: () => void;
}

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type DropdownEventos = { 'iswc-show': undefined; 'iswc-after-show': undefined; 'iswc-hide': undefined; 'iswc-after-hide': undefined; 'iswc-select': { item: DropdownItemEl } };
