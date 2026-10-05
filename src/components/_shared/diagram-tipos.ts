/**
 * diagram-tipos.ts — Formas compartidas por los diagramas de componentes.
 *
 * POR QUÉ AQUÍ. `component-pack.ts` y `component-spec.ts` se pasan los mismos
 * objetos —cajas, paquetes, aristas— y ninguno de los dos los declaraba: entre
 * ambos sumaban 443 errores, casi todos por parámetros que el compilador no
 * podía deducir porque nadie había escrito qué son.
 *
 * Las formas están sacadas de cómo se usan de verdad en esos dos ficheros, no
 * de una API ideal. `x`, `y`, `w` y `h` son obligatorias porque el empaquetado
 * las escribe siempre; el resto es opcional porque el payload del consumidor
 * puede no traerlo.
 *
 * MUTABLES A PROPÓSITO. El empaquetado reposiciona las cajas in situ (`c.x =
 * …`), así que estas interfaces no llevan `readonly`: marcarlas lo haría
 * mentir sobre lo que el módulo hace con ellas.
 */

/** Rectángulo colocado. La unidad de todo el layout. */

/** Un componente del diagrama. */

/**
 * Un paquete: contorno que agrupa componentes.
 *
 * Su geometría no la pone el consumidor, la calcula el empaquetado como unión
 * ortogonal de sus hijos — por eso hereda de `Caja` igual que un componente.
 */

/** Arista entre dos componentes, por id. */

/** Lado de una caja por el que entra o sale una arista. */

/**
 * Opciones de empaquetado y ruteo.
 *
 * Es un saco heterogéneo porque lo comparten el empaquetado y el trazado de
 * aristas, que se llaman con el mismo objeto. Separarlo en dos exigiría tocar
 * a los dos consumidores; se deja documentado por bloques.
 */

/** Punto suelto: extremos y vértices de las aristas trazadas. */

/**
 * Interfaz UML anclada al borde de un componente (la «piruleta»).
 *
 * `cx`/`cy` no vienen del payload: los calcula el trazado y los escribe aquí,
 * por eso son opcionales y mutables.
 */
import type { Caja, Componente, Paquete, Arista, Lado, OpcionesEmpaque, Punto, InterfazUml } from "./diagram-tipos.schemas.js";
