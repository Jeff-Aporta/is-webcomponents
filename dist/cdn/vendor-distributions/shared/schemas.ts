// @vendor 2026-10-13T15:51:18.306Z Jeff-Aporta/is-webcomponents@main dist/cdn/vendor-distributions/shared/schemas.ts
// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/vendor-distributions/README.md
/**
 * schemas.ts — TODOS los contratos (Zod y tipos) de `vendor-distributions/`, en UN solo archivo por secciones.
 * W54: los tipos top-level viven aquí, no en los módulos.
 *
 * Cada sección es de un módulo (`@seccion <modulo>`, el basename del archivo dueño) y declara de qué otras
 * secciones depende (`[requiere: a, b]`): solo puede usar símbolos de `comun` o de las que declara. Al
 * vendorizar, `vendor.ts` PODA este archivo: conserva `comun` + las secciones de los módulos que la config
 * trae a la misma carpeta + sus `requiere` transitivos, y descarta el resto (guardián
 * `meta/vendor.test.ts` V10: cada módulo compila con su copia podada).
 *
 *   // ===== @seccion <modulo> [requiere: a, b] =====
 *   …
 *   // ===== @fin <modulo> =====
 *
 * Los módulos importan de aquí (`../schemas.ts` desde `shared/lib|testing|tools`, `../../shared/schemas.ts`
 * desde `client/`) y reexportan sus tipos (`export type { … } from`). Lo que hay antes de la primera sección
 * (esta cabecera) siempre se conserva.
 *
 * Perfil: shared. Vendor: `dist/cdn/vendor-distributions/shared/schemas.ts` → carpeta `ISU/` del consumidor (`tools/vendor.ts`, pin por fecha ISO; podado por secciones). Sin imports relativos.
 * Skill: skills/iswc-foundation/references/05-zod-y-tipos.md
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/vendor-distributions/README.md
 */

// ===== @seccion comun =====
// Zod del consumidor (lo que importa `zod` usa el suyo); se reexporta para que un consumidor que solo
// trae `schemas.ts` tenga el mismo `z` que los módulos.
import { z } from "zod";
export { z };
// ===== @fin comun =====

// ===== @seccion obj =====
/**
 * Tipos de `Obj` (operaciones sobre objetos JSON) y de las referencias `{ path, query, actions }`.
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/vendor-distributions/shared/lib/obj.md
 *
 * Consulta (`query`): un objeto que copia la forma del dato y marca con un valor TRUTHY (`!!x`) lo
 * que se pide. Además de las claves normales:
 *   - `"*"`: todas las claves de un objeto o todos los elementos de un arreglo;
 *   - `"[campo=valor]"`: el primer elemento (de un arreglo o de los valores de un objeto) cuyo
 *     `campo` vale `valor` (comparación como texto). Así un diccionario de entidades en arreglo
 *     (`entities`, `classes`…) se consulta por nombre.
 */

/** Hoja o rama de una consulta. Una hoja cuenta si es truthy; un objeto desciende. */
export type TConsulta = boolean | number | string | null | undefined | { [k: string]: TConsulta };
export const ZConsulta: z.ZodType<TConsulta> = z.lazy(() =>
  z.union([z.boolean(), z.number(), z.string(), z.null(), z.undefined(), z.record(z.string(), ZConsulta)])
);

/** Valor JSON. */
export type TJson = string | number | boolean | null | TJson[] | { [k: string]: TJson };
export const ZJson: z.ZodType<TJson> = z.lazy(() =>
  z.union([z.string(), z.number(), z.boolean(), z.null(), z.array(ZJson), z.record(z.string(), ZJson)])
);

/**
 * Acciones que se aplican en orden sobre el valor (`Obj.aplicar`):
 *   - `push`: upsert profundo (lo no mencionado se conserva; `null` quita);
 *   - `update`: cambia solo lo que YA existe (no crea claves);
 *   - `insert`: agrega solo lo que NO existe (no pisa);
 *   - `delete`: quita lo que marque la consulta;
 *   - `get`: la estructura desde la raíz con solo lo que marque la consulta (varias claves);
 *   - `getValue`: el valor exacto de la única hoja marcada, sin estructura (`null` si no existe).
 */
export const ZAccionObj = z.discriminatedUnion("op", [
  z.object({ op: z.literal("push"), valor: ZJson }),
  z.object({ op: z.literal("update"), valor: ZJson }),
  z.object({ op: z.literal("insert"), valor: ZJson }),
  z.object({ op: z.literal("delete"), query: ZConsulta }),
  z.object({ op: z.literal("get"), query: ZConsulta }),
  z.object({ op: z.literal("getValue"), query: ZConsulta }),
]);
export type TAccionObj = z.infer<typeof ZAccionObj>;

/**
 * Referencia a un valor de otro JSON (fuente de verdad): `path` (relativo al documento que la
 * contiene), `query` (SIEMPRE un `getValue`: marca exactamente una hoja y trae ese valor exacto) y
 * `actions` opcionales que adaptan lo traído. Sirve para cualquier valor: texto, número, booleano,
 * objeto, arreglo. Si el valor no existe es un error (hay que definirlo o ajustar path/query). Las
 * props extra se ignoran con un aviso.
 */
export const ZRefObj = z.object({
  path: z.string().min(1),
  query: ZConsulta,
  actions: z.array(ZAccionObj).optional(),
});
export type TRefObj = z.infer<typeof ZRefObj>;

/** Cómo leer un `path` (fetch en el navegador, fs en Node/Deno). */
export type TCargarJson = (url: string) => Promise<unknown>;

/** Opciones de `Obj.resolver`. */
export interface TOpcionesResolver {
  /** Lector del JSON de cada `path` (ya resuelto contra `base`). */
  cargar: TCargarJson;
  /** URL o ruta del documento que contiene las referencias (base de los `path` relativos). */
  base: string;
  /** Avisos no fatales (claves extra, consultas sin resultado en `get`). Por defecto, console.warn. */
  avisar?: (mensaje: string) => void;
  /** Tope de anidamiento de referencias (contra ciclos). Por defecto 16. */
  profundidad?: number;
}

/** Códigos de error de `Obj`. */
export type TCodigoObj = "consulta" | "no-existe" | "varios" | "ninguno" | "ref" | "ciclo" | "carga" | "accion";
// ===== @fin obj =====

