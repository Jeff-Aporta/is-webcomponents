// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/11-stagehand.md
/**
 * llaves-cooldown.ts — cooldown de 24 h para las llaves de los jueces (proveedores LLM y JEV).
 *
 * Regla: una llave que falla por saldo, key rechazada o cuota (fallo DEFINITIVO) queda en cooldown
 * 24 h: se escribe `cooldownHasta` (ISO) en su entrada del archivo de llaves y nadie la vuelve a
 * intentar hasta esa hora. Cuando se resuelve (se recargó saldo o se puso una llave vigente), se
 * edita A MANO `cooldownHasta: -1` y el algoritmo la reintenta de inmediato; si vuelve a funcionar,
 * el `-1` se queda (no estorba) y si vuelve a fallar se pone otra vez la fecha.
 *
 * El archivo es `{ proveedores: [ ... ], jev: { ... } }`; cada entrada se identifica por `nombre`
 * (o `model`). Escribir es opcional: si el archivo no se puede escribir, el cooldown vive solo en
 * memoria de este proceso y se avisa.
 *
 * Vendor: `dist/cdn/vendor-distributions/testing/llaves-cooldown.ts` → carpeta del consumidor junto a `stagehand.ts`. Imports relativos que deben viajar con él: `./llaves-cooldown.schemas.ts`.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { ZEntradaLlave } from './llaves-cooldown.schemas.ts';
import type { EstadoLlave, TEntradaLlave } from './llaves-cooldown.schemas.ts';

export type * from './llaves-cooldown.schemas.ts';

/** Duración del cooldown tras un fallo definitivo. */
export const COOLDOWN_LLAVE_MS = 24 * 60 * 60_000;

/** Cooldowns de este proceso (respaldo si el archivo no se puede escribir). */
const enMemoria = new Map<string, number>();

const esObjeto = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const nombreDe = (e: TEntradaLlave): string => e.nombre ?? e.model ?? '';

/** Estado de una entrada cruda del archivo: disponible, o en cooldown con el motivo y cómo reactivarla. */
export function estadoLlave(entrada: unknown, now: number = Date.now()): EstadoLlave {
  const r = ZEntradaLlave.safeParse(entrada);
  const nombre = r.success ? nombreDe(r.data) : '';
  const memoria = enMemoria.get(nombre);
  const hasta = r.success && typeof r.data.cooldownHasta === 'string' ? Date.parse(r.data.cooldownHasta) : memoria ?? NaN;
  if (Number.isFinite(hasta) && hasta > now) {
    return { disponible: false, motivo: `${nombre || 'llave'} en cooldown hasta ${new Date(hasta).toISOString()} (para reintentar ya: cooldownHasta: -1 en el archivo de llaves)` };
  }
  return { disponible: true, motivo: 'ok' };
}

/**
 * Pone en cooldown (24 h por defecto) la entrada `nombre` del archivo `ruta` (en `proveedores[]` o en
 * cualquier objeto de primer nivel con ese `nombre`). Nunca lanza; devuelve el motivo para el aviso.
 */
export function marcarCooldown(ruta: string | undefined, nombre: string, causa: string, o: { now?: number; ms?: number } = {}): string {
  const now = o.now ?? Date.now();
  const hasta = now + (o.ms ?? COOLDOWN_LLAVE_MS);
  enMemoria.set(nombre, hasta);
  const iso = new Date(hasta).toISOString();
  const motivo = `${nombre}: ${causa} → cooldown hasta ${iso} (para reintentar ya: cooldownHasta: -1)`;
  if (!ruta || !existsSync(ruta)) return `${motivo} [solo en memoria: sin archivo de llaves]`;
  try {
    const doc: unknown = JSON.parse(readFileSync(ruta, 'utf8'));
    if (!esObjeto(doc)) return `${motivo} [solo en memoria: archivo sin objeto raíz]`;
    let tocada = false;
    const marcar = (e: unknown): void => {
      if (esObjeto(e) && (e.nombre === nombre || (!e.nombre && e.model === nombre))) { e.cooldownHasta = iso; tocada = true; }
    };
    if (Array.isArray(doc.proveedores)) doc.proveedores.forEach(marcar);
    // Entradas de primer nivel: por su `nombre` o por su clave (`jev: { ... }` sin nombre).
    for (const [k, v] of Object.entries(doc)) {
      if (Array.isArray(v)) continue;
      if (k === nombre && esObjeto(v) && !v.nombre) { v.cooldownHasta = iso; tocada = true; } else marcar(v);
    }
    if (!tocada) return `${motivo} [solo en memoria: ${nombre} no está en el archivo]`;
    writeFileSync(ruta, `${JSON.stringify(doc, null, 2)}\n`);
    return motivo;
  } catch (e) {
    return `${motivo} [solo en memoria: ${e instanceof Error ? e.message : String(e)}]`;
  }
}

/** Olvida los cooldowns en memoria (pruebas). */
export function olvidarCooldownsEnMemoria(): void {
  enMemoria.clear();
}
