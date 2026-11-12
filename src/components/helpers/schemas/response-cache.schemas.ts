// @contexto INDICE.md · src/components/helpers/README.md
/**
 * response-cache.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const CreateResponseCacheOptsSchema = z.object({
  dbName: z.string().optional(),
  storeName: z.string().optional(),
  ttlMs: z.number().optional(),
  timeoutMs: z.number().optional(),
});
export type CreateResponseCacheOpts = z.infer<typeof CreateResponseCacheOptsSchema>;

const ClaveDeInputSchema = z.object({
  app: z.string().optional(),
  metodo: z.string().optional(),
  ruta: z.string().optional(),
  cuerpo: z.unknown().optional(),
  quien: z.string().optional(),
  user: z.string().optional(),
  method: z.string().optional(),
  path: z.string().optional(),
  body: z.unknown().optional(),
});
export type ClaveDeInput = z.infer<typeof ClaveDeInputSchema>;

const CachedRowSchema = z.object({
  clave: z.string(),
  datos: z.unknown(),
  texto: z.string(),
  guardadoEn: z.number(),
});
/** Fila cacheada: la clave, los datos y su texto canonico. */
export type CachedRow<T = unknown> = Omit<z.infer<typeof CachedRowSchema>, 'datos'> & { datos: T };

/** Aviso de "vivo": de donde sale el dato y si cambio respecto al cache. */
export type VivoAviso = { origen: 'cache' | 'red'; cambio: boolean };

/** Opciones de `vivo()`: la clave y los callbacks de pintado. */
export type VivoOpts<T = unknown> = {
  key: string;
  pintar?: (datos: T, aviso: VivoAviso) => void;
  onCached?: (datos: T, aviso: VivoAviso) => void;
  onError?: (e: unknown) => void;
};

/**
 * Cache de respuestas (SWR): pinta lo ultimo conocido al instante y
 * repinta solo si la red difiere.
 */
export type ResponseCache = {
  dbName: string;
  storeName: string;
  ttlMs: number;
  canonico: (valor: unknown) => string;
  claveDe: (input?: ClaveDeInput) => string;
  leer: <T = unknown>(clave: string) => Promise<CachedRow<T> | null>;
  guardar: <T = unknown>(clave: string, datos: T) => Promise<boolean>;
  borrar: (clave: string) => Promise<void>;
  invalidar: (coincide: string | ((c: string) => boolean)) => Promise<void>;
  vaciar: () => Promise<void>;
  vivo: <T = unknown>(fetchFresh: () => Promise<T>, opts: VivoOpts<T>) => Promise<T>;
};

