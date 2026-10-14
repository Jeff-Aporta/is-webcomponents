/**
 * Contratos de `spa-state.ts`: estado de una SPA serializado en la URL
 * (`?s=<base64url de un JSON>`). W54: los tipos viven en *.schemas.ts.
 */

/** Estado de la vista: JSON plano (lo que viaja en `?s=`). */
export type EstadoSpa = Record<string, unknown>;

export interface OpcionesSpaState {
  /** Parámetro de la query. Default `s`. */
  param?: string;
  /** Espera antes de reescribir la URL tras un cambio que no es de vista. Default 300 ms. */
  debounceMs?: number;
  /** Tope por valor (longitud de cadena o del JSON); lo que lo supera no viaja en la URL. */
  maxValue?: number;
  /** Tope del base64 completo; si se supera tras recortar, la URL no se reescribe. */
  maxB64Len?: number;
  /** Clave que se marca en `history.state` (para distinguir entradas propias). */
  historyKey?: string | null;
  /** Estado inicial (sin `?s=`, en `reset` y `clearQuery`). */
  initial?: EstadoSpa | (() => EstadoSpa);
  /** Recorte propio de lo que viaja en la URL (por defecto, `maxValue`). */
  slimForUrl?: (estado: EstadoSpa) => EstadoSpa;
  /** Valida/normaliza lo leído de la URL (por defecto, cualquier objeto). */
  normalize?: (crudo: unknown, actual: EstadoSpa) => EstadoSpa;
  /** Combina un parcial con el estado (por defecto, spread). */
  merge?: (estado: EstadoSpa, parcial: EstadoSpa) => EstadoSpa;
  /** Identidad de la vista: si cambia, la URL entra al historial; si no, se reemplaza la entrada. */
  viewOf?: (estado: EstadoSpa) => string;
  /**
   * Enlaces SPA: los `<a>` de la misma página que solo cambian `?<param>=` navegan sin
   * recargar (incluso dentro de shadow DOM). Default true; `data-spa="off"` en un enlace lo excluye.
   */
  links?: boolean;
  /** Se llama una vez tras leer la URL al arrancar. */
  onInit?: (estado: EstadoSpa, api: SpaState) => void;
}

export interface SpaState {
  readonly PARAM: string;
  /** Copia del estado actual. */
  get(): EstadoSpa;
  /** Aplica un parcial; reescribe la URL (push si cambió la vista, replace si no) y notifica. */
  merge(parcial: EstadoSpa): EstadoSpa;
  /**
   * Reemplaza el estado completo (no mezcla): la navegación homogénea de la app.
   * Push si cambia la vista, replace si no (o el `modo` que se indique).
   */
  navigate(estado: EstadoSpa, modo?: 'push' | 'replace'): EstadoSpa;
  /** URL que tendría la app con ese parcial aplicado (para enlaces `href`). */
  hrefFor(parcial?: EstadoSpa): string;
  /** Vuelve al estado inicial conservando `?s=` coherente. */
  reset(): EstadoSpa;
  /** Vuelve al estado inicial y deja la URL sin query (la portada). */
  clearQuery(): EstadoSpa;
  /** Suscripción a cambios (incluye atrás/adelante del navegador). Devuelve la baja. */
  subscribe(fn: (estado: EstadoSpa) => void): () => void;
  /** Estado leído al arrancar. */
  boot: EstadoSpa;
  /** Quita los listeners del navegador (pruebas y desmontaje). */
  destroy(): void;
}
