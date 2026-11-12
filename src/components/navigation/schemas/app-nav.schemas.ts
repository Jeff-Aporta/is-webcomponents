// @contexto INDICE.md · src/components/navigation/README.md
/**
 * app-nav.schemas.ts — Forma de `rows` de <iswc-app-nav> (contrato público, ver specs/app-shell/spec.md).
 */
import { z } from "zod";

const AppNavTabSchema = z.object({
  id: z.string(),
  label: z.string(),
  icon: z.string().optional(),
  href: z.string().optional(),
  hidden: z.boolean().optional(),
  disabled: z.boolean().optional(),
});
export type AppNavTab = z.infer<typeof AppNavTabSchema>;

const AppNavRowSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  value: z.string().optional(),
  parent: z.string().optional(),
  tabs: z.array(AppNavTabSchema),
});
export type AppNavRow = z.infer<typeof AppNavRowSchema>;

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type AppNavEventos = { 'iswc-nav-select': { row: string; id: string; href: string | null } };
