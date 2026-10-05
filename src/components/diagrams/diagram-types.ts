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

// ──────────────────────────────── Group ────────────────────────────────

// ──────────────────────────────── Geometry ────────────────────────────────

// ──────────────────────────────── Sides ────────────────────────────────

// ──────────────────────────────── Edge variants ────────────────────────────────

// ──────────────────────────────── Style overrides ────────────────────────────────

// ──────────────────────────────── Diagram components ────────────────────────────────

// ──────────────────────────────── Class diagram ────────────────────────────────

// ──────────────────────────────── ER diagram ────────────────────────────────

// ──────────────────────────────── Diagram Editor ────────────────────────────────

import type { DiagramTheme, DiagramGroup, Point, Rect, GridPoint, BoxSide, EdgeVariant, NodeStyleOverride, EdgeStyleOverride, ComponentType, ClassSpecClass, ClassRelationKind, ClassSpecRelation, ClassSpec, ClassLayoutSection, ClassLayoutNode, ClassLayoutEdge, ClassLayout, ErCardinality, ErSpecAttribute, ErSpecEntity, ErRouteKind, ErDashStyle, ErSpecRelation, ErSpec, ErLayoutEntity, ErLayoutEdgeMark, ErLayoutEdge, ErLayout, ErEditorState } from "./diagram-types.schemas.js";
