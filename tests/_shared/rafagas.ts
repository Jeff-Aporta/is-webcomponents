// @contexto INDICE.md · tests/_shared/README.md
/**
 * rafagas.ts — agrupa las peticiones de una carga en ráfagas (plan carga modular, F4/F7).
 *
 * Una ráfaga es un grupo de peticiones que el navegador lanza juntas. Ordenadas por inicio, una petición abre una
 * ráfaga nueva si empieza más de `umbralMs` (50 ms) después del inicio de la anterior. Una cascada (cada `import()`
 * descubre el siguiente nivel al terminar el anterior) sale como una ráfaga por nivel cuando el servidor tarda más
 * que el umbral en responder: por eso las pruebas sirven con latencia (> umbral) y así la cuenta no depende de lo
 * rápido que sea el disco local.
 */

/** Una petición medida: URL, inicio y fin en ms desde el arranque de la medición. */
export type Peticion = { url: string; inicio: number; fin: number | null };

/** Ráfagas en orden de inicio; cada una con sus peticiones en orden. */
export function rafagas(peticiones: readonly Peticion[], umbralMs = 50): Peticion[][] {
  const orden = [...peticiones].sort((a, b) => a.inicio - b.inicio);
  const out: Peticion[][] = [];
  let previa: Peticion | null = null;
  for (const p of orden) {
    if (!previa || p.inicio - previa.inicio > umbralMs) out.push([]);
    out[out.length - 1]!.push(p);
    previa = p;
  }
  return out;
}

/**
 * Ráfagas encadenadas: como `rafagas`, pero una ráfaga que empezó ANTES de que terminara alguna petición de la
 * anterior se une a ella. Así cuenta solo la cascada real (un nivel que espera la respuesta del anterior) y no el
 * escalonado que mete un hilo principal cargado (el loader inyecta los `modulepreload` con > 50 ms entre sí cuando el
 * equipo está ocupado: visto en el gate de F7b, 3 «ráfagas» sin ninguna espera entre ellas). Con el servidor de las
 * pruebas respondiendo con latencia > umbral, un nivel nuevo siempre empieza después de un `fin` del anterior.
 */
export function rafagasEncadenadas(peticiones: readonly Peticion[], umbralMs = 50): Peticion[][] {
  const out: Peticion[][] = [];
  for (const g of rafagas(peticiones, umbralMs)) {
    const previa = out[out.length - 1];
    const finPrevio = previa ? Math.min(...previa.map((p) => p.fin ?? Infinity)) : -Infinity;
    if (previa && g[0]!.inicio < finPrevio) previa.push(...g);
    else out.push([...g]);
  }
  return out;
}

/** URLs pedidas más de una vez (misma URL exacta, query incluida). */
export function duplicadas(peticiones: readonly Peticion[]): string[] {
  const n = new Map<string, number>();
  for (const p of peticiones) n.set(p.url, (n.get(p.url) ?? 0) + 1);
  return [...n].filter(([, k]) => k > 1).map(([u]) => u);
}

/** Rutas (sin query) pedidas más de una vez: dos `?v=` del mismo módulo lo evaluarían dos veces. */
export function rutasDuplicadas(peticiones: readonly Peticion[]): string[] {
  return duplicadas(peticiones.map((p) => ({ ...p, url: p.url.split(/[?#]/)[0]! })));
}
