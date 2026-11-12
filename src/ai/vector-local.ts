// @contexto INDICE.md · src/ai/README.md
/**
 * vector-local.ts — vectores de consultas en el navegador, para cualquier componente que busque. Usa el motor `embed`, así
 * que la herramienta y la búsqueda comparten modelo. Si el modelo no está (el usuario lo pospuso o no bajó), devuelve null y
 * quien llama sigue por palabra: la búsqueda nunca se rompe.
 */
import { abrirCorpus } from './aplanado.js';
import { herramienta } from './herramientas.js';
import { motor } from './motores.js';
import { ORDEN_DEFECTO, ordenarAplanado } from './orden.js';
import type { AjusteOrden, CorpusAplanado, CorpusAplanadoJson, Motor, ResultadoOrden } from './schemas/ai.schemas.js';

/** Tope de memoria: una sesión de búsqueda no repite más consultas que esto. */
const TOPE_CACHE = 200;

let pospuesto = false;
const cache = new Map<string, Promise<Float32Array | null>>();
const corpora = new Map<string, Promise<CorpusAplanado>>();

/** Modelo listo, o null si no está: no se le vuelve a preguntar en esta visita. */
function preparar(): Promise<Motor | null> {
  if (pospuesto) return Promise.resolve(null);
  return motor({ ...herramienta('embed'), nombre: 'la búsqueda inteligente' }).catch(() => {
    pospuesto = true;
    return null;
  });
}

/** Vector normalizado de una consulta; null si el modelo no está. */
export async function vectorLocal(texto: string): Promise<Float32Array | null> {
  const m = await preparar();
  if (!m?.vectorizar) return null;
  if (!cache.has(texto)) {
    if (cache.size >= TOPE_CACHE) cache.delete(cache.keys().next().value!);
    cache.set(texto, m.vectorizar([texto]).then((v) => v[0] ?? null).catch(() => null));
  }
  return cache.get(texto)!;
}

/** Carga (una vez por URL) un corpus horneado. */
export function cargarCorpus<M = Record<string, unknown>>(url: string | URL): Promise<CorpusAplanado<M>> {
  const k = String(url);
  if (!corpora.has(k)) {
    const carga = fetch(k).then((r) => {
      if (!r.ok) throw new Error(`corpus ${k}: ${r.status}`);
      return r.json();
    }).then((j: CorpusAplanadoJson) => abrirCorpus(j));
    carga.catch(() => corpora.delete(k));
    corpora.set(k, carga);
  }
  return corpora.get(k)! as Promise<CorpusAplanado<M>>;
}

/** Ordena un corpus por significado. Null si el modelo no está: quien llama deja su orden por palabra. */
export async function ordenarPorSentido<M>(corpus: CorpusAplanado<M>, consulta: string, ajuste: AjusteOrden = ORDEN_DEFECTO): Promise<ResultadoOrden<M>[] | null> {
  const vector = await vectorLocal(consulta);
  return vector && ordenarAplanado(corpus, consulta, vector, ajuste);
}
