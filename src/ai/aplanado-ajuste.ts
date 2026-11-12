// @contexto INDICE.md · src/ai/README.md
/**
 * aplanado-ajuste.ts — calcula la transformación de `aplanado.ts`. Solo corre en el build y en el benchmark: el
 * navegador recibe el resultado. Determinista: mismos vectores, misma matriz.
 *
 *   pca        ejes de mayor varianza; `blanqueo` 0..1 iguala su peso (1 = PCA blanqueado)
 *   lda        ejes que separan ítems entre sí y juntan las frases de un mismo ítem (requiere `clases`)
 *   aleatoria  proyección gaussiana con semilla
 *   truncado   primeras `dims` entradas
 *   ninguno    todas las entradas, centradas
 */
import { transformarCorpus } from './aplanado.js';
import type { Aplanado, Eigen, Muestras, Receta } from './schemas/ai.schemas.js';

const media = (filas: ArrayLike<number>[]): Float64Array => {
  const m = new Float64Array(filas[0]!.length);
  for (const f of filas) for (let i = 0; i < m.length; i++) m[i]! += f[i]! / filas.length;
  return m;
};

/** Matriz de dispersión (simétrica) respecto de `centro`, dividida por el número de filas. */
function dispersion(filas: ArrayLike<number>[], centro: Float64Array | ((i: number) => Float64Array)): Float64Array[] {
  const n = filas[0]!.length;
  const c = Array.from({ length: n }, () => new Float64Array(n));
  filas.forEach((f, k) => {
    const m = typeof centro === 'function' ? centro(k) : centro;
    const d = Float64Array.from({ length: n }, (_, i) => f[i]! - m[i]!);
    for (let i = 0; i < n; i++) {
      const fila = c[i]!;
      const di = d[i]!;
      for (let j = i; j < n; j++) fila[j]! += di * d[j]!;
    }
  });
  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      c[i]![j]! /= filas.length;
      c[j]![i] = c[i]![j]!;
    }
  }
  return c;
}

/** Autovalores de una simétrica por Jacobi cíclico: exacto y sin dependencias; orden descendente y signo fijo. */
function autodescomponer(a: Float64Array[]): Eigen {
  const n = a.length;
  const v = Array.from({ length: n }, (_, i) => Float64Array.from({ length: n }, (_x, j) => (i === j ? 1 : 0)));
  for (let barrido = 0; barrido < 30; barrido++) {
    let fuera = 0;
    for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) fuera += a[p]![q]! ** 2;
    if (fuera < 1e-24) break;
    for (let p = 0; p < n - 1; p++) {
      for (let q = p + 1; q < n; q++) {
        const apq = a[p]![q]!;
        if (Math.abs(apq) < 1e-15) continue;
        const theta = (a[q]![q]! - a[p]![p]!) / (2 * apq);
        const t = Math.sign(theta || 1) / (Math.abs(theta) + Math.sqrt(theta * theta + 1));
        const c = 1 / Math.sqrt(t * t + 1);
        const s = t * c;
        for (let k = 0; k < n; k++) {
          const akp = a[k]![p]!;
          const akq = a[k]![q]!;
          a[k]![p] = c * akp - s * akq;
          a[k]![q] = s * akp + c * akq;
        }
        const filaP = a[p]!;
        const filaQ = a[q]!;
        for (let k = 0; k < n; k++) {
          const apk = filaP[k]!;
          const aqk = filaQ[k]!;
          filaP[k] = c * apk - s * aqk;
          filaQ[k] = s * apk + c * aqk;
          const vkp = v[k]![p]!;
          const vkq = v[k]![q]!;
          v[k]![p] = c * vkp - s * vkq;
          v[k]![q] = s * vkp + c * vkq;
        }
      }
    }
  }
  const orden = Array.from({ length: n }, (_, i) => i).sort((i, j) => a[j]![j]! - a[i]![i]!);
  const vectores = orden.map((col) => {
    const e = Float64Array.from({ length: n }, (_, k) => v[k]![col]!);
    const mayor = e.reduce((m, x) => (Math.abs(x) > Math.abs(m) ? x : m), 0);
    return mayor < 0 ? e.map((x) => -x) : e;
  });
  return { valores: Float64Array.from(orden, (i) => a[i]![i]!), vectores };
}

