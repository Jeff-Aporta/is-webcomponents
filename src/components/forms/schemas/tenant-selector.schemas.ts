// @contexto INDICE.md · src/components/forms/README.md
/**
 * tenant-selector.schemas.ts — props de `<iswc-tenant-selector>`.
 */
import { z } from "zod";

/** Un cliente (empresa, organización, espacio) al que pertenece el usuario. */
const TenantOpcionSchema = z.object({ id: z.union([z.string(), z.number()]), nombre: z.string() });

export const TenantSelectorPropsSchema = z.object({
  opciones: z.array(TenantOpcionSchema),
  /** Id activo; sin él se muestra la primera opción. */
  activa: z.union([z.string(), z.number()]).nullable(),
  icono: z.string(),
  /** `aria-label` del selector. */
  etiqueta: z.string(),
  /** Texto de la etiqueta cuando no hay opciones. */
  sinOpciones: z.string(),
});
export type TenantSelectorProps = z.infer<typeof TenantSelectorPropsSchema>;

/** Detalle de `iswc-tenant-change`: el id tal como vino en `opciones`. */
const TenantChangeDetailSchema = z.object({ id: z.union([z.string(), z.number()]) });
export type TenantChangeDetail = z.infer<typeof TenantChangeDetailSchema>;

/** Lo que este componente lee de `iswc-select`. */
export type TenantSelectEl = HTMLElement & { value: string };

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type TenantSelectorEventos = { 'iswc-tenant-change': TenantChangeDetail };
