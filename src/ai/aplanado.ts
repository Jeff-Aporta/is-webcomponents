/**
 * aplanado.ts — vectores chicos para búsquedas en el navegador (sin DOM ni dependencias). Una transformación lineal
 * guardada en el JSON del corpus se aplica IGUAL al corpus (en el build) y a cada consulta (en el navegador): centrar,
 * multiplicar por la matriz y cuantizar. El ajuste vive en `aplanado-ajuste.ts`. No sabe de ninguna tabla: cualquier
 * app hornea su corpus con esto.
 */
import type { Aplanado, AplanadoJson, CorpusAplanado, CorpusAplanadoJson, Empaque } from './schemas/ai.schemas.js';

const BYTES = { 8: Int8Array, 16: Int16Array } as const;
const TOPE = { 8: 127, 16: 32767 } as const;

/** Pasa filas de números a enteros; con `global` una sola escala para todas las filas, si no una por fila. */
export function empacar(filas: ArrayLike<number>[], bits: 8 | 16, global = false): Empaque {
  const largo = filas[0]!.length;
  const maximo = (f: ArrayLike<number>): number => Array.from(f).reduce((m, x) => Math.max(m, Math.abs(x)), 1e-12);
  const comun = global ? filas.reduce((m, f) => Math.max(m, maximo(f)), 0) / TOPE[bits] : 0;
  const escalas = global ? [comun] : filas.map((f) => maximo(f) / TOPE[bits]);
  const enteros = new BYTES[bits](filas.length * largo);
  filas.forEach((f, i) => {
    const e = global ? comun : escalas[i]!;
    for (let d = 0; d < largo; d++) enteros[i * largo + d] = Math.round(f[d]! / e);
  });
  const crudo = new Uint8Array(enteros.buffer);
  let bin = '';
  for (let i = 0; i < crudo.length; i++) bin += String.fromCharCode(crudo[i]!);
  return { bits, escalas: escalas.map((e) => Number(e.toPrecision(7))), datos: btoa(bin) };
}

/** Inverso de `empacar`; `largo` es el tamaño de cada fila. */
export function desempacar(e: Empaque, largo: number): Float32Array[] {
  const bin = atob(e.datos);
  const crudo = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) crudo[i] = bin.charCodeAt(i);
  const enteros = new BYTES[e.bits](crudo.buffer);
  const filas: Float32Array[] = [];
  for (let i = 0; i < enteros.length / largo; i++) {
    const f = new Float32Array(largo);
    const escala = e.escalas[e.escalas.length === 1 ? 0 : i]!;
    for (let d = 0; d < largo; d++) f[d] = enteros[i * largo + d]! * escala;
    filas.push(f);
  }
  return filas;
}

/** Bits de signo en base64, una fila tras otra. */
function empacarBits(filas: ArrayLike<number>[]): string {
  const largo = filas[0]!.length;
  const crudo = new Uint8Array(Math.ceil(filas.length * largo / 8));
  filas.forEach((f, i) => {
    for (let d = 0; d < largo; d++) {
      const p = i * largo + d;
      if (f[d]! > 0) crudo[p >> 3]! |= 1 << (p & 7);
    }
  });
  let bin = '';
  for (let i = 0; i < crudo.length; i++) bin += String.fromCharCode(crudo[i]!);
  return btoa(bin);
}

function desempacarBits(datos: string, n: number, largo: number): Float32Array[] {
  const bin = atob(datos);
  return Array.from({ length: n }, (_, i) => Float32Array.from({ length: largo }, (_x, d) => {
    const p = i * largo + d;
    return bin.charCodeAt(p >> 3) >> (p & 7) & 1 ? 1 : -1;
  }));
}

/** Centra y multiplica, sin cuantizar. */
function transformar(v: ArrayLike<number>, a: Aplanado): Float32Array {
  const entrada = a.media ? Float32Array.from(v, (x, i) => x - a.media![i]!) : Float32Array.from(v);
  if (!a.matriz) return entrada.slice(0, a.dims);
  const salida = new Float32Array(a.dims);
  for (let f = 0; f < a.dims; f++) {
    const fila = a.matriz[f]!;
    let s = 0;
    for (let i = 0; i < fila.length; i++) s += fila[i]! * entrada[i]!;
    salida[f] = s;
  }
  return salida;
}

/** Deja un vector en la misma rejilla que el corpus. */
function cuantizar(v: Float32Array, a: Aplanado): Float32Array {
  const c = a.cuantizacion;
  if (c.tipo === 'bits') return v.map((x) => (x > 0 ? 1 : -1));
  if (c.tipo === 'decimales') return v.map((x) => Number(x.toFixed(c.decimales)));
  const tope = TOPE[c.tipo === 'int8' ? 8 : 16];
  return v.map((x) => Math.max(-tope, Math.min(tope, Math.round(x / a.escala))) * a.escala);
}

/** Lo que se le hace a todo vector, venga del corpus o de la consulta. */
export const aplanar = (v: ArrayLike<number>, a: Aplanado): Float32Array => cuantizar(transformar(v, a), a);

/** Vectores del corpus en crudo, para fijar la escala antes de cuantizar. */
export const transformarCorpus = (vectores: ArrayLike<number>[], a: Aplanado): Float32Array[] => vectores.map((v) => transformar(v, a));

/** Corpus aplanado como viaja en el JSON. */
export function empacarVectores(vectores: Float32Array[], a: Aplanado): Empaque | number[][] {
  const c = a.cuantizacion;
  if (c.tipo === 'bits') return { bits: 8, escalas: [], datos: empacarBits(vectores) };
  if (c.tipo === 'decimales') return vectores.map((v) => Array.from(v, (x) => Number(x.toFixed(c.decimales))));
  return empacar(vectores, c.tipo === 'int8' ? 8 : 16, true);
}

export function empacarAplanado(a: Aplanado, bitsMatriz: 8 | 16): AplanadoJson {
  return { ...a, media: a.media && empacar([a.media], 16), matriz: a.matriz && empacar(a.matriz, bitsMatriz) };
}

export function desempacarAplanado(j: AplanadoJson): Aplanado {
  const media = j.media && desempacar(j.media, j.media.datos.length * 3 / 4 / (j.media.bits / 8))[0]!;
  const largo = j.matriz ? atob(j.matriz.datos).length / (j.matriz.bits / 8) / j.dims : 0;
  return { ...j, media, matriz: j.matriz && desempacar(j.matriz, largo) };
}

/** JSON del corpus → listo para buscar. */
export function abrirCorpus<M>(j: CorpusAplanadoJson<M>): CorpusAplanado<M> {
  const aplanado = desempacarAplanado(j.aplanado);
  const v = j.vectores;
  if (Array.isArray(v)) return { modelo: j.modelo, aplanado, items: j.items, vectores: v.map((f) => Float32Array.from(f)) };
  const vectores = aplanado.cuantizacion.tipo === 'bits' ? desempacarBits(v.datos, j.items.length, aplanado.dims) : desempacar(v, aplanado.dims);
  return { modelo: j.modelo, aplanado, items: j.items, vectores };
}
