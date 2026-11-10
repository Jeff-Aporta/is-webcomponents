// @contexto INDICE.md · scripts/README.md
// eventos.schemas.ts — tipos de la sonda de eventos tipados (`eventos.ts`, specs/paridad-webawesome.md HOW-6).
// category: "how"

/** Un evento documentado: nombre, tipo de `detail` (texto del `.schemas.ts`) y si se puede vetar. */
export type EventoFicha = { name: string; detail: string; cancelable: boolean };

/** Lo que la sonda saca de una clase: su tag, el tipo de `declare static events`, sus eventos resueltos y, de los heredados, el tipo base que los escribe. */
export type ClaseConEventos = { tag: string | null; tipo: string; eventos: EventoFicha[]; herencia: Record<string, string> };

/** Lo que la sonda saca de un archivo de componente. */
export type ArchivoEventos = { ruta: string; emitidos: Map<string, boolean>; literales: Set<string>; propios: Set<string>; clases: ClaseConEventos[] };
