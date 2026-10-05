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

/**
 * Categorías de validación que aplica el motor. Sirven para filtrar y
 * agrupar hallazgos en el reporte final.
 */

/** Hallazgo individual producido por una prueba. */

/** Resultado de auditar un único componente del catálogo. */

/** Resultado agregado de auditar el catálogo entero. */

/**
 * Una "prueba" (test) individual: función pura que recibe los inputs y
 * devuelve hallazgos. Las pruebas se registran en una suite y se ejecutan
 * por componente.
 */

/** Contexto pasado a cada prueba: info del componente + utilidades. */

/**
 * Opciones del runner (CLI). Todos los campos son opcionales: defaults
 * razonables permiten correr `deno task audit` sin args.
 */
import type { Severidad, CategoriaHallazgo, Hallazgo, ReporteComponente, ReporteAuditoria, Prueba, ContextoPrueba, OpcionesRunner } from "./types.schemas.js";
