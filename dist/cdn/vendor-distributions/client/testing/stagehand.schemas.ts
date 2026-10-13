// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/11-stagehand.md
/**
 * stagehand.schemas.ts — contratos del controlador de Stagehand (`stagehand.ts`): generador para
 * `Stagehand.create({ model: { generate } })` y destino de pruebas por protocolo. Los de la pila de
 * proveedores LLM viven en `shared/testing/proveedores-llm.schemas.ts` y se reexportan aquí.
 * W54: los tipos top-level viven en *.schemas.ts.
 *
 * Perfil: client (e2e de navegador). Vendor: `dist/cdn/vendor-distributions/client/testing/stagehand.schemas.ts` → carpeta `ISU/` del consumidor (`tools/vendor.ts`, pin por fecha ISO). Imports relativos que deben viajar con él: `../../shared/testing/proveedores-llm.schemas.ts` (vendor.ts reescribe la ruta al aplanar).
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/11-stagehand.md
 */
import type { EleccionProveedor, OpcionesElegirProveedor, ProveedorLlm } from '../../shared/testing/proveedores-llm.schemas.ts';

export type * from '../../shared/testing/proveedores-llm.schemas.ts';

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