// ===== @seccion test-cooldown =====
/**
 * Contratos del cooldown de tests y de la cola estándar (`test-cooldown.ts`), y del cooldown de llaves
 * de los jueces (mismo sistema, misma convención `-1`).
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/07-pruebas-y-gate.md
 */

export interface TestCooldownEntry {
  /** Duración de la última corrida (verde o roja), en ms. */
  durationMs: number;
  /** Epoch ms en que pasó en verde; `null` si la última corrida fue roja. */
  okAt: number | null;
  /** Epoch ms hasta el que el test se salta; `-1` = la última corrida fue roja (no aplica cooldown). */
  until: number;
  /** Minutos de cooldown aplicados (`until - okAt`, 2 decimales). Solo informativo para quien lee el JSON. */
  cooldownMin?: number;
  /** Epoch ms del último rojo (solo cuando `until === -1`). */
  failAt?: number;
}

export interface TestCooldownOptions {
  /** Ruta del JSON que guarda la memoria. */
  dbPath: string;
  /** Factor cooldown/duración (proporcional). Default 1440: 1 min verde -> 24 h de skip. */
  factor?: number;
  /** `true` corre todo y no registra nada (p. ej. `--sin-cooldown`). */
  disabled?: boolean;
  /** Reloj inyectable para tests. Default `Date.now`. */
  now?: () => number;
}

export type TestCooldownCheck = { skip: false } | { skip: true; until: number; remainingMs: number };

export type TestCooldownRun<T> =
  | { skipped: true; until: number; remainingMs: number }
  | { skipped: false; durationMs: number; value: T };

/** Lo que devuelve `createTestCooldown`. */
export interface TestCooldown {
  /** ¿Se salta `id`? Con `until` y lo que falta si sí. */
  check(id: string): TestCooldownCheck;
  /** Registra una corrida: el verde fija el cooldown proporcional; el rojo guarda `until: -1`. */
  record(id: string, durationMs: number, ok: boolean): void;
  /** Corre `fn` si no está en cooldown; mide, registra y relanza si falla. */
  run<T>(id: string, fn: () => T | Promise<T>): Promise<TestCooldownRun<T>>;
  /** Copia de la memoria. */
  entries(): Record<string, TestCooldownEntry>;
}

/** Opciones de `runQueue` (cola estándar de N trabajadores). */
export interface OpcionesCola {
  /** Trabajadores a la vez; default `testConcurrency()` (env `TEST_CONCURRENCY` o 3). */
  concurrency?: number;
}

// ── Cooldown de LLAVES de los jueces (LLM y JEV): mismo sistema, misma convención -1 ──

/**
 * Cooldown de una llave: fecha ISO hasta la que no se usa (puesta sola al fallar por saldo, key o
 * cuota: +24 h), o `-1` (puesto A MANO cuando se resolvió: recarga de saldo o llave nueva) para que
 * el algoritmo la reintente ya. Ausente = disponible.
 */
export const ZCooldownLlave = z.union([z.string().datetime({ offset: true }), z.literal(-1)]);
export type TCooldownLlave = z.infer<typeof ZCooldownLlave>;

/** Una entrada del archivo de llaves (proveedor LLM o JEV): solo lo que el cooldown necesita. */
export const ZEntradaLlave = z.object({ nombre: z.string().min(1).optional(), model: z.string().optional(), cooldownHasta: ZCooldownLlave.optional() }).passthrough();
export type TEntradaLlave = z.infer<typeof ZEntradaLlave>;

/** Estado de una llave para el que la va a usar. */
export interface EstadoLlave {
  disponible: boolean;
  /** Motivo legible cuando no está disponible (hasta cuándo y cómo reactivarla). */
  motivo: string;
}
// ===== @fin test-cooldown =====

// ===== @seccion deno-test [requiere: test-cooldown] =====
/** Contratos de `deno-test.ts` (`deno test` por archivo con cola + cooldown). */
export interface DenoTestOptions {
  /** Flags de `deno test` (p. ej. `-A`, `--no-check`). */
  args?: string[];
  /** Entorno del proceso hijo. Default `process.env`. */
  env?: Record<string, string | undefined>;
  /** `true`: un archivo a la vez (estado compartido). Default: cola de `testConcurrency()`. */
  serial?: boolean;
  /** Cooldown a usar. Default `testCooldownFromEnv()`. */
  cooldown?: TestCooldown;
  /** Ejecutable de Deno. Default `"deno"`. */
  deno?: string;
}
// ===== @fin deno-test =====

// ===== @seccion pruebas =====
/**
 * Contratos del sistema común de pruebas (`pruebas.ts`), compartido por las apps del kit (ISS en Node,
 * ISW en Deno).
 *
 * Convención de las apps: TODAS las pruebas viven en una carpeta `tests/`; cada archivo `*.test.ts`
 * exporta por defecto su LISTA de pruebas (como un patch exporta su lista de operaciones). El runner
 * recorre la carpeta, importa cada archivo y corre sus pruebas una por una, con cooldown, en orden.
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/07-pruebas-y-gate.md
 */

/** `what` = contrato observable (caja negra); `how` = detalle de implementación. */
export type CategoriaPrueba = 'what' | 'how';

/**
 * `error` = una falla pone la batería en rojo. `aviso` = una falla se reporta
 * como advertencia y NUNCA pone rojo (p. ej. prod va desfasado hasta el swap).
 */
export type NivelPrueba = 'error' | 'aviso';

/** Herramientas que recibe cada prueba. */
export interface CtxPrueba {
  /** Registra una comprobación; la prueba falla al final si alguna fue falsa. */
  expect(etiqueta: string, ok: unknown, detalle?: string): void;
  /** `expect` por igualdad JSON. */
  eq(etiqueta: string, actual: unknown, esperado: unknown): void;
  /** Anota un aviso visible en el reporte, sin fallar. */
  aviso(mensaje: string): void;
  /** Línea de diagnóstico (sale en el reporte). */
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
  /** Id único de la prueba en TODA la corrida (también es su llave de cooldown). */
  nombre: string;
  correr(ctx: CtxPrueba): unknown;
}

