/** Contratos de `iswc-storage.ts` (W54: los tipos viven en *.schemas.ts). */

/** Almacén del navegador donde el kit persiste: `localStorage` o `sessionStorage`. */
export type AreaIswc = 'local' | 'session';

/** Resultado de `clearIswcStorage()`: llaves `iswc:` borradas y cachés en memoria vaciadas. */
export interface LimpiezaIswc {
  /** Llaves borradas de localStorage (con su prefijo `iswc:`). */
  local: string[];
  /** Llaves borradas de sessionStorage (con su prefijo `iswc:`). */
  session: string[];
  /** Cuántas cachés en memoria registradas (`registerMemoryCache`) se vaciaron. */
  memorias: number;
}

/** Migración de una llave del formato viejo a `iswc:`. */
export interface MigracionIswc {
  desde: string;
  hacia: string;
  /** `false` si la llave nueva ya existía: se conserva la nueva y solo se borra la vieja. */
  copiada: boolean;
}

/** Estado global compartido por todas las copias del módulo (cada bundle puede traer la suya). */
export interface GlobalIswcStorage {
  __iswcMemoryCaches?: Set<() => void>;
  __iswcStorageMigrated?: boolean;
  localStorage?: Storage;
  sessionStorage?: Storage;
}
