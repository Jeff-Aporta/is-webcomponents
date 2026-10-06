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
 *
 * Tipos canónicos: `diagram-tipos.schemas.ts` (Zod). Aquí solo re-export.
 */
export type {
  Caja,
  Componente,
  Paquete,
  Arista,
  Lado,
  OpcionesEmpaque,
  Punto,
  InterfazUml,
} from './diagram-tipos.schemas.js';
