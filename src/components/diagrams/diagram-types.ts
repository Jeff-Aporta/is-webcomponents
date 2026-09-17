// diagram-types.ts — tipos compartidos por todos los diagramas del kit.
//
// Convenciones:
//   *Nombres*: sufijos `Spec` (entrada validada desde JSON), `Layout` (salida
//    geométrica lista para pintar), `Theme` (paleta + tipografía).
//   *Layout* siempre tiene `width`/`height` numéricos (canvas en px) y
//    `nodes`/`edges`/`groups` como colecciones planas.
//   *Edge* geométrico lleva coordenadas absolutas (x/y/angle en path y
//    decoración), ya ruteadas, listas para pintar.
//   *Hue* opcional es siempre grados HSL 0..360.
//   *Coordinate types*: usamos `{ x: number; y: number }` o `{ col: number;
//    row: number }` (rejilla de costos) según el contexto.
//   *Theme* tiene forma estable entre light y dark — lo que cambia son los
//    valores, no las claves.

// ──────────────────────────────── Theme ────────────────────────────────

export interface DiagramTheme {
  /** Color del texto principal (nombres, etiquetas). */
  text: string;
  /** Color del texto secundario (subtítulos, hints). */
  muted: string;
  /** Color de la rejilla de fondo / ejes. */
  grid: string;
  /** Fondo del panel. */
  panel: string;
  /** Borde estructural. */
  border: string;
  /** Color de acento (entidades, ejes). */
  accent: string;
  /** Fondo de bandas alternas. */
  altFill: string;
  /** Borde de bandas alternas. */
  altBorder: string;
  /** Fondo del chip de etiqueta. */
  chipFill: string;
  /** Fondo del chip suave (etiqueta sobre arista, no tapa la línea). */
  chipFillSoft: string;
  /** Color del texto dentro del dot de actor. */
  dotText: string;
}

// ──────────────────────────────── Group ────────────────────────────────

export interface DiagramGroup {
  id: string;
  name: string;
  hue?: number;
}

// ──────────────────────────────── Geometry ────────────────────────────────

export interface Point { x: number; y: number; }
export interface Rect extends Point {
  width: number;
  height: number;
  cx: number;
  cy: number;
}
export interface GridPoint { col: number; row: number; }

// ──────────────────────────────── Sides ────────────────────────────────

export type BoxSide = 'left' | 'right' | 'top' | 'bottom' | 'auto';

// ──────────────────────────────── Edge variants ────────────────────────────────

export type EdgeVariant = 'default' | 'emphasis' | 'security' | 'dashed';

// ──────────────────────────────── Style overrides ────────────────────────────────

export interface NodeStyleOverride {
  fill?: string;
  stroke?: string;
  strokeWidth?: number;
  paddingX?: number;
  paddingY?: number;
  marginX?: number;
  marginY?: number;
  radius?: number;
  opacity?: number;
}

export interface EdgeStyleOverride extends NodeStyleOverride {
  width?: number;
}

// ──────────────────────────────── Diagram components ────────────────────────────────

export type ComponentType =
  | 'frontend'
  | 'backend'
  | 'database'
  | 'cloud'
  | 'security'
  | 'messagebus'
  | 'external';

// ──────────────────────────────── Class diagram ────────────────────────────────

export interface ClassSpecClass {
  id: string;
  name: string;
  stereotype?: string;
  group?: string;
  hue?: number;
  attributes: string[];
  methods: string[];
}

export type ClassRelationKind =
  | 'association'
  | 'inheritance'
  | 'composition'
  | 'aggregation'
  | 'dependency'
  | 'realization';

export interface ClassSpecRelation {
  id: string;
  from: string;
  to: string;
  kind: ClassRelationKind;
  label?: string;
  fromLabel?: string;
  toLabel?: string;
  group?: number;
}

export interface ClassSpec {
  title?: string;
  subtitle?: string;
  direction: 'TB' | 'BT' | 'LR' | 'RL';
  classes: ClassSpecClass[];
  relations: ClassSpecRelation[];
  groups?: DiagramGroup[];
}

export interface ClassLayoutSection {
  type: 'header' | 'attributes' | 'methods';
  y: number;
  h: number;
  rows: string[];
}

export interface ClassLayoutNode {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  layer: number;
  name: string;
  stereotype?: string;
  description?: string;
  sections: ClassLayoutSection[];
  dividerYs: number[];
  hue?: number;
  group?: string;
  overflow?: 'grow' | 'shrink';
}


