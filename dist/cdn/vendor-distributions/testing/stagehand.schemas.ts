// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/11-stagehand.md
/**
 * stagehand.schemas.ts — contratos del controlador compartido de Stagehand (`stagehand.ts`):
 * proveedores LLM OpenAI-compatible en orden de prioridad, sondas, generador para
 * `Stagehand.create({ model: { generate } })` y destino de pruebas por protocolo.
 * W54: los tipos top-level viven en *.schemas.ts.
 *
 * Vendor: `dist/cdn/vendor-distributions/testing/stagehand.schemas.ts` → carpeta `ISU/` del consumidor (`tools/vendor.ts`, pin por fecha ISO). Sin imports relativos.
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/11-stagehand.md
 */
import { z } from 'zod';

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
