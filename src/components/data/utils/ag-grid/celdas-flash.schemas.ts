// @contexto INDICE.md · src/components/data/README.md
/** Tipos de flash.ts. */

export type Reloj = () => number;

export type Programar = (fn: () => void, ms: number) => unknown;

export type Cancelar = (id: unknown) => void;

export type Alcance = { filas: Set<string> | null; columnas: Set<string> | null; flash: number; fade: number; desde: number; direccion?: 'up' | 'down' };

export type Vencimiento = (alcance: { filas: string[] | null; columnas: string[] | null }) => void;

export type OpcionesDestello = { reloj?: Reloj; programar?: Programar; cancelar?: Cancelar; alVencer?: Vencimiento };
