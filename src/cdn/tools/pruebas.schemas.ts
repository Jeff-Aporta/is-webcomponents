/**
 * Contratos del sistema comun de pruebas (`pruebas.ts`), compartido por las
 * apps del kit (ISS en Node, ISW en Deno). W54: los tipos viven en *.schemas.ts.
 *
 * Convencion de las apps: TODAS las pruebas viven en una carpeta `tests/`; cada
 * archivo `*.test.ts` exporta por defecto su LISTA de pruebas (como un patch
 * exporta su lista de operaciones). El runner recorre la carpeta, importa cada
 * archivo y corre sus pruebas una por una, con cooldown, en orden.
 */

/** `what` = contrato observable (caja negra); `how` = detalle de implementacion. */
export type CategoriaPrueba = 'what' | 'how';

/**
 * `error` = una falla pone la bateria en rojo. `aviso` = una falla se reporta
 * como advertencia y NUNCA pone rojo (p. ej. prod va desfasado hasta el swap).
 */
export type NivelPrueba = 'error' | 'aviso';

/** Herramientas que recibe cada prueba. */
export interface CtxPrueba {
  /** Registra una comprobacion; la prueba falla al final si alguna fue falsa. */
  expect(etiqueta: string, ok: unknown, detalle?: string): void;
  /** `expect` por igualdad JSON. */
  eq(etiqueta: string, actual: unknown, esperado: unknown): void;
  /** Anota un aviso visible en el reporte, sin fallar. */
  aviso(mensaje: string): void;
  /** Linea de diagnostico (sale en el reporte). */
  diag(mensaje: string): void;
  /** Termina la prueba como SALTADA con su motivo (p. ej. falta un requisito del entorno). */
  saltar(motivo: string): never;
  /** Se aborta al vencer el `timeoutMs`. */
  signal: AbortSignal;
}

export interface OpcionesPrueba {
  categoria?: CategoriaPrueba;
  /** Default 30 s. */
  timeoutMs?: number;
  /** Default `error`. */
  nivel?: NivelPrueba;
  /** Si trae texto, la prueba se salta con ese motivo. */
  saltar?: string;
}

export interface Prueba extends OpcionesPrueba {
  /** Id unico de la prueba en TODA la corrida (tambien es su llave de cooldown). */
  nombre: string;
  correr(ctx: CtxPrueba): unknown;
}

/** Preparacion y limpieza de un archivo (p. ej. abrir y cerrar un navegador). */
export interface HooksPruebas {
  /** Antes de la primera prueba del archivo que de verdad corre (no si todas estan en cooldown). */
  antes?: () => void | Promise<void>;
  /** Despues de la ultima, si `antes` corrio. */
  despues?: () => void | Promise<void>;
}

/** Lista de pruebas de un archivo, con sus hooks opcionales. */
export type ListaPruebas = Prueba[] & { hooks?: HooksPruebas };

export interface ResultadoPrueba {
  archivo: string;
  nombre: string;
  ok: boolean;
  nivel: NivelPrueba;
  categoria: CategoriaPrueba | null;
  durationMs: number;
  saltada?: string;
  cooldown?: string;
  error?: string;
  avisos: string[];
  diag: string[];
}

export interface ReportePruebas {
  kind: 'iswc.pruebas';
  version: 2;
  resumen: { total: number; ok: number; rojos: number; avisos: number; saltadas: number; cooldown: number; durationMs: number };
  resultados: ResultadoPrueba[];
}

export interface OpcionesCorrida {
  /** Archivos `*.test.ts` (rutas absolutas), en el orden en que corren. */
  archivos: string[];
  /** Raiz del proyecto (rutas del reporte relativas a ella). */
  raiz: string;
  /** Solo pruebas cuyo nombre contenga alguno de estos textos (sin distinguir mayusculas). */
  solo?: string[];
  categoria?: CategoriaPrueba;
  /** Desactiva el cooldown (corre todo y no registra). */
  sinCooldown?: boolean;
  /** Ruta del JSON de cooldown. Default `.tmp/test-cooldown.json` de la raiz. */
  cooldownDb?: string;
  /** Importador inyectable (tests del runner y adaptadores). Default `import(url)`. */
  importar?: (url: string) => Promise<unknown>;
  log?: (linea: string) => void;
  /**
   * Corre cada archivo en su propio proceso (uno tras otro): los archivos que
   * instalan globales (DOM, localStorage, fetch) no se pisan. La carga, los ids
   * unicos y el cooldown se validan igual en el proceso padre. `comando` es el
   * runtime con sus flags, p. ej. `[Deno.execPath(), 'run', '-A', '--no-check']`
   * o `[process.execPath, '--import', 'tsx']`.
   */
  aislar?: { comando: string[] };
}

export interface OpcionesCarpeta extends Omit<OpcionesCorrida, 'archivos'> {
  /** Carpeta a recorrer (recursiva). Se toman SOLO los `*.test.ts`. */
  carpeta: string;
  /** Nombres de subcarpetas que no se recorren (p. ej. `e2e` en la bateria de salud). */
  excluir?: string[];
}

/** `t` que recibe una prueba registrada con `coleccionPruebas().test(...)`. */
export interface TPrueba {
  readonly name: string;
  readonly signal: AbortSignal;
  /** Termina la prueba como saltada (lanza: no sigue el cuerpo). */
  skip(motivo?: string): never;
  diagnostic(linea: string): void;
  /** Limpieza al final de esta prueba (pase o falle). */
  after(fn: () => void | Promise<void>): void;
}
export type CuerpoT = (t: TPrueba) => unknown;
export type OpcionesT = { timeout?: number; skip?: boolean | string };

/** Lo que el padre le pasa a `pruebas-hijo.ts` (un archivo, sin funciones). */
export type OpcionesHijo = Omit<OpcionesCorrida, 'archivos' | 'aislar' | 'importar' | 'log'> & { archivo: string };