export interface ClassLayoutEdge {
  id: string;
  from: string;
  to: string;
  kind: ClassRelationKind;
  label?: string;
  fromLabel?: string;
  toLabel?: string;
  path: string;
  targetTipX: number;
  targetTipY: number;
  targetAngle: number;
  sourceTipX: number;
  sourceTipY: number;
  sourceAngle: number;
  labelX: number;
  labelY: number;
  labelW?: number;
  hue?: number;
}

export interface ClassLayout {
  width: number;
  height: number;
  nodes: ClassLayoutNode[];
  edges: ClassLayoutEdge[];
  groups?: DiagramGroup[];
  title?: string;
  subtitle?: string;
  titleY: number;
  subtitleY: number;
  legendX: number;
}

// ──────────────────────────────── ER diagram ────────────────────────────────

export type ErCardinality = 'one' | 'many' | 'zeroOrOne' | 'zeroOrMany';

export interface ErSpecAttribute {
  name: string;
  type?: string;
  key?: 'PK' | 'FK';
  comment?: string;
}

export interface ErSpecEntity {
  id: string;
  name: string;
  group?: string;
  attributes: ErSpecAttribute[];
  hue?: number;
  /** Posición lockeada (archify-style `pos`). */
  pos?: [number, number];
  /** Tamaño override (archify-style `size`). */
  size?: [number, number];
  /** Override de estilo visual. */
  style?: NodeStyleOverride;
  /** Label (alias de `name`). */
  label?: string;
}

export type ErRouteKind = 'auto' | 'straight' | 'orthogonal' | 'orthogonal-h' | 'orthogonal-v';
export type ErDashStyle = 'solid' | 'dashed' | 'dotted';

export interface ErSpecRelation {
  id: string;
  from: string;
  to: string;
  label?: string;
  fromCard: ErCardinality;
  toCard: ErCardinality;
  identifying: boolean;
  /** archify-style: routing explícito por relación. */
  route?: ErRouteKind;
  fromSide?: BoxSide;
  toSide?: BoxSide;
  /** Waypoints intermedios para A*. */
  via?: [number, number][];
  /** Posición explícita de la etiqueta. */
  labelAt?: [number, number];
  labelDx?: number;
  labelDy?: number;
  labelSegment?: number;
  dashStyle?: ErDashStyle;
  width?: number;
  variant?: EdgeVariant;
  style?: EdgeStyleOverride;
}

export interface ErSpec {
  title?: string;
  subtitle?: string;
  direction: 'TB' | 'BT' | 'LR' | 'RL';
  ratio: number;
  groups?: DiagramGroup[];
  entities: ErSpecEntity[];
  relations: ErSpecRelation[];
  meta?: {
    title?: string;
    subtitle?: string;
    animation?: 'trace' | 'none';
    locale?: 'en' | 'zh-CN';
  };
}

export interface ErLayoutEntity {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  layer: number;
  name: string;
  attributes: ErSpecAttribute[];
  group?: string;
  hue?: number;
  style?: NodeStyleOverride;
  locked?: boolean;
}

export interface ErLayoutEdgeMark {
  x: number;
  y: number;
  angle: number;
  path: string;
  circle?: { cx: number; cy: number; r: number };
}

export interface ErLayoutEdge {
  id: string;
  from: string;
  to: string;
  label?: string;
  hue?: number;
  identifying: boolean;
  path: string;
  fromMark: ErLayoutEdgeMark;
  toMark: ErLayoutEdgeMark;
  labelX: number;
  labelY: number;
  labelW?: number;
  route?: ErRouteKind;
  fromSide?: BoxSide;
  toSide?: BoxSide;
  dashStyle?: ErDashStyle;
  variant?: EdgeVariant;
  width?: number;
  style?: EdgeStyleOverride;
}

export interface ErLayout {
  width: number;
  height: number;
  entities: ErLayoutEntity[];
  relations: ErLayoutEdge[];
  clusters?: Array<{
    id: string | null;
    name: string;
    hue?: number;
    x: number;
    y: number;
    w: number;
    h: number;
  }>;
  groups?: DiagramGroup[];
  title?: string;
  subtitle?: string;
  titleY: number;
  subtitleY: number;
  titleLines?: string[];
  subtitleLines?: string[];
  legendX: number;
  legendY?: number;
  ratio?: number;
}

// ──────────────────────────────── Diagram Editor ────────────────────────────────

export interface ErEditorState {
  entities: ErSpecEntity[];
  relations: ErSpecRelation[];
  meta?: ErSpec['meta'];
  groups?: DiagramGroup[];
  title?: string;
  subtitle?: string;
  direction?: ErSpec['direction'];
  ratio?: number;
}
