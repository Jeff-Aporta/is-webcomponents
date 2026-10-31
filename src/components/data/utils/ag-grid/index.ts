/**
 * ag-grid/index — Plugins que instala <iswc-ag-grid>. El orden importa: los
 * renderers de celdas pisan los base y filas monta sobre filtros y edicion.
 */

import { instalar as instalarCeldas } from './celdas/index.js';
import { instalar as instalarEdicion } from './edicion/index.js';
import { instalar as instalarFilas } from './filas/index.js';
import { instalar as instalarFiltros } from './filtros/index.js';
import type { GridPlugin } from './contrato.js';

export const PLUGINS: GridPlugin[] = [
  { nombre: 'celdas', instalar: instalarCeldas },
  { nombre: 'filtros', instalar: instalarFiltros },
  { nombre: 'edicion', instalar: instalarEdicion },
  { nombre: 'filas', instalar: instalarFilas },
];