/** Preparación y limpieza de un archivo (p. ej. abrir y cerrar un navegador). */
export interface HooksPruebas {
  /** Antes de la primera prueba del archivo que de verdad corre (no si todas están en cooldown). */
  antes?: () => void | Promise<void>;
  /** Después de la última, si `antes` corrió. */
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
  /** Raíz del proyecto (rutas del reporte relativas a ella). */
  raiz: string;
  /** Solo pruebas cuyo nombre contenga alguno de estos textos (sin distinguir mayúsculas). */
  solo?: string[];
  categoria?: CategoriaPrueba;
  /** Desactiva el cooldown (corre todo y no registra). */
  sinCooldown?: boolean;
  /** Ruta del JSON de cooldown. Default `.tmp/test-cooldown.json` de la raíz. */
  cooldownDb?: string;
  /**
   * Reintentos de una prueba roja antes de darla por roja (default 1; `TEST_REINTENTOS` lo cambia).
   * Si pasa al reintentar queda verde con el aviso `intermitente`: una prueba de red o de LLM
   * inestable no tumba el gate, pero queda a la vista. Un fallo real falla las dos veces.
   */
  reintentos?: number;
  /** Importador inyectable (tests del runner y adaptadores). Default `import(url)`. */
  importar?: (url: string) => Promise<unknown>;
  log?: (linea: string) => void;
  /**
   * Corre cada archivo en su propio proceso (uno tras otro): los archivos que
   * instalan globales (DOM, localStorage, fetch) no se pisan. La carga, los ids
   * únicos y el cooldown se validan igual en el proceso padre. `comando` es el
   * runtime con sus flags, p. ej. `[Deno.execPath(), 'run', '-A', '--no-check']`
   * o `[process.execPath, '--import', 'tsx']`; el hijo es el mismo `pruebas.ts` con `--hijo <json>`.
   */
  aislar?: { comando: string[] };
}

