/**
 * Tipos compartidos del motor auditor (iswc-audit).
 *
 * Todo lo que el motor necesita para describir hallazgos, severidades y
 * resultados de las pruebas. Independientes del framework, así pueden
 * reutilizarse desde el validador de JSON, desde el validador de
 * consistencia componente↔JSON, desde el runner de Stagehand y desde
 * el reporter CLI.
 *
 * Convenciones:
 *   - Severidad: 'fatal' bloquea el build; 'error' rompe funcionalidad;
 *     'warn' es mejorable; 'info' es anotación.
 *   - Las pruebas son PURE (sin side effects): reciben inputs y devuelven
 *     hallazgos. La orquestación (recorrer catálogo, navegar con browser)
 *     es responsabilidad de los runners, no de los validadores.
 */

/** Severidad de un hallazgo individual. */
export type Severidad = 'fatal' | 'error' | 'warn' | 'info';

/**
 * Categorías de validación que aplica el motor. Sirven para filtrar y
 * agrupar hallazgos en el reporte final.
 */
export type CategoriaHallazgo =
  | 'json-schema'         // Definición no cumple con is-preview/v1
  | 'json-contenido'      // HTML dentro del JSON tiene problemas
  | 'json-complejidad'    // Estructuras complejas sin JSON
  | 'consistencia'        // Componente no expone lo que el JSON declara
  | 'playground'          // Controles del demo no conectados
  | 'runtime'             // Errores en runtime (consola, listeners)
  | 'demo-html'           // HTML del demo no renderiza lo esperado
  | 'cdn'                 // Componente no servible por CDN
  | 'export'              // Componente no exportado por el kit
  | 'a11y'                // Problemas de accesibilidad
  | 'theming'             // Tokens no respetan paleta/tema
  | 'visual';             // Layout / alineación / estilos

/** Hallazgo individual producido por una prueba. */
export interface Hallazgo {
  /** Categoría del hallazgo (qué prueba lo emitió). */
  categoria: CategoriaHallazgo;
  /** Severidad del hallazgo. */
  severidad: Severidad;
  /** Tag del componente afectado (ej. "is-button"). null si es global. */
  tag: string | null;
  /** Ruta del archivo relativo a la raíz del proyecto (cuando aplique). */
  ruta?: string;
  /** Mensaje humano: breve, accionable. */
  mensaje: string;
  /** Detalle extra: stack, valor, diff, etc. (opcional). */
  detalle?: unknown;
  /** Sugerencia de corrección (opcional). */
  sugerencia?: string;
  /** Línea dentro del archivo (1-based, opcional). */
  linea?: number;
}

/** Resultado de auditar un único componente del catálogo. */
export interface ReporteComponente {
  /** Tag del componente (ej. "is-button"). */
  tag: string;
  /** Categoría manifest del componente (actions, data-viz, …). */
  categoria: string;
  /** Título legible del componente. */
  titulo: string;
  /** Ruta del JSON de preview (relativa a src/). */
  rutaJson: string;
  /** Ruta del módulo JS/TS del componente (si existe). */
  rutaModulo?: string;
  /** Hallazgos del componente. */
  hallazgos: Hallazgo[];
  /** Métricas opcionales (tiempo, número de demos, controles, etc.). */
  metricas?: Record<string, number | string>;
  /** Estado global del componente: ok / warning / fail. */
  estado: 'ok' | 'warning' | 'fail';
}

/** Resultado agregado de auditar el catálogo entero. */
export interface ReporteAuditoria {
  /** Versión del motor que emitió el reporte. */
  motorVersion: string;
  /** ISO timestamp de inicio. */
  inicio: string;
  /** ISO timestamp de fin. */
  fin: string;
  /** Duración en ms. */
  duracionMs: number;
  /** Total de componentes auditados. */
  totalComponentes: number;
  /** Total de hallazgos por severidad. */
  conteo: Record<Severidad, number>;
  /** Resultado por componente (en el orden de auditoría). */
  componentes: ReporteComponente[];
  /** Errores a nivel de motor (ej.Stagehand no arranca). */
  erroresMotor: Hallazgo[];
}

/**
 * Una "prueba" (test) individual: función pura que recibe los inputs y
 * devuelve hallazgos. Las pruebas se registran en una suite y se ejecutan
 * por componente.
 */
export interface Prueba<TInput = unknown> {
  /** Identificador único de la prueba (kebab-case). */
  id: string;
  /** Categoría a la que pertenece. */
  categoria: CategoriaHallazgo;
  /** Descripción humana (aparece en logs y reportes). */
  descripcion: string;
  /** Función de la prueba. */
  ejecutar(input: TInput, ctx: ContextoPrueba): Promise<Hallazgo[]> | Hallazgo[];
}

/** Contexto pasado a cada prueba: info del componente + utilidades. */
export interface ContextoPrueba {
  /** Tag del componente. */
  tag: string;
  /** Categoría manifest. */
  categoria: string;
  /** Título. */
  titulo: string;
  /** Ruta absoluta del JSON en disco. */
  rutaJsonAbsoluta: string;
  /** Definición cruda parseada (is-preview/v1). */
  definicion: unknown;
  /** Fuente raw del JSON (string). */
  fuenteJson: string;
  /** Stagehand page activa (si la prueba e2e está habilitada). */
  page?: unknown;
}

/**
 * Opciones del runner (CLI). Todos los campos son opcionales: defaults
 * razonables permiten correr `node --import ... motor/cli.ts` sin args.
 */
export interface OpcionesRunner {
  /** Tag(s) a auditar (separados por coma). Vacío = todos. */
  solo?: string[];
  /** Categorías a auditar (separadas por coma). Vacío = todas. */
  categorias?: string[];
  /** Límite de componentes a procesar (0 = sin límite). */
  limite?: number;
  /** Puerto del dev server (0 = arrancar uno propio). */
  puerto?: number;
  /** URL base del servidor (default: http://127.0.0.1:Puerto/). */
  urlBase?: string;
  /** Saltar pruebas E2E con Stagehand (más rápido, menos exhaustivo). */
  saltarE2E?: boolean;
  /** Solo validar JSON (sin tocar el navegador). */
  soloJson?: boolean;
  /** Ruta del archivo de salida del reporte (JSON). Vacío = stdout. */
  salidaJson?: string;
  /** Ruta del archivo de salida del reporte (Markdown). Vacío = stdout. */
  salidaMarkdown?: string;
  /** Modo verbose: imprime cada hallazgo mientras se ejecuta. */
  verbose?: boolean;
  /** Si falla algún 'fatal', exit code != 0 (default true). */
  fallarEnFatal?: boolean;
}