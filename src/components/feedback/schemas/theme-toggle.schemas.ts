/**
 * theme-toggle.schemas.ts — tipos de `<iswc-theme-toggle>`.
 */
import { z } from 'zod';

/** Tema del contenedor (`data-theme`). */
export const ThemeNameSchema = z.enum(['dark', 'light']);
export type ThemeName = z.infer<typeof ThemeNameSchema>;

/** Detalle del evento `iswc-theme-change`: el tema aplicado y el contenedor que lo recibió. */
export type ThemeChangeDetail = { theme: ThemeName; dark: boolean; container: HTMLElement };

/** Evento del `<iswc-check-icon-button>` interno (noche ↔ sol). */
export interface IsCheckIconButtonEvent extends CustomEvent<{ checked: boolean }> {}