export interface OpcionesCarpeta extends Omit<OpcionesCorrida, 'archivos'> {
  /** Carpeta a recorrer (recursiva). Se toman SOLO los `*.test.ts`. */
  carpeta: string;
  /** Nombres de subcarpetas que no se recorren (p. ej. `e2e` en la batería de salud). */
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

/** Lo que el padre le pasa al hijo (`pruebas.ts --hijo <json>`: un archivo, sin funciones). */
export type OpcionesHijo = Omit<OpcionesCorrida, 'archivos' | 'aislar' | 'importar' | 'log'> & { archivo: string };
// ===== @fin pruebas =====

// ===== @seccion proveedores-llm =====
/**
 * Contratos de la pila de proveedores LLM OpenAI-compatible (`proveedores-llm.ts`): proveedor, archivo
 * de llaves, sonda, cache del barrido y elección. La usan los jueces (`jueces.ts`) y el controlador de
 * Stagehand (`client/testing/stagehand.ts`).
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/11-stagehand.md
 */

/** Proveedor LLM OpenAI-compatible: `POST {baseUrl}/chat/completions` con `Bearer apiKey`. */
export const ZProveedorLlm = z.object({
  /** Id del proveedor (`deepseek`, `minimax`, `openai`…); por defecto el `model`. */
  nombre: z.string().trim().min(1).optional(),
  apiKey: z.string().trim().min(1),
  model: z.string().trim().min(1),
  /** Base del API sin barra final. Default OpenAI. */
  baseUrl: z.string().trim().min(1).default('https://api.openai.com/v1'),
  /** Cuerpo extra que el proveedor exige o acepta (p. ej. MiniMax: `{ thinking: { type: 'disabled' } }`). */
  extra: z.record(z.string(), z.unknown()).optional(),
}).transform((p) => ({ ...p, nombre: p.nombre ?? p.model, baseUrl: p.baseUrl.replace(/\/+$/, '') }));
export type ProveedorLlm = z.output<typeof ZProveedorLlm>;

/** Archivo de keys fuera del repo: `{ "proveedores": [ { nombre, apiKey, model, baseUrl }, … ] }` en orden de prioridad. */
export const ZArchivoProveedores = z.object({ proveedores: z.array(z.unknown()).default([]) });

/** Resultado de sondear un proveedor (o de intentar generar con él). */
export interface SondaLlm {
  nombre: string;
  ok: boolean;
  causa: string;
  ms: number;
  /** Falló por saldo, key o cuota: la llave entra en cooldown de 24 h (`test-cooldown.ts`). */
  definitivo?: boolean;
}

/** Cache del proveedor elegido por el barrido. */
export const ZCacheProveedor = z.object({ nombre: z.string().min(1), ts: z.number() });
export type CacheProveedor = z.infer<typeof ZCacheProveedor>;

export interface OpcionesSonda {
  /** Default 20 s. */
  timeoutMs?: number;
  /** `fetch` inyectable (tests). */
  fetchFn?: typeof fetch;
}

export interface OpcionesElegirProveedor {
  /** Proveedores en orden de prioridad (ya validados, p. ej. con `leerProveedoresDeArchivo`). */
  proveedores: ProveedorLlm[];
  /** JSON con el elegido del último barrido; sin ruta no se cachea. */
  rutaCache?: string;
  /** Vigencia de la cache. Default 30 min. */
  ttlMs?: number;
  /** Fuerza un proveedor por nombre (sin barrido). Default: env `E2E_LLM_PROVEEDOR`. */
  forzado?: string;
  /** Ignora la cache y barre de nuevo. Default: env `E2E_LLM_BARRIDO=1`. */
  barridoNuevo?: boolean;
  /** Entorno a leer. Default `process.env`. */
  env?: Record<string, string | undefined>;
  /** Sonda inyectable (tests). Default: una completion mínima real. */
  sondear?: (p: ProveedorLlm) => Promise<SondaLlm>;
  /** Reloj inyectable (tests). */
  now?: () => number;
  log?: (linea: string) => void;
  /** Archivo de llaves: un fallo definitivo de la sonda pone esa llave en cooldown de 24 h. */
  rutaLlaves?: string;
}

/** Cómo se decidió el proveedor de la corrida. */
export type OrigenEleccion = 'forzado' | 'cache' | 'barrido';

export interface EleccionProveedor {
  proveedor: ProveedorLlm;
  origen: OrigenEleccion;
  /** Sondas del barrido (vacío si vino de cache o forzado). */
  sondas: SondaLlm[];
  /** Pila para el generador: el elegido primero y después los demás no descartados, en su orden. */
  orden: ProveedorLlm[];
}
// ===== @fin proveedores-llm =====

// ===== @seccion jueces [requiere: proveedores-llm, test-cooldown] =====
/**
 * Contratos de los jueces opcionales de las pruebas: JEV (TypeSafe, preguntas sí/no, de opción y de
 * escala sobre un texto) y un juez LLM (chat OpenAI-compatible). `jueces.ts` usa además
 * `ZArchivoProveedores`/`ZProveedorLlm` (sección `proveedores-llm`) y el cooldown de llaves.
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/12-jueces.md
 */

/** Entrada `jev` del archivo de llaves. */
export const ZLlaveJev = z.object({
  nombre: z.string().min(1).default('jev'),
  apiKey: z.string().trim().min(1),
  model: z.string().trim().min(1).default('jev-latest'),
  baseUrl: z.string().trim().min(1).default('https://api.typesafe.ai/v1'),
}).passthrough().transform((j) => ({ ...j, baseUrl: j.baseUrl.replace(/\/+$/, '') }));
export type LlaveJev = z.output<typeof ZLlaveJev>;

/** Pregunta JEV: `noul` (sí/no, probabilidad 0..1), `choice` (una de varias), `score` (escala ordinal). */
export const ZPreguntaJev = z.discriminatedUnion('type', [
  z.object({ type: z.literal('noul'), instructions: z.string().min(1) }),
  z.object({ type: z.literal('choice'), instructions: z.string().min(1), criteria: z.record(z.string(), z.string()) }),
  z.object({ type: z.literal('score'), instructions: z.string().min(1), criteria: z.array(z.string()).min(2) }),
]);
export type PreguntaJev = z.infer<typeof ZPreguntaJev>;

/** Respuesta de una pregunta (campos según el tipo). */
export const ZRespuestaJev = z.object({
  type: z.enum(['noul', 'choice', 'score']),
  noul: z.number().optional(),
  choice: z.string().optional(),
  score: z.number().optional(),
  confidence: z.number().optional(),
  probabilities: z.record(z.string(), z.number()).optional(),
}).passthrough();
export type RespuestaJev = z.infer<typeof ZRespuestaJev>;

export const ZCuerpoJev = z.object({ model: z.string().optional(), answers: z.record(z.string(), ZRespuestaJev) }).passthrough();

/**
 * Veredicto de un juez opcional: o evaluó (con sus respuestas) o NO evaluó y dice por qué (sin llave,
 * en cooldown, sin saldo, caído). Nunca lanza: quien lo usa decide si avisar o saltar.
 */
export type VeredictoJuez<T> = { evaluado: true; respuestas: T; juez: string } | { evaluado: false; motivo: string };

export interface OpcionesJuez {
  /** Archivo de llaves (fuera del repo). */
  rutaLlaves: string;
  /** `fetch` inyectable (pruebas). */
  fetchFn?: typeof fetch;
  /** Default 60 s. */
  timeoutMs?: number;
  now?: () => number;
}

/** Lo mínimo del contexto de una prueba que la capa opcional necesita (`definirPruebas` o `node:test`). */
export interface ContextoCapa {
  aviso?: (mensaje: string) => void;
  saltar?: (motivo: string) => never;
  skip?: (motivo?: string) => void;
}
// ===== @fin jueces =====

// ===== @seccion semantica =====
/**
 * Contratos del juez semántico determinista (`semantica.ts`): embeddings locales con
 * `multilingual-e5-base` vía `@huggingface/transformers` (devDependency del consumidor; nunca descarga).
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/12-jueces.md
 */

/** Dónde está el modelo en el equipo (cache de Hugging Face o `TEST_E5_MODEL_DIR`). */
export interface UbicacionModelo {
  /** Carpeta padre que se le da a `env.localModelPath`. */
  localModelPath: string;
  /** Id del modelo dentro de esa carpeta (hash del snapshot o nombre de la carpeta). */
  id: string;
}

/** Lo mínimo del pipeline `feature-extraction` que usa `semantica.ts` (sin tipar la lib entera). */
export type ExtractorSemantico = (texto: string, opciones: { pooling: 'mean'; normalize: boolean }) => Promise<{ data: ArrayLike<number> }>;

/** Resultado de `coincide`: umbral absoluto. */
export interface ResultadoCoincide {
  ok: boolean;
  sim: number;
  umbral: number;
}

/** Resultado de `prefiere`: contraste entre la orientación deseada y la contraria. */
export interface ResultadoPrefiere {
  ok: boolean;
  simDeseado: number;
  simContrario: number;
  margen: number;
}

/** Resultado de `masCercana`: clasificación por cercanía. */
export interface ResultadoMasCercana {
  clave: string;
  sim: number;
  todas: Record<string, number>;
}
// ===== @fin semantica =====

// ===== @seccion sync-entregable =====
/**
 * Contratos del sync común `_experimental` -> `_entregable` (`sync-entregable.ts`).
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/08-sync-entregable.md
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
  /** Raíz del mirror (`_experimental/<app>`). */
  origen: string;
  /** Raíz del entregable (`_entregable/<app>`). */
  destino: string;
  entradas: EntradaSync[];
  /** Globs relativos al destino que el sync NUNCA toca (ni borra ni escribe). */
  bloqueados?: string[];
  /** Comando que debe salir en 0 antes de escribir (solo en modo `real`). */
  gate?: GateSync;
  /** Antes del gate (validaciones: remotos, dependencias...). Lanzar aborta. */
  antes?: (ctx: CtxSync) => void | Promise<void>;
  /** Después de escribir (merges especiales, estado...). */
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
// ===== @fin sync-entregable =====

// ===== @seccion vendor =====
/**
 * Contrato de `vendor.ts` (descarga de archivos del kit por vendor strategy). El consumidor (ISS, ISW…)
 * describe en un JSON qué archivos del kit trae y dónde los deposita; `vendor.ts` lo lee y actualiza
 * cada archivo por PIN DE FECHA ISO: gana la fuente más reciente (checkout local del kit o su HEAD
 * remoto) y solo se escribe si es más nueva que la copia actual.
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/06-pines-y-vendor.md
 */

/**
 * Perfiles de `vendor-distributions/`: `shared` (sin navegador, sirve a todos), `server` (solo
 * proyectos server) y `client` (navegador, Playwright/Stagehand, render visual, íconos de UI).
 */
export const PERFILES = ["shared", "server", "client"] as const;
export type TPerfil = (typeof PERFILES)[number];

/** Perfil que declara un consumidor: baja `shared` + el suyo, nunca el del otro. */
export const ZPerfilVendor = z.enum(["server", "client"]);
export type TPerfilVendor = z.infer<typeof ZPerfilVendor>;

/** Un ALTA: archivo (o carpeta) del repo que el consumidor aún no tiene. Una vez bajado, se mantiene por su cabecera. */
export const ZArchivoVendor = z.object({
  /** Ruta en el repo (p. ej. `dist/cdn/vendor-distributions/shared/lib/obj.ts` o `skills/iswc-foundation`). */
  desde: z.string().min(1),
  /** Ruta en el consumidor, relativa a `raiz` (p. ej. `src/sources/000 Base/ISU/obj.ts` o `skills/iswc-foundation`). */
  hacia: z.string().min(1),
  /** Documentación del archivo en el repo (va como `@doc` en la cabecera). */
  doc: z.string().min(1).optional(),
  /** `true`: `desde` es una carpeta; se trae el árbol completo bajo `hacia` (listado del checkout local o de jsDelivr). */
  carpeta: z.boolean().optional(),
});
export type TArchivoVendor = z.infer<typeof ZArchivoVendor>;

/**
 * Protocolo de pines que la CLI de `vendor.ts` corre ANTES de barrer (`pin-update.mjs --nuevo=ultimo`):
 * todo `is-webcomponents@<sha40>` del consumidor pasa al último SHA PUBLICADO de la rama, y el barrido
 * lee la web de ese pin.
 */
export const ZPinVendor = z.object({
  /** `false` no corre el protocolo de pines. Default `true`. */
  activo: z.boolean().default(true),
  /** Rutas (relativas a `raiz`) a barrer en busca de pines. Default: las de `pin-update.mjs` (front típico). */
  raices: z.array(z.string().min(1)).optional(),
  /** Carpetas que no se barren. Default: `node_modules, vendor, dist, .tmp-scss, .git`. */
  saltar: z.array(z.string().min(1)).optional(),
  /** Archivo que debe existir en el pin para darlo por publicado. Default `dist/cdn/core/loader.min.js`. */
  verificar: z.string().min(1).optional(),
  /** Pin a usar como fuente web cuando el consumidor no cita ningún `<repo>@<sha40>` (p. ej. un server sin front). */
  sha: z.string().regex(/^[0-9a-f]{40}$/).optional(),
});
export type TPinVendor = z.infer<typeof ZPinVendor>;

/** El JSON que recibe `vendor.ts`: BOOTSTRAP (repo, perfil, local, raíces a barrer) + altas. Claves extra se ignoran. */
export const ZConfigVendor = z.object({
  /** `dueño/repo` en GitHub (el kit u otro: el barrido sirve para cualquier repo). */
  repo: z.string().regex(/^[^/\s]+\/[^/\s]+$/),
  /** Rama que se sigue (para el protocolo de pines y como respaldo sin pin). */
  rama: z.string().min(1).default("main"),
  /** Checkout local del repo (opcional): compite por fecha con la web; si no existe, se omite. */
  local: z.string().optional(),
  /**
   * Perfil del consumidor (`server` o `client`): solo se bajan `vendor-distributions/shared/` y
   * `vendor-distributions/<perfil>/`; con `server`, además, ningún archivo puede traer dependencias de
   * navegador. Sin perfil se baja todo (modo anterior) con aviso.
   */
  perfil: ZPerfilVendor.optional(),
  /** Raíz del consumidor (base de `hacia` y del barrido). Por defecto, el directorio desde el que se corre. */
  raiz: z.string().optional(),
  /** Carpetas a barrer en busca de cabeceras `@vendor` (relativas a `raiz`). Default: toda la raíz. */
  raices: z.array(z.string().min(1)).optional(),
  /** Carpetas que el barrido no entra, además de `node_modules, .git, dist, _entregable, .tmp*`. */
  saltar: z.array(z.string().min(1)).optional(),
  /** Protocolo de pines y pin de respaldo (ver `ZPinVendor`). */
  pin: ZPinVendor.optional(),
  /** Altas: lo que aún no existe en el consumidor. Vacío = solo barrido. */
  archivos: z.array(ZArchivoVendor).default([]),
});
export type TConfigVendor = z.infer<typeof ZConfigVendor>;

/** Lo que dice una cabecera `@vendor <ISO> <repo>@<sha|local> <desde>` (la forma corta solo trae la fecha). */
export interface TCabeceraVendor {
  fecha: string;
  repo: string | null;
  sha: string | null;
  desde: string | null;
}

/** `fetch` inyectable (pruebas). */
export type FetchFn = typeof fetch;

/** Opciones de `vendorizar`. */
export interface OpcionesVendorizar {
  raiz?: string;
  fetchFn?: FetchFn;
  log?: (linea: string) => void;
}

/** Un trabajo del barrido o un alta: de dónde viene y a dónde va. */
export interface TrabajoVendor {
  desde: string;
  hacia: string;
  destino: string;
  doc?: string;
  /** Cabecera de la copia actual (null si es un alta sin archivo). */
  previa: (TCabeceraVendor & { doc: string | null }) | null;
  alta: boolean;
}

/** Resultado por archivo. */
export interface TResultadoVendor {
  desde: string;
  hacia: string;
  /** `actualizado` (se escribió), `al-dia` (la copia ya era la más reciente) o `error`. */
  estado: "actualizado" | "al-dia" | "error";
  /** Fuente ganadora y su fecha. */
  fuente?: "local" | "remoto";
  fecha?: string;
  sha?: string | null;
  /** Fecha de la copia que ya había. */
  previa?: string | null;
  error?: string;
  /** Se actualizó, pero con algo que decir (p. ej. copiado de local porque aún no está publicado). */
  aviso?: string;
  /** Imports relativos del archivo que no existen en el consumidor (no se vendorizaron). */
  faltan?: string[];
  /** El perfil del consumidor no admite el archivo (otro perfil, ruta sin perfil o dependencia de navegador en server): no se bajó. */
  bloqueado?: string;
  /** Solo `schemas.ts`: secciones que quedaron tras podar (`comun` + módulos de la carpeta + `requiere`). */
  secciones?: string[];
}
// ===== @fin vendor =====

// ===== @seccion stagehand [requiere: proveedores-llm] =====
/**
 * Contratos del controlador de Stagehand (`client/testing/stagehand.ts`): generador para
 * `Stagehand.create({ model: { generate } })` y destino de pruebas por protocolo. Los de la pila de
 * proveedores LLM están en la sección `proveedores-llm` (el módulo los reexporta).
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/11-stagehand.md
 */

/** Bloque de contenido que Stagehand pasa en `messages[].content`. */
export interface BloqueStagehand {
  type: string;
  text?: string;
  mimeType?: string;
  data?: string;
  content?: BloqueStagehand[];
  input?: unknown;
}

export interface MensajeStagehand {
  role: string;
  content: string | BloqueStagehand | BloqueStagehand[];
}

/** Parámetros con los que Stagehand llama a `model.generate`. */
export interface ParamsGenerate {
  systemPrompt?: string;
  messages?: MensajeStagehand[];
  responseFormat?: { schema?: unknown };
  temperature?: number;
}

/** Respuesta que Stagehand espera de `model.generate` (salida estructurada). */
export interface RespuestaGenerate {
  role: 'assistant';
  content: { type: 'text'; text: string };
  outputFormat: 'json_schema';
  structuredContent: unknown;
  usage: { inputTokens: number; outputTokens: number; totalTokens: number };
}

export type GeneradorStagehand = (params: ParamsGenerate) => Promise<RespuestaGenerate>;

/** Mensaje de chat OpenAI-compatible que arma el generador. */
export interface MensajeOpenAi {
  role: 'system' | 'user' | 'assistant';
  content: string | ParteOpenAi[];
}

export type ParteOpenAi = { type: 'text'; text: string } | { type: 'image_url'; image_url: { url: string } };

export interface OpcionesGenerador {
  /** Timeout por petición. Default 120 s. */
  timeoutMs?: number;
  /** Intentos por proveedor ante 429/5xx o JSON no parseable antes de pasar al siguiente. Default 3. */
  reintentos?: number;
  /** Tokens de salida. Default 4096. */
  maxTokens?: number;
  /** Tiempo que un proveedor caído queda fuera del round-robin. Default 5 min. */
  reposoMs?: number;
  /** `fetch` inyectable (tests). */
  fetchFn?: typeof fetch;
  /** Espera inyectable (tests): default `setTimeout`. */
  esperar?: (ms: number) => Promise<void>;
  now?: () => number;
  log?: (linea: string) => void;
  /** Archivo de llaves: un fallo definitivo durante la corrida pone esa llave en cooldown de 24 h. */
  rutaLlaves?: string;
}

/** Estado observable del generador (round-robin con fallback). */
export interface EstadoGenerador {
  /** Proveedor con el que se intenta la próxima petición. */
  actual: ProveedorLlm | null;
  /** Proveedores caídos durante la corrida, con su causa y cuándo. */
  caidos: { nombre: string; causa: string; ts: number }[];
}

export interface ControlGenerador {
  /** Lo que se pasa a `Stagehand.create({ model: { generate } })`. */
  generate: GeneradorStagehand;
  estado(): EstadoGenerador;
}

/** Un destino de pruebas (`local`, `staging`, `production`…) con su sonda. */
export interface DestinoPruebas<Id extends string = string> {
  id: Id;
  /** Sonda del contrato del destino: `ok` si se puede probar contra él; `causa` explica el no. */
  sondear: () => Promise<{ ok: boolean; causa: string }>;
}

export interface SondaDestino<Id extends string = string> {
  destino: Id;
  ok: boolean;
  causa: string;
  ms: number;
}

export interface OpcionesResolverDestino<Id extends string = string> {
  /** Destinos en orden de preferencia. */
  destinos: DestinoPruebas<Id>[];
  /** Id preferido (p. ej. de `E2E_DESTINO`); va primero y el resto conserva su orden. */
  preferido?: Id;
  log?: (linea: string) => void;
}

export interface ContextoDestino<Id extends string = string> {
  destino: Id;
  motivo: string;
  sondas: SondaDestino<Id>[];
}

export interface OpcionesPrepararStagehand<Id extends string = string> {
  proveedores: ProveedorLlm[];
  destinos: DestinoPruebas<Id>[];
  preferido?: Id;
  rutaCache?: string;
  eleccion?: Omit<OpcionesElegirProveedor, 'proveedores' | 'rutaCache'>;
  generador?: OpcionesGenerador;
  log?: (linea: string) => void;
}

/** Lo que un `antes` de `definirPruebas` necesita para abrir Stagehand contra el destino correcto. */
export interface ContextoStagehand<Id extends string = string> {
  eleccion: EleccionProveedor;
  control: ControlGenerador;
  /** Atajo: `control.generate`. */
  generate: GeneradorStagehand;
  contexto: ContextoDestino<Id>;
}
// ===== @fin stagehand =====

// ===== @seccion download-iconify =====
/**
 * Contratos (Zod) de la herramienta que baja los íconos de una app (`download-iconify.ts`). Sin mapa
 * (Jeff, 2026-10-13): los SVG van a `<salida>/iconify/<set>/<n>.svg` y `<iswc-icon>` los pide a la web
 * publicada de la app (`<html data-icons>`, `initApp({ icons })`), luego a la API.
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/10-iconos.md
 */

/** Id Iconify `set:nombre` (minúsculas, dígitos y guiones; `_` solo en el nombre). */
export const IconIdSchema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*:[a-z0-9]+(?:[-_][a-z0-9]+)*$/);
export type IconId = z.infer<typeof IconIdSchema>;

