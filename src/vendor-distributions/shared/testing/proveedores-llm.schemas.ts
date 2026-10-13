// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/11-stagehand.md
/**
 * proveedores-llm.schemas.ts — contratos de la pila de proveedores LLM OpenAI-compatible
 * (`proveedores-llm.ts`): proveedor, archivo de llaves, sonda, cache del barrido y elección.
 * La usan los jueces (`jueces.ts`) y el controlador de Stagehand (`client/testing/stagehand.ts`).
 * W54: los tipos top-level viven en *.schemas.ts.
 *
 * Perfil: shared (sin navegador). Vendor: `dist/cdn/vendor-distributions/shared/testing/proveedores-llm.schemas.ts` → carpeta `ISU/` del consumidor (`tools/vendor.ts`, pin por fecha ISO). Sin imports relativos.
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
