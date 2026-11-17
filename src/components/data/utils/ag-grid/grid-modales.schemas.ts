// @contexto INDICE.md · src/components/data/README.md
/** Tipos de grid-modales.ts. */

/** Los datos que se exportan: ya filtrados, ordenados y recortados. */
export type DatosExportacion = {
  /** Las columnas, en el orden pedido. */
  columnas: { colId: string; headerName: string; field: string }[];
  /** Las filas, en el orden pedido. */
  filas: (string | number)[][];
};

/**
 * Un exportador del grid. CSV y Excel (xlsx) vienen de serie; la app puede registrar otros
 * con la opción `exporters` del grid (un id igual a uno de serie se ignora).
 */
export type ExportadorGrid = {
  /** Identificador del exportador. */
  id: string;
  /** Lo que pone en el botón. */
  etiqueta: string;
  /** Extensión del archivo (sin punto). */
  extension: string;
  /** Arma el archivo con los datos ya preparados. */
  construir: (datos: DatosExportacion) => Blob;
};

/** Lo que el modal necesita del grid (el api llega por función: aún no existe al montar). */
export type CtxModales = {
  /** El api del grid (o null si aún no está listo). */
  api: () => any;
  /** La sombra del grid: la plantilla y los diálogos viven ahí. */
  root: ShadowRoot;
  /** Avisa al grid de que algo cambió (para repintar). */
  refrescar?: () => void;
  /** Los exportadores que ofrece el grid (el CSV viene de serie). */
  exportadores?: () => ExportadorGrid[];
  /** Un texto del grid por su clave (con el español por defecto). */
  texto?: (clave: string, porDefecto: string) => string;
};
