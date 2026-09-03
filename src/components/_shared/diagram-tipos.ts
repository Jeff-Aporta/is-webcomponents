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
export type Caja = { x: number; y: number; w: number; h: number; };

/** Un componente del diagrama. */
export interface Componente extends Caja {
  id: string;
  /** Id del paquete que lo contiene; `undefined` si va suelto. */
  package?: string | undefined;
  name?: string;
  stereotype?: string | undefined;
  /** Matiz de color; lo elige el consumidor. */
  hue?: number | undefined;

  /*
   * Listas que el lector normaliza desde varios alias del payload
   * (`provides`/`expose`/`exposes`, etc.). Quedan en `unknown[]` porque el
   * consumidor mete tanto cadenas como objetos y cada uso las estrecha.
   */
  provides?: unknown[];
  requires?: unknown[];
  connects?: unknown[];
  /** Endpoints o líneas del cuerpo de la caja. */
  items?: unknown[];
}

/**
 * Un paquete: contorno que agrupa componentes.
 *
 * Su geometría no la pone el consumidor, la calcula el empaquetado como unión
 * ortogonal de sus hijos — por eso hereda de `Caja` igual que un componente.
 */
export interface Paquete extends Caja {
  id: string;
  name?: string;
  stereotype?: string | undefined;
  /** Matiz de color; lo elige el consumidor. */
  hue?: number | undefined;
}

/** Arista entre dos componentes, por id. */
export interface Arista {
  from: string;
  to: string;
  [extra: string]: unknown;
}

/** Lado de una caja por el que entra o sale una arista. */
export type Lado = 'top' | 'right' | 'bottom' | 'left';

/**
 * Opciones de empaquetado y ruteo.
 *
 * Es un saco heterogéneo porque lo comparten el empaquetado y el trazado de
 * aristas, que se llaman con el mismo objeto. Separarlo en dos exigiría tocar
 * a los dos consumidores; se deja documentado por bloques.
 */
export interface OpcionesEmpaque {
  /** `manual` no recoloca nada; `triptych` usa el layout de tres columnas. */
  mode?: 'manual' | 'triptych' | string;
  /** Ids de paquetes que se disuelven antes de empaquetar. */
  ungroup?: unknown[];

  /* Separaciones. Sin valor, se usan las constantes del módulo. */
  colGutter?: number;
  pkgCorridor?: number;
  rowGap?: number;
  minGap?: number;
  pad?: number;
  tabH?: number;
  clearance?: number;
  sourceGap?: number;

  /* Ruteo de una arista concreta. */
  fromBox?: Caja;
  toBox?: Caja;
  fromSide?: Lado;
  toSide?: Lado;
  /** Ids o cajas de origen, segun quien llame. */
  sources?: unknown[];
  /** Mapa id -> lado forzado. No es una lista: lo produce `asRecord`. */
  sourceSides?: Record<string, unknown>;
  /** Cajas que la arista debe rodear. */
  wrapBoxes?: readonly Caja[];
  /** Marco exterior al que se confina el trazado. */
  frame?: Caja;
  /** Segmentos ya ocupados por otras aristas, para no solaparlas. */
  usedSegs?: unknown[];
}

/** Punto suelto: extremos y vértices de las aristas trazadas. */
export interface Punto {
  x: number;
  y: number;
}

/**
 * Interfaz UML anclada al borde de un componente (la «piruleta»).
 *
 * `cx`/`cy` no vienen del payload: los calcula el trazado y los escribe aquí,
 * por eso son opcionales y mutables.
 */
export interface InterfazUml {
  id: string;
  /** Id del componente al que se ancla. */
  component: string;
  name?: string | undefined;
  side: Lado;
  /** Desplazamiento a lo largo del lado, en px. */
  offset: number;
  kind: 'provided' | 'required';
  cx?: number;
  cy?: number;
  /** La calcula el trazado: si quedó pegada a otra interfaz. */
  docked?: boolean;
}
