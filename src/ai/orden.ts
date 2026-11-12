// @contexto INDICE.md · src/ai/README.md
/**
 * orden.ts — ordena por coincidencia exacta y por significado, sin DOM ni modelo. Lo exacto va primero; después pesan el
 * coseno y un empujón léxico que aguanta prefijos y errores de tecleo. Ordena, no oculta: `relevante` dice qué es hallazgo.
 */
import { aplanar } from './aplanado.js';
import type { AjusteOrden, CorpusAplanado, IndiceItem, ItemBuscable, ResultadoOrden } from './schemas/ai.schemas.js';

/** Punto de partida medido con emojis (recall@5 0,73 en 90 KB): un corpus nuevo lo hereda y solo cambia lo que mida. */
export const ORDEN_DEFECTO: AjusteOrden = { exacta: 'palabra', minimoExacta: 2, pesoLexico: 0.8, pesoTexto: 0.5, tipificar: false, umbral: 3 };

/** Similitud coseno (los vectores vienen normalizados: es el producto punto, renormalizado por la cuantización). */
export function coseno(a: ArrayLike<number>, b: ArrayLike<number>): number {
  let p = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < a.length; i++) {
    const x = a[i]!;
    const y = b[i]!;
    p += x * y;
    na += x * x;
    nb += y * y;
  }
  return na && nb ? p / Math.sqrt(na * nb) : 0;
}

/** Texto sin acentos, en minúsculas y con espacios simples. */
export const normalizar = (s: string): string => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();

/** Palabras sin peso en español e inglés: solo cuentan si la consulta no trae otras. */
const VACIAS = new Set('a al con de del el en es la las lo los me mi mis para por que se su sus te tu un una uno y o ir quiero hay como mas muy estoy tengo tienes este esta esto eso ese ser son fue algo the an of to for on in at is are am i my your you and or it so very we'.split(' '));

export const palabrasDe = (s: string): string[] => normalizar(s).split(/[^a-z0-9ñ]+/).filter(Boolean);

/** Palabras útiles de una consulta. */
export function palabrasConsulta(q: string): string[] {
  const todas = palabrasDe(q);
  const utiles = todas.filter((p) => !VACIAS.has(p));
  return utiles.length ? utiles : todas;
}

/** Distancia de edición con transposición, cortada en `tope`. */
function distancia(a: string, b: string, tope: number): number {
  if (Math.abs(a.length - b.length) > tope) return tope + 1;
  let previa2: number[] = [];
  let previa = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const fila = [i];
    for (let j = 1; j <= b.length; j++) {
      const costo = a[i - 1] === b[j - 1] ? 0 : 1;
      let d = Math.min(previa[j]! + 1, fila[j - 1]! + 1, previa[j - 1]! + costo);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) d = Math.min(d, previa2[j - 2]! + 1);
      fila.push(d);
    }
    previa2 = previa;
    previa = fila;
  }
  return previa[b.length]!;
}

/** Cuánto se parece una palabra de la consulta a una del ítem: igual, prefijo, raíz o error de tecleo. */
function parecido(q: string, w: string): number {
  if (q === w) return 1;
  if (q.length >= 3 && w.startsWith(q)) return 0.85;
  if (q.length > 5 && w.length > 5 && q.slice(0, 5) === w.slice(0, 5)) return 0.75;
  if (q.length < 4 || w.length < 4) return 0;
  const tope = q.length >= 7 ? 2 : 1;
  const d = distancia(q, w, tope);
  return d > tope ? 0 : 1 - 0.2 * d;
}

const mejor = (q: string, palabras: string[]): number => palabras.reduce((m, w) => Math.max(m, parecido(q, w)), 0);

/** Puntaje léxico 0..1 que aguanta errores: `clave` pesa 1 y el resto `pesoTexto`. */
export function lexicoTolerante(consulta: string[], clave: string[], texto: string[], pesoTexto: number): number {
  if (!consulta.length) return 0;
  return consulta.reduce((s, q) => s + Math.max(mejor(q, clave), pesoTexto * mejor(q, texto)), 0) / consulta.length;
}

const indices = new WeakMap<object, IndiceItem[]>();

/** Índice de palabras de una lista de ítems; se calcula una sola vez por lista. */
export function indiceDe(items: ItemBuscable[]): IndiceItem[] {
  if (!indices.has(items)) indices.set(items, items.map((i) => ({ clave: palabrasDe(i.clave), texto: palabrasDe(i.texto), plano: normalizar(`${i.clave} ${i.texto}`) })));
  return indices.get(items)!;
}

/** ¿La consulta aparece tal cual en el ítem? Lo exacto va primero, según `AjusteOrden.exacta`. */
export function esExacta(consulta: string[], crudo: string, i: IndiceItem, modo: AjusteOrden['exacta'], minimo: number): boolean {
  if (modo === 'ninguna' || crudo.length < minimo) return false;
  if (modo === 'subcadena') return i.plano.includes(crudo);
  const donde = modo === 'palabra-clave' ? i.clave : [...i.clave, ...i.texto];
  return consulta.length > 0 && consulta.every((p) => donde.includes(p));
}

/** Une señales ya calculadas: exactas primero, luego coseno (tipificado por consulta si se pide) + empujón léxico. */
export function combinar(sentido: ArrayLike<number>, lexicos: ArrayLike<number>, exactas: boolean[], a: AjusteOrden): { puntaje: number; relevante: boolean }[] {
  const n = sentido.length;
  let media = 0;
  for (let i = 0; i < n; i++) media += sentido[i]! / n;
  let varianza = 0;
  for (let i = 0; i < n; i++) varianza += (sentido[i]! - media) ** 2 / n;
  const desvio = Math.sqrt(varianza) || 1;
  return Array.from({ length: n }, (_, i) => {
    const z = (sentido[i]! - media) / desvio;
    const base = a.tipificar ? z : sentido[i]!;
    return { puntaje: (exactas[i] ? 1e3 : 0) + base + a.pesoLexico * lexicos[i]!, relevante: exactas[i]! || lexicos[i]! >= 0.75 || z >= a.umbral };
  });
}

/** Busca en un corpus aplanado. `vector` es el de la consulta, completo; sin él ordena solo por palabra. */
export function ordenarAplanado<M>(corpus: CorpusAplanado<M>, consulta: string, vector: ArrayLike<number> | null, a: AjusteOrden = ORDEN_DEFECTO): ResultadoOrden<M>[] {
  const crudo = normalizar(consulta);
  const palabras = palabrasConsulta(consulta);
  const indice = indiceDe(corpus.items as ItemBuscable[]);
  const plano = vector ? aplanar(vector, corpus.aplanado) : null;
  const sentido = corpus.items.map((_, i) => (plano ? coseno(plano, corpus.vectores[i]!) : 0));
  const lexicos = indice.map((x) => lexicoTolerante(palabras, x.clave, x.texto, a.pesoTexto));
  const exactas = indice.map((x) => esExacta(palabras, crudo, x, a.exacta, a.minimoExacta));
  const unidos = combinar(sentido, lexicos, exactas, a);
  return corpus.items
    .map((item, i) => ({ item, exacta: exactas[i]!, lexico: lexicos[i]!, sentido: sentido[i]!, ...unidos[i]! }))
    .sort((x, y) => y.puntaje - x.puntaje);
}
