// @vendor 2026-10-13T15:51:18.306Z Jeff-Aporta/is-webcomponents@main dist/cdn/vendor-distributions/shared/testing/semantica.ts
// @doc https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/12-jueces.md
/**
 * semantica.ts — juez semántico DETERMINISTA de las pruebas (tercera capa, antes de JEV/LLM):
 * embeddings locales con `multilingual-e5-base` (ONNX cuantizado, Xenova) vía
 * `@huggingface/transformers` (devDependency del CONSUMIDOR; en Deno `npm:@huggingface/transformers`).
 * Portado del ISS (`tests/_shared/semantica.ts`, WT-2026-10-08, Jeff); la calibración sigue en el ISS
 * (`tests/unit/74-semantica-what.test.ts`) y el kit la replica en `meta/semantica.test.ts`.
 *
 * SIN RED: el modelo sale SOLO del cache de Hugging Face del equipo (`~/.cache/huggingface/hub`) o de
 * `TEST_E5_MODEL_DIR`; nunca se descarga. Si no está, `semanticaDisponible()` es `false` y las funciones
 * LANZAN un error claro: el test que las use se salta con ese motivo (nunca verde por omisión).
 *
 * Orden de las capas de juicio (todas opcionales, ninguna obligatoria): primero lo simple (igualdad,
 * regex, `expect`), luego la semántica (esto: local, determinista, sin llaves), por último JEV/LLM
 * (`jueces.ts`: red, llaves, cooldown).
 *
 * Calibración: e5 comprime las similitudes (coseno de pares NO relacionados ~0,70-0,81; relacionados
 * ~0,86-0,96). Por eso hay dos formas de preguntar:
 *   - `coincide(texto, deseado)`           umbral absoluto UMBRAL_COINCIDE.
 *   - `prefiere(texto, deseado, contrario)` contraste: la orientación deseada le gana a la contraria por
 *     al menos MARGEN_PREFIERE. Es la forma robusta para respuestas largas del LLM (una respuesta de
 *     600 chars baja el coseno absoluto aunque hable exactamente del tema).
 *
 * Regla para escribir orientaciones: textos PLAUSIBLES del asistente («Lo siento, no puedo ayudarte con
 * esa consulta…»), nunca meta-descripciones («rechaza la consulta»): e5 compara textos y una
 * meta-descripción que nombra el tema empata con la respuesta útil.
 *
 * Perfil: shared (sin navegador). Vendor: `dist/cdn/vendor-distributions/shared/testing/semantica.ts` → carpeta `ISU/` del consumidor (`tools/vendor.ts`, pin por fecha ISO). Imports relativos que deben viajar con él: `../schemas.ts` (sección `semantica`).
 * Skill: skills/iswc-foundation/references/12-jueces.md
 * Doc: https://cdn.jsdelivr.net/gh/Jeff-Aporta/is-webcomponents@main/skills/iswc-foundation/references/12-jueces.md
 */
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import process from 'node:process';
import type { ExtractorSemantico, ResultadoCoincide, ResultadoMasCercana, ResultadoPrefiere, UbicacionModelo } from '../schemas.ts';

export type { ExtractorSemantico, ResultadoCoincide, ResultadoMasCercana, ResultadoPrefiere, UbicacionModelo } from '../schemas.ts';

export const MODELO = 'Xenova/multilingual-e5-base';
/** Coseno mínimo para decir que dos textos hablan de lo mismo (calibrado: pares no relacionados quedan < 0,82). */
export const UMBRAL_COINCIDE = 0.84;
/** Ventaja mínima de la orientación deseada sobre la contraria. */
export const MARGEN_PREFIERE = 0.02;

let extractorP: Promise<ExtractorSemantico> | null = null;
const cache = new Map<string, Float32Array>();

/** Dónde está el modelo en el equipo (`TEST_E5_MODEL_DIR` o el cache de Hugging Face), o `null`. */
export function ubicacionModelo(env: Record<string, string | undefined> = process.env): UbicacionModelo | null {
  const dir = env.TEST_E5_MODEL_DIR;
  if (dir && existsSync(join(dir, 'config.json'))) return { localModelPath: join(dir, '..'), id: dir.split(/[\\/]/).filter(Boolean).pop() ?? '' };
  const snaps = join(homedir(), '.cache', 'huggingface', 'hub', `models--${MODELO.replace('/', '--')}`, 'snapshots');
  if (!existsSync(snaps)) return null;
  const hash = readdirSync(snaps).find((h) => existsSync(join(snaps, h, 'config.json')));
  return hash ? { localModelPath: snaps, id: hash } : null;
}