/** Opciones de `descargarIconos`. Los valores por defecto viven en `DEFAULTS` de la herramienta (corre sin dependencias). */
export const OpcionesDescargaSchema = z.object({
  /** Raíz de la app (carpeta o URL `file:`). */
  raiz: z.union([z.string(), z.instanceof(URL)]),
  /** Archivos o carpetas a barrer, relativos a la raíz. */
  roots: z.array(z.string()).min(1),
  /** Carpeta de salida, relativa a la raíz: ahí va `iconify/`. */
  salida: z.string().optional(),
  /** Ids que el barrido no puede ver (armados en ejecución, o los que pintan los componentes del kit: el aviso `[iswc-icon] falta en local:` los nombra). */
  extra: z.array(IconIdSchema).optional(),
  /** Nombres de carpeta que no se barren. */
  ignorar: z.array(z.string()).optional(),
  /** Extensiones barridas. */
  extensiones: z.array(z.string()).optional(),
  /** Borrar SVG de `iconify/` que ya nadie usa. */
  podar: z.boolean().optional(),
  /** Sin red: conserva lo que ya está en disco. */
  offline: z.boolean().optional(),
  /** API de Iconify. */
  api: z.string().url().optional(),
  /** Descargas en paralelo. */
  concurrencia: z.number().int().positive().optional(),
  /** Silencio en consola. */
  silencioso: z.boolean().optional(),
});
export type OpcionesDescarga = z.infer<typeof OpcionesDescargaSchema> & { fetch?: typeof fetch };

