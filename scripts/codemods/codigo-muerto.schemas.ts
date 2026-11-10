// @contexto INDICE.md · scripts/README.md
// codigo-muerto.schemas.ts — tipos del análisis de código muerto (`codigo-muerto.ts`).
// category: "how"

/** Un export de un archivo: nombre público, nombre local y forma de la declaración. */
export type ExportLocal = { nombre: string; local: string; tipo: 'declaracion' | 'clase' | 'multiple' | 'lista' | 'reexport' | 'default'; linea: number; usoInterno?: boolean };

/** Lo que el análisis saca de un archivo de código. */
export type ArchivoAnalizado = { ruta: string; exports: ExportLocal[]; usos: { especificador: string; nombres: string[] | '*' }[]; cadenas: { texto: string; nombres: string[] | '*' }[]; define: boolean };

/** Export sin consumidor, con su archivo. */
export type ExportMuerto = ExportLocal & { archivo: string };

/** Excepciones (API pública): `archivo` = [patrón, razón] (prefijo con `/` final o `*`); `simbolo` = [archivo, nombre, razón]. */
export type Excepciones = { archivo: [string, string][]; simbolo: [string, string, string][] };

/** Resultado del análisis. */
export type InformeCodigoMuerto = { muertos: ExportMuerto[]; conservados: { archivo: string; nombre: string; razon: string }[]; sinImportador: string[]; enteros: Record<string, string> };
