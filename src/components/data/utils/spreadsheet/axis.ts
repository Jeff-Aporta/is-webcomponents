// axis.ts — geometría de un eje con tamaños variables y ocultos, para la virtualización. Los
// tamaños van en em; las búsquedas son logarítmicas sobre los índices con tamaño propio.

/** Eje de filas o columnas. */
export class Axis {
  #count: number;
  #size: number;
  #keys: number[] = [];
  #sizes = new Map<number, number>();
  #delta: number[] = [];

  /** `special` da el tamaño de los índices fuera de lo común (0 si está oculto). */
  constructor(count: number, size: number, special: Map<number, number>) {
    this.#count = count;
    this.#size = size;
    this.#keys = [...special.keys()].filter((i) => i < count).sort((a, b) => a - b);
    let acc = 0;
    for (const k of this.#keys) {
      const s = special.get(k)!;
      this.#sizes.set(k, s);
      acc += s - size;
      this.#delta.push(acc);
    }
  }

  get count(): number { return this.#count; }
  get total(): number { return this.offset(this.#count); }

  /** Tamaño de un índice. */
  size(i: number): number { return this.#sizes.get(i) ?? this.#size; }

  /** Cuántas claves son menores que i. */
  #rank(i: number): number {
    let lo = 0;
    let hi = this.#keys.length;
    while (lo < hi) {
      const m = (lo + hi) >> 1;
      if (this.#keys[m] < i) lo = m + 1;
      else hi = m;
    }
    return lo;
  }

  /** Posición del borde inicial de un índice. */
  offset(i: number): number {
    const rank = this.#rank(i);
    return i * this.#size + (rank ? this.#delta[rank - 1] : 0);
  }

  /** Índice que contiene una posición. */
  indexAt(pos: number): number {
    if (pos <= 0) return 0;
    let lo = 0;
    let hi = this.#count - 1;
    while (lo < hi) {
      const m = (lo + hi + 1) >> 1;
      if (this.offset(m) <= pos) lo = m;
      else hi = m - 1;
    }
    return lo;
  }
}