/** `true` si el modelo está disponible en el equipo (para decidir un skip explícito con motivo). */
export function semanticaDisponible(): boolean {
  return ubicacionModelo() !== null;
}

/** Motivo del skip cuando no hay modelo (el mismo texto del error que lanzan las funciones). */
export const MOTIVO_SIN_MODELO = `semantica: no está el modelo ${MODELO} en ~/.cache/huggingface/hub ni en TEST_E5_MODEL_DIR (nunca se descarga)`;

async function extractor(): Promise<ExtractorSemantico> {
  if (!extractorP) {
    extractorP = (async () => {
      const dir = ubicacionModelo();
      if (!dir) throw new Error(MOTIVO_SIN_MODELO);
      // Import dinámico: la lib es devDependency del consumidor y solo se carga si de verdad se usa.
      const tf = await import('@huggingface/transformers') as {
        env: { allowRemoteModels: boolean; localModelPath: string };
        pipeline: (tarea: 'feature-extraction', modelo: string, opciones: { dtype: string }) => Promise<ExtractorSemantico>;
      };
      tf.env.allowRemoteModels = false;
      tf.env.localModelPath = dir.localModelPath;
      return tf.pipeline('feature-extraction', dir.id, { dtype: 'q8' });
    })();
    extractorP.catch(() => { extractorP = null; });
  }
  return extractorP;
}

/** Embedding normalizado (e5 espera el prefijo `query:` en ambos lados para similitud simétrica). */
export async function embed(texto: string): Promise<Float32Array> {
  const key = String(texto ?? '').trim().replace(/\s+/g, ' ').slice(0, 2000);
  const hit = cache.get(key);
  if (hit) return hit;
  const fe = await extractor();
  const out = await fe(`query: ${key}`, { pooling: 'mean', normalize: true });
  const v = Float32Array.from(out.data, Number);
  cache.set(key, v);
  return v;
}

export function coseno(a: Float32Array, b: Float32Array): number {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += (a[i] ?? 0) * (b[i] ?? 0);
  return Math.round(s * 1000) / 1000;
}

/** Similitud [−1, 1] entre dos textos. */
export async function similitud(a: string, b: string): Promise<number> {
  return coseno(await embed(a), await embed(b));
}

/** `texto` habla de lo mismo que `deseado` (umbral absoluto). Devuelve el detalle para el mensaje del expect. */
export async function coincide(texto: string, deseado: string, umbral = UMBRAL_COINCIDE): Promise<ResultadoCoincide> {
  const sim = await similitud(texto, deseado);
  return { ok: sim >= umbral, sim, umbral };
}

/**
 * `texto` se orienta más hacia `deseado` que hacia `contrario` (contraste). Con varios candidatos,
 * `deseado`/`contrario` pueden ser listas: se toma el mejor de cada lado.
 */
export async function prefiere(texto: string, deseado: string | string[], contrario: string | string[], margen = MARGEN_PREFIERE): Promise<ResultadoPrefiere> {
  const v = await embed(texto);
  const mejor = async (c: string | string[]) => Math.max(...(await Promise.all((Array.isArray(c) ? c : [c]).map(async (x) => coseno(v, await embed(x))))));
  const simDeseado = await mejor(deseado);
  const simContrario = await mejor(contrario);
  return { ok: simDeseado - simContrario >= margen, simDeseado, simContrario, margen };
}

/** Entre varias orientaciones, la que más se parece a `texto` (clasificación por cercanía). */
export async function masCercana(texto: string, opciones: Record<string, string>): Promise<ResultadoMasCercana> {
  const v = await embed(texto);
  const todas: Record<string, number> = {};
  for (const [k, t] of Object.entries(opciones)) todas[k] = coseno(v, await embed(t));
  const [clave = '', sim = Number.NaN] = Object.entries(todas).sort((a, b) => b[1] - a[1])[0] ?? [];
  return { clave, sim, todas };
}
