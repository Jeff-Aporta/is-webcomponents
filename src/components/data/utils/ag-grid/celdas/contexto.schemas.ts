/** Tipos de contexto.ts. */

import type { RendererCelda, RendererMontable } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/contrato.schemas.js';

export type RegistroRenderers = (nombre: string) => RendererCelda | RendererMontable | undefined;

export type Seleccion = { component?: unknown; params?: Record<string, unknown> } | null | undefined;

export type Funcion = (p: unknown) => unknown;
