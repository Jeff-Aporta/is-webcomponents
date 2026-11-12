// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid/plugins — Plugins que instala <iswc-ag-grid>. El orden importa: los
 * renderers de celdas pisan los base y filas monta sobre filtros y edicion.
 */
import { instalar as instalarCeldas } from './celdas.js';
import { instalar as instalarEdicion } from './edicion.js';
import { instalar as instalarFilas } from './filas.js';
import { instalar as instalarFiltros } from './filtros.js';
import type { GridPlugin } from './contrato.schemas.js';

export const PLUGINS: GridPlugin[] = [
  { nombre: 'celdas', instalar: instalarCeldas },
  { nombre: 'filtros', instalar: instalarFiltros },
  { nombre: 'edicion', instalar: instalarEdicion },
  { nombre: 'filas', instalar: instalarFilas },
];