export const ResumenDescargaSchema = z.object({
  archivos: z.number(),
  encontrados: z.number(),
  descargados: z.array(IconIdSchema),
  existentes: z.number(),
  inexistentes: z.array(IconIdSchema),
  podados: z.array(IconIdSchema),
  avisos: z.array(z.string()),
  /** Carpeta de los SVG, relativa a la raíz (`assets/iconify`). */
  carpeta: z.string(),
});
export type ResumenDescarga = z.infer<typeof ResumenDescargaSchema>;

const CajaIconifySchema = { width: z.number().optional(), height: z.number().optional(), left: z.number().optional(), top: z.number().optional() };
/** Respuesta de la API de Iconify en lote (`<set>.json?icons=a,b`): lo que la herramienta usa. */
export const IconifyJsonSchema = z.object({
  ...CajaIconifySchema,
  icons: z.record(z.string(), z.object({ body: z.string(), ...CajaIconifySchema })).optional(),
  aliases: z.record(z.string(), z.unknown()).optional(),
});
export type IconifyJson = z.infer<typeof IconifyJsonSchema>;
// ===== @fin download-iconify =====

// ===== @seccion static-server =====
/** Servidor estático de `static-server.ts` (lo usa el render headless). */
export type StaticServer = {
  port: number;
  base: string;
  close: () => void;
};
// ===== @fin static-server =====

