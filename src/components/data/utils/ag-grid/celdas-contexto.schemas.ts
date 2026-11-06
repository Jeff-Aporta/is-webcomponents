/** Tipos de contexto.ts. */
import type { RendererCelda, RendererMontable } from './contrato.schemas.js';

export type RegistroRenderers = (nombre: string) => RendererCelda | RendererMontable | undefined;

export type Seleccion = { component?: unknown; params?: Record<string, unknown> } | null | undefined;

export type Funcion = (p: unknown) => unknown;
