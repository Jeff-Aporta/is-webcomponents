// OBSOLETO: nombre anterior de ISSyncEntregable.schemas.ts (vendorice ISSyncEntregable.schemas.ts).
/**
 * Contratos del sync comun `_experimental` -> `_entregable` (`sync-entregable.ts`).
 * W54: los tipos viven en *.schemas.ts.
 */

/**
 * `replace`: el destino queda IGUAL al origen (lo que sobra en el destino se
 * borra, salvo lo bloqueado). `push`: copia y actualiza desde el origen, nunca borra.
 */
export type AccionSync = 'replace' | 'push';

/** Modo de la corrida: `real` escribe (tras el gate); `check` reporta drift; `dry-run` muestra el plan. */
export type ModoSync = 'real' | 'check' | 'dry-run';

export interface EntradaSync {
  /** Ruta relativa al origen (archivo o carpeta). */
  desde: string;
  /** Ruta relativa al destino. Default: la misma que `desde`. */
  hacia?: string;
  accion: AccionSync;
  /** Globs (relativos a la entrada, `**` y `*`) que no viajan. */
  excluir?: string[];
  /**
   * Transforma el contenido de un archivo antes de compararlo y escribirlo
   * (p. ej. quitar comentarios). Devuelve el contenido nuevo, o `null` para
   * copiarlo tal cual. `rel` es relativo a la entrada.
   */
  transformar?: (rel: string, contenido: Uint8Array) => Uint8Array | null | Promise<Uint8Array | null>;
}

export interface GateSync {
  cmd: string;
  args: string[];
  env?: Record<string, string>;
  /** Directorio de trabajo. Default: el origen. */
  cwd?: string;
  /** `true` lo corre por shell (necesario para shims `.cmd` en Windows: npm, func). Default `false`. */
  shell?: boolean;
}

export interface CheckpointSync {
  /** Mensaje del commit en el ORIGEN (mirror). */
  mensaje: string;
  /** `true` hace push del origen tras el commit (nunca forzado). */
  push: boolean;
}

export interface ConfigSync {
  /** Raiz del mirror (`_experimental/<app>`). */
  origen: string;
  /** Raiz del entregable (`_entregable/<app>`). */
  destino: string;
  entradas: EntradaSync[];
  /** Globs relativos al destino que el sync NUNCA toca (ni borra ni escribe). */
  bloqueados?: string[];
  /** Comando que debe salir en 0 antes de escribir (solo en modo `real`). */
  gate?: GateSync;
  /** Antes del gate (validaciones: remotos, dependencias...). Lanzar aborta. */
  antes?: (ctx: CtxSync) => void | Promise<void>;
  /** Despues de escribir (merges especiales, estado...). */
  despues?: (ctx: CtxSync, resumen: ResumenSync) => void | Promise<void>;
  checkpoint?: CheckpointSync;
}

export interface CtxSync {
  modo: ModoSync;
  config: ConfigSync;
  log: (linea: string) => void;
}

export interface CambioSync {
  /** Relativo al destino. */
  ruta: string;
  tipo: 'crear' | 'actualizar' | 'borrar';
}

export interface ResumenEntrada {
  desde: string;
  hacia: string;
  accion: AccionSync;
  cambios: CambioSync[];
  iguales: number;
}

export interface ResumenSync {
  modo: ModoSync;
  entradas: ResumenEntrada[];
  /** Total de cambios (en `check`: drift). */
  cambios: number;
  checkpoint?: { commit: string | null; push: boolean | null; error?: string };
}
