/**
 * position.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from 'zod';

const PlacementSchema = z.union([z.literal('top'), z.literal('top-start'), z.literal('top-end'), z.literal('bottom'), z.literal('bottom-start'), z.literal('bottom-end'), z.literal('left'), z.literal('left-start'), z.literal('left-end'), z.literal('right'), z.literal('right-start'), z.literal('right-end')]);
export type Placement = z.infer<typeof PlacementSchema>;

const AnchorLikeSchema = z.union([z.unknown() /* TODO: ref Element */, z.object({
  getBoundingClientRect: z.function({ input: [], output: z.unknown() /* TODO: ref DOMRect */ }),
})]);
export type AnchorLike = z.infer<typeof AnchorLikeSchema>;

const RectSchema = z.object({
  top: z.number(),
  left: z.number(),
  right: z.number(),
  bottom: z.number(),
  width: z.number(),
  height: z.number(),
  x: z.number(),
  y: z.number(),
});
export type Rect = z.infer<typeof RectSchema>;

const SizeSchema = z.object({
  width: z.number(),
  height: z.number(),
});
export type Size = z.infer<typeof SizeSchema>;

const CoordsSchema = z.object({
  top: z.number(),
  left: z.number(),
  placement: z.string(),
});
export type Coords = z.infer<typeof CoordsSchema>;

const BoundarySchema = RectSchema;
export type Boundary = z.infer<typeof BoundarySchema>;

const ArrowOffsetSchema = z.object({
  top: z.string(),
  left: z.string(),
  right: z.string(),
  bottom: z.string(),
});
export type ArrowOffset = z.infer<typeof ArrowOffsetSchema>;

const ComputePositionOptsSchema = z.object({
  anchor: AnchorLikeSchema,
  popupEl: z.unknown() /* TODO: ref HTMLElement */,
  placement: z.string().optional(),
  distance: z.number().optional(),
  skidding: z.number().optional(),
  flip: z.boolean().optional(),
  flipFallbackPlacements: z.string().optional(),
  flipFallbackStrategy: z.union([z.literal('best-fit'), z.literal('initial')]).optional(),
  flipPadding: z.number().optional(),
  shift: z.boolean().optional(),
  shiftPadding: z.number().optional(),
  autoSize: z.union([z.literal(''), z.literal('horizontal'), z.literal('vertical'), z.literal('both')]).optional(),
  autoSizePadding: z.number().optional(),
  boundary: z.union([z.literal('viewport'), z.literal('scroll')]).optional(),
  strategy: z.union([z.literal('absolute'), z.literal('fixed')]).optional(),
  arrow: z.boolean().optional(),
  arrowSize: z.number().optional(),
  arrowPadding: z.number().optional(),
  arrowPlacement: z.string().optional(),
});
export type ComputePositionOpts = z.infer<typeof ComputePositionOptsSchema>;

const ComputePositionResultSchema = z.object({
  top: z.number(),
  left: z.number(),
  viewportTop: z.number(),
  viewportLeft: z.number(),
  placement: z.string(),
  strategy: z.string(),
  availableWidth: z.union([z.number(), z.null()]),
  availableHeight: z.union([z.number(), z.null()]),
  arrow: z.union([ArrowOffsetSchema, z.null()]),
  anchor: RectSchema,
  popupSize: SizeSchema,
});
export type ComputePositionResult = z.infer<typeof ComputePositionResultSchema>;

// ── popup-dismiss.schemas ──
/**
 * popup-dismiss.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
const PopupDismissOpcionesSchema = z.object({
  onEscape: z.function({ input: [], output: z.void() }).optional(),
  onKeydown: z.function({ input: [z.unknown() /* TODO: ref KeyboardEvent */], output: z.void() }).optional(),
  onOutside: z.function({ input: [], output: z.void() }).optional(),
  onReposition: z.function({ input: [], output: z.void() }).optional(),
  onScroll: z.function({ input: [z.unknown() /* TODO: ref Event */], output: z.void() }).optional(),
  scrollLock: z.boolean().optional(),
});
export type PopupDismissOpciones = z.infer<typeof PopupDismissOpcionesSchema>;

// ── capas.schemas ──
/** Opciones de `abrirCapaModal`: cómo se cierra (Escape, clic fuera) y qué recibe el foco al abrir. */
export type OpcionesCapaModal = { cerrar: (origen: 'escape' | 'fuera') => void; inicial?: HTMLElement | null; contenedor?: HTMLElement | null; inertizar?: boolean };
/** Una capa de la pila: modal (inert + trampa) o flotante (solo orden de Escape). */
export type Capa = { host: HTMLElement; modal: boolean; cerrar: ((origen: 'escape' | 'fuera') => void) | null; contenedor: HTMLElement | null; previo: Element | null; inertes: Element[]; liberados: Element[] };