// ===== @seccion render-diagram [requiere: static-server] =====
/**
 * Contratos del render headless de diagramas iswc-* (`client/tools/render-diagram.ts`).
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md
 */

/** Atributos HTML del host (theme, min-gap, …). */
export type HostAttrs = Record<string, string>;

/** Job sintético: el tool arma el HTML y carga el .min.js. */
export type SyntheticDiagramJob = {
  /** Tag del custom element. Default: iswc-component-diagram */
  tag?: string;
  /**
   * URL del módulo ESM del componente.
   * Absoluta (http/https/file) o relativa a `serveRoot` (p. ej. dist/cdn/…).
   */
  scriptUrl: string;
  /** Payload JSON que se asigna a `el.payload`. */
  payload?: unknown;
  /**
   * Ruta (o URL) del documento del que sale el payload. Con ella, cada referencia
   * `{ path, query, actions }` del payload se resuelve (relativa a ese documento) antes de pintar;
   * un valor que no existe hace fallar el render con el error (ver `Obj.resolver`).
   */
  payloadBase?: string;
  /** Atributos del host (`theme="insoft-cd"`, `min-gap="72"`…). */
  attrs?: HostAttrs;
  /** CSS extra en el documento (opcional). */
  css?: string;
};

/** Job sobre una página ya existente (HTML del ISS, preview, etc.). */
export type PageDiagramJob = {
  /** file://… o http://… */
  pageUrl: string;
};

export type RenderDiagramJob = SyntheticDiagramJob | PageDiagramJob;

export type RenderDiagramOptions = {
  /**
   * Chromium de Playwright (inyectado).
   * Deno/Node: `createRequire(import.meta.url)('playwright').chromium`
   */
  chromium: {
    launch: (opts?: { headless?: boolean }) => Promise<RenderBrowser>;
  };
  /** Raíz estática (repo iswc o vendor). Obligatorio si el job es sintético. */
  serveRoot?: string;
  /** Timeout hasta `__ISWC_RENDER_READY__` / SVG montado (ms). Default 90_000. */
  timeoutMs?: number;
  /** Espera extra tras ready antes de extraer (ms). Default 400. */
  settleMs?: number;
  /** Viewport del contexto. */
  viewport?: { width: number; height: number };
  /** También captura PNG del SVG (bytes). */
  png?: boolean;
  /** Post-proceso del SVG (paleta ISS, etc.). */
  transformSvg?: (svg: string) => string;
};

export type RenderDiagramResult = {
  svg: string;
  width: number | null;
  height: number | null;
  png?: Uint8Array;
};

/** Subconjunto mínimo de Playwright (sin tipar la lib entera). */
export type RenderBrowser = {
  newPage: () => Promise<RenderPage>;
  newContext: (opts?: Record<string, unknown>) => Promise<RenderContext>;
  close: () => Promise<void>;
};

export type RenderContext = {
  newPage: () => Promise<RenderPage>;
  close: () => Promise<void>;
};

export type RenderPage = {
  goto: (url: string, opts?: Record<string, unknown>) => Promise<unknown>;
  waitForFunction: (fn: string | (() => unknown), arg?: unknown, opts?: Record<string, unknown>) => Promise<unknown>;
  waitForTimeout: (ms: number) => Promise<void>;
  evaluate: <T>(fn: string | (() => T) | ((arg: unknown) => T), arg?: unknown) => Promise<T>;
  emulateMedia?: (opts: { colorScheme?: string }) => Promise<void>;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
  close: () => Promise<void>;
  $: (sel: string) => Promise<RenderElementHandle | null>;
};

export type RenderElementHandle = {
  screenshot: (opts: Record<string, unknown>) => Promise<Buffer | Uint8Array>;
};
// ===== @fin render-diagram =====

// ===== @seccion render-lab [requiere: render-diagram] =====
/**
 * Tipos de los labs de render (`client/tools/render-lab.ts`).
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md
 */

/** Un job de render con su id (el nombre del SVG de salida). */
export type LabJob = { id: string; job: SyntheticDiagramJob };