/** Generador con semilla (mulberry32) para que la proyección aleatoria se pueda rehacer. */
function aleatorio(semilla: number): () => number {
  let s = semilla >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const memoPca = new WeakMap<object, Eigen>();
const memoLda = new WeakMap<object, Map<number, Float64Array[]>>();

function pca(m: Muestras, dims: number, blanqueo: number, centro: Float64Array): Float64Array[] {
  const llave = m.extra ?? m.base;
  if (!memoPca.has(llave)) memoPca.set(llave, autodescomponer(dispersion([...m.base, ...(m.extra ?? [])], centro)));
  const e = memoPca.get(llave)!;
  return e.vectores.slice(0, dims).map((v, i) => {
    const peso = Math.max(e.valores[i]!, 1e-9) ** (-blanqueo / 2);
    return v.map((x) => x * peso);
  });
}

/** LDA regularizado: blanquea la dispersión dentro de cada ítem y busca los ejes que más separan sus centroides. */
function lda(m: Muestras, dims: number, regularizacion: number): Float64Array[] {
  if (!m.clases) throw new Error('lda requiere clases');
  if (!memoLda.has(m.clases)) memoLda.set(m.clases, new Map());
  const memo = memoLda.get(m.clases)!;
  if (!memo.has(regularizacion)) {
    const centros = m.clases.map((c) => media(c));
    const asignacion = m.clases.flatMap((c, i) => c.map(() => i));
    const dentro = dispersion(m.clases.flat(), (k) => centros[asignacion[k]!]!);
    const n = dentro.length;
    const traza = dentro.reduce((s, f, i) => s + f[i]!, 0) / n;
    dentro.forEach((f, i) => (f[i]! += regularizacion * traza));
    const d = autodescomponer(dentro);
    const blanco = d.vectores.map((v, i) => v.map((x) => x / Math.sqrt(Math.max(d.valores[i]!, 1e-12))));
    const entre = dispersion(centros, media(centros));
    const pasado = blanco.map((b) => entre.reduce((acc, fila, i) => {
      let s = 0;
      for (let j = 0; j < n; j++) s += fila[j]! * b[j]!;
      acc[i] = s;
      return acc;
    }, new Float64Array(n)));
    const interno = blanco.map((b) => Float64Array.from(pasado, (p) => {
      let s = 0;
      for (let j = 0; j < n; j++) s += b[j]! * p[j]!;
      return s;
    }));
    const e = autodescomponer(interno);
    memo.set(regularizacion, e.vectores.map((v) => {
      const eje = new Float64Array(n);
      v.forEach((peso, i) => {
        for (let j = 0; j < n; j++) eje[j]! += peso * blanco[i]![j]!;
      });
      return eje;
    }));
  }
  return memo.get(regularizacion)!.slice(0, dims);
}

/** Ajusta la transformación y fija la escala de cuantización con el corpus ya transformado. */
export function ajustar(m: Muestras, r: Receta): Aplanado {
  const centro = media([...m.base, ...(m.extra ?? [])]);
  const entrada = centro.length;
  const filas = r.metodo === 'pca'
    ? pca(m, r.dims, r.blanqueo ?? 0, centro)
    : r.metodo === 'lda'
    ? lda(m, r.dims, r.regularizacion ?? 0.1)
    : r.metodo === 'aleatoria'
    ? gaussiana(r.dims, entrada, r.semilla ?? 1)
    : null;
  const usaMedia = r.metodo !== 'truncado' && r.metodo !== 'aleatoria';
  const a: Aplanado = {
    metodo: r.metodo,
    dims: r.dims,
    media: usaMedia ? Float32Array.from(centro) : null,
    matriz: filas && filas.map((f) => Float32Array.from(f)),
    cuantizacion: r.cuantizacion,
    escala: 1,
  };
  const crudos = transformarCorpus(m.base, a);
  const maximo = crudos.reduce((t, v) => v.reduce((s, x) => Math.max(s, Math.abs(x)), t), 1e-12);
  a.escala = r.cuantizacion.tipo === 'int8' ? maximo / 127 : r.cuantizacion.tipo === 'int16' ? maximo / 32767 : 1;
  return a;
}

function gaussiana(dims: number, entrada: number, semilla: number): Float64Array[] {
  const azar = aleatorio(semilla);
  return Array.from({ length: dims }, () => {
    const f = Float64Array.from({ length: entrada }, () => Math.sqrt(-2 * Math.log(1 - azar())) * Math.cos(2 * Math.PI * azar()));
    const n = Math.hypot(...f);
    return f.map((x) => x / n);
  });
}
