// @contexto INDICE.md · src/components/diagrams/README.md
/**
 * org-chart.schemas.ts — tipos de `<iswc-org-chart>`.
 */

import type { DiagramViewerDetail } from './diagram-base.schemas.js';

/** Eventos del componente (HOW-6): `declare static events` en la clase; los documenta scripts/sondas/eventos.ts. */
export type OrgChartEventos = { 'iswc-toggle': { id: string; collapsed: boolean }; 'iswc-select': { id: string; node: unknown }; 'iswc-open-viewer': DiagramViewerDetail };