/** Editable de un lab (el mismo formato que `docs-experimental/diagramas` de los consumidores). */
export const EditableSchema = z.object({
  slug: z.string().optional(),
  tag: z.string().optional(),
  script: z.string().optional(),
  attrs: z.record(z.string(), z.string()).optional(),
  payload: z.unknown(),
});
export type Editable = z.infer<typeof EditableSchema>;

/** Opciones de `jobsDeEditables`. */
export const OpcionesEditablesSchema = z.object({
  /** Slugs a renderizar (vacío = todos). */
  only: z.array(z.string()).optional(),
  /** Archivos de solo soporte (incrustados por otros): no se dibujan. */
  soporte: z.array(z.string()).optional(),
  /** Defaults si el editable no los trae. */
  tag: z.string().optional(),
  script: z.string().optional(),
  attrs: z.record(z.string(), z.string()).optional(),
});
export type OpcionesEditables = z.infer<typeof OpcionesEditablesSchema>;

/** Opciones de `renderLab`: las de `renderDiagramBatch` menos el chromium y la raíz, que el lab resuelve solo. */
export type OpcionesLab = Partial<Omit<RenderDiagramOptions, 'chromium' | 'serveRoot'>> & {
  /** Carpeta de salida (por defecto `<lab>/out`). */
  outDir?: string;
  /** Raíz servida (por defecto la del kit: dos niveles arriba del lab). */
  serveRoot?: string;
  chromium?: RenderDiagramOptions['chromium'];
};
// ===== @fin render-lab =====

// ===== @seccion render-lote [requiere: render-diagram] =====
/**
 * Contratos de `client/tools/render-lote.ts`: opciones del lote, editable, caché por hash
 * (`diagramas-iswc.cache.json`), plan y resultado.
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/src/cdn/loader.md
 */

/** Editable `<slug>.json` de la carpeta de diagramas (el mismo formato en ISS, ISW y los labs). */
export const EditableLoteSchema = z.object({
  /** Nombre de salida; por defecto el del archivo sin `.json`. */
  slug: z.string().optional(),
  /** Módulo de docs al que pertenece (entra en la huella). */
  module: z.string().optional(),
  /** Custom element del kit (`iswc-flowchart`, `iswc-er-diagram`…). */
  tag: z.string(),
  /** Módulo relativo a `<kit>/dist/cdn/` (`diagrams/flowchart.min.js`). */
  script: z.string(),
  attrs: z.record(z.string(), z.string()).optional(),
  /** Payload declarativo; puede llevar referencias `{ path, query, actions }` relativas al editable. */
  payload: z.unknown(),
  oficial: z.boolean().optional(),
});
export type EditableLote = z.infer<typeof EditableLoteSchema>;

/** Opciones serializables del lote (las que viajan al proceso hijo). */
export const OpcionesLoteDatosSchema = z.object({
  /** Carpeta de editables `<slug>.json`. */
  carpeta: z.string().min(1),
  /** Carpeta de salida de los SVG. */
  salidaSvg: z.string().min(1),
  /** Carpeta de salida de los PNG (si `png`). */
  salidaPng: z.string().min(1),
  /** Archivo de caché; por defecto `<carpeta>/diagramas-iswc.cache.json`. */
  cache: z.string().optional(),
  /** Raíz del checkout del kit (= `serveRoot`; de ahí salen `dist/cdn/…` y Playwright). */
  kit: z.string().min(1),
  /** Sello del kit que entra en la huella; por defecto `<kit>/PIN` o `dist/cdn/build-stamp.json`. */
  pinKit: z.string().optional(),
  /** Slugs a procesar (vacío = todos). */
  solo: z.array(z.string()).optional(),
  /** Ignora el caché: renderiza todo. */
  forzar: z.boolean().optional(),
  /** Intentos por diagrama (Chromium a veces no arranca). Default 5. */
  intentos: z.number().int().positive().optional(),
  /** Timeout del render de cada diagrama (ms). Default 300_000. */
  timeoutMs: z.number().int().positive().optional(),
  /** Espera tras ready antes de extraer (ms). Default 500. */
  settleMs: z.number().int().nonnegative().optional(),
  /** También PNG. Default true. */
  png: z.boolean().optional(),
});
export type OpcionesLoteDatos = z.infer<typeof OpcionesLoteDatosSchema>;

/** Opciones de `planificarLote` / `renderizarLote` (las serializables más las del proceso). */
export type OpcionesLote = OpcionesLoteDatos & {
  /** Salida de líneas (`OK …`, `SKIP …`, resumen). Default `console.log`. */
  log?: (linea: string) => void;
  /** Chromium ya cargado (solo en el hijo / caja negra); si falta, `createRequire(<kit>)('playwright')`. */
  chromium?: RenderDiagramOptions['chromium'];
};

/** Entrada del caché por diagrama. Rutas de svg/png relativas al archivo de caché (posix). */
export const EntradaCacheSchema = z.object({
  huella: z.string().length(64),
  svg: z.string(),
  png: z.string().nullable(),
  fecha: z.string(),
  ancho: z.number().nullable(),
  alto: z.number().nullable(),
});
export type EntradaCache = z.infer<typeof EntradaCacheSchema>;

/** Archivo `diagramas-iswc.cache.json`. */
export const CacheLoteSchema = z.object({
  version: z.number().int(),
  diagramas: z.record(z.string(), EntradaCacheSchema),
});
export type CacheLote = z.infer<typeof CacheLoteSchema>;

/** Decisión por diagrama del plan. */
export type DiagramaPlan = {
  slug: string;
  /** Editable de origen (absoluto). */
  archivo: string;
  accion: 'render' | 'skip' | 'error';
  /** Por qué se renderiza / se salta / falló (referencia sin resolver, editable inválido…). */
  motivo: string;
  /** sha256 del spec resuelto + pinKit + versión (vacía si `error`). */
  huella: string;
  /** Salidas absolutas. */
  svg: string;
  png: string | null;
  /** Job listo para `renderDiagramBatch` (payload ya resuelto; sin `payloadBase`). */
  job?: SyntheticDiagramJob;
};

export type PlanLote = {
  carpeta: string;
  cache: string;
  pinKit: string;
  diagramas: DiagramaPlan[];
};

export type ResultadoLote = {
  renderizados: string[];
  sinCambios: string[];
  fallidos: { slug: string; motivo: string }[];
  cache: string;
};
// ===== @fin render-lote =====
