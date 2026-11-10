// @contexto INDICE.md · src/components/actions/README.md
/**
 * dropdown.ts — Zod schemas para los tipos extraídos de este módulo.
 *
 * Generado por `scripts/migrate-zod.py`. Refinar manualmente las
 * entradas marcadas con TODO cuando se quiera validación runtime.
 */
import { z } from "zod";

const PlacementSchema = z.unknown() /* TODO: cannot convert */;
export type Placement = z.infer<typeof PlacementSchema>;

const DropdownItemElSchema = z.intersection(z.unknown() /* TODO: ref HTMLElement */, z.object({
  disabled: z.boolean().optional(),
  type: z.string().optional(),
  closeSubmenu: z.function({ input: [], output: z.void() }).optional(),
}));
export type DropdownItemEl = z.infer<typeof DropdownItemElSchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type DropdownEventos = { 'iswc-show': undefined; 'iswc-after-show': undefined; 'iswc-hide': undefined; 'iswc-after-hide': undefined; 'iswc-select': { item: DropdownItemEl } };
