/**
 * Motor auditor central (orquestador).
 *
 * Recibe una raíz de proyecto y opciones, recorre el catálogo entero,
 * ejecuta las pruebas por componente y agrega los hallazgos en un
 * `ReporteAuditoria` único. Es el ÚNICO punto que llama a los
 * validadores; los runners (CLI, Stagehand, programmatic) solo le
 * pasan opciones.
 *
 * Fases del motor (orden importa):
 *   1. enumerar catálogo (catalog.ts)
 *   2. por cada entrada: cargar JSON, parsear, ejecutar:
 *      a. validarEsquema (json-schema.ts)
 *      b. ejecutarValidacionContenido (json-contenido.ts)
 *      c. extraerMetaComponente + ejecutarValidacionConsistencia (consistency.ts)
 *      d. auditarRuntimeComponente (runtime.ts)
 *   3. si E2E está habilitado: inspeccionar con Stagehand
 *   4. agregar y devolver ReporteAuditoria
 */

import { enumerarCatalogo, filtrarCatalogo, resumirCatalogo, walkComponentes } from './catalog.js';
import type { EntradaCatalogo } from './catalog.js';
import { cargarDefinicion } from '../engine/cargar.js';
import type {
  Hallazgo, ReporteAuditoria, ReporteComponente, Severidad,
  OpcionesRunner, ContextoPrueba,
} from './types.js';
import { validarEsquema } from './validators/json-schema.js';
import { ejecutarValidacionContenido } from './validators/json-contenido.js';
import {
  auditarRuntimeComponente,
  auditarCssHermano,
} from './validators/runtime.js';
import {
  extraerMetaComponente,
  ejecutarValidacionConsistencia,
} from './validators/consistency.js';
import {
  crearSesion, urlPreview, inspeccionarSinBrowser,
} from '../engine/stagehand.js';
import type { SesionStagehand } from '../engine/stagehand.js';

/** Versión del motor (en header de cada reporte). */
export const MOTOR_VERSION = '1.0.0';

/** Estado global del motor (config + acumulado). */
export interface EstadoMotor {
  raiz: string;
  opciones: OpcionesRunner;
  entradas: EntradaCatalogo[];
  componentes: ReporteComponente[];
  inicio: number;
  erroresMotor: Hallazgo[];
  /** Sesión de Stagehand activa (si aplica). */
  sesion?: SesionStagehand | null;
}

/** Crea un estado inicial. */
export function crearEstado(raiz: string, opciones: OpcionesRunner = {}): EstadoMotor {
  const entradas = enumerarCatalogo(raiz);
  const filtradas = filtrarCatalogo(entradas, {
    solo: opciones.solo,
    categorias: opciones.categorias,
    limite: opciones.limite,
  });
  return {
    raiz,
    opciones,
    entradas: filtradas,
    componentes: [],
    inicio: Date.now(),
    erroresMotor: [],
  };
}

/**
 * Audita un único componente. Devuelve el reporte del componente con
 * todos los hallazgos acumulados (JSON + consistencia + runtime).
 */
export async function auditarComponente(estado: EstadoMotor, entrada: EntradaCatalogo): Promise<ReporteComponente> {
  const hallazgos: Hallazgo[] = [];
  const tag = entrada.tag;

  // 0. Componente sin JSON: marcar como faltante.
  if (!entrada.tieneJson || !entrada.rutaJsonAbsoluta) {
    // Páginas (home, theming, ecosystem, etc.) y chrome elements
    // (is-preview-component, is-preview-controls, is-demo) no siempre
    // tienen JSON propio. El catálogo los referencia; el motor los
    // cuenta como "página/chrome" y baja la severidad a info.
    const esPaginaOChrome = entrada.esPagina || [
      'is-demo', 'is-preview-component', 'is-preview-controls',
    ].includes(tag);
    hallazgos.push({
      categoria: 'json-schema', severidad: esPaginaOChrome ? 'info' : 'warn', tag,
      mensaje: `No se encontró JSON de preview para <${tag}>.`,
      sugerencia: 'Creá un archivo de definición siguiendo el esquema is-preview/v1.',
    });
    return {
      tag, categoria: entrada.categoria, titulo: entrada.titulo,
      rutaJson: entrada.rutaJsonRelativa ?? '',
      rutaModulo: entrada.rutaModuloRelativa ?? undefined,
      hallazgos,
      estado: calcularEstado(hallazgos),
    };
  }

  // 1. Cargar JSON.
  const cargado = cargarDefinicion(tag, estado.raiz);
  if (!cargado) {
    hallazgos.push({
      categoria: 'json-schema', severidad: 'fatal', tag,
      ruta: entrada.rutaJsonRelativa ?? undefined,
      mensaje: `JSON inválido o no parseable: ${entrada.rutaJsonRelativa}.`,
      sugerencia: 'Verificá que sea JSON válido (o JSONC con `//`/`/* */` y `$schema: "is-preview/v1"`).',
    });
    return {
      tag, categoria: entrada.categoria, titulo: entrada.titulo,
      rutaJson: entrada.rutaJsonRelativa ?? '',
      rutaModulo: entrada.rutaModuloRelativa ?? undefined,
      hallazgos,
      estado: 'fail',
    };
  }

  // 2. Esquema.
  hallazgos.push(...validarEsquema(cargado.def));

  // 3. Contenido.
  const rutaRelativa = entrada.rutaJsonRelativa ?? '';
  const opcionesContenido = { esModulo: entrada.esModulo };
  hallazgos.push(...ejecutarValidacionContenido(cargado.def, rutaRelativa, opcionesContenido));

  // 4. Consistencia módulo ↔ JSON.
  // Páginas y chrome no tienen módulo propio; saltamos.
  const tieneModulo = Boolean(entrada.rutaModuloAbsoluta);
  const meta = tieneModulo ? await extraerMetaComponente(entrada.rutaModuloAbsoluta) : null;
  const opcionesConsistencia = { esModulo: entrada.esModulo || entrada.esPagina };
  if (meta) {
    hallazgos.push(...ejecutarValidacionConsistencia(cargado.def, meta, rutaRelativa, opcionesConsistencia));
  }

  // 5. Runtime hygiene.
  if (tieneModulo) {
    hallazgos.push(...auditarRuntimeComponente(entrada.rutaModuloAbsoluta!, tag, { esModulo: entrada.esModulo }));
    hallazgos.push(...auditarCssHermano(entrada.rutaModuloAbsoluta!, tag));
  }

  // 6. E2E con Stagehand (si está habilitado).
  if (!estado.opciones.soloJson && !estado.opciones.saltarE2E && estado.sesion) {
    try {
      const reporte = await estado.sesion.inspeccionarTag(tag, entrada.titulo);
      hallazgos.push(...reporte.hallazgos);
    } catch (err: any) {
      hallazgos.push({
        categoria: 'runtime', severidad: 'warn', tag,
        mensaje: `Stagehand no pudo inspeccionar: ${err?.message ?? String(err)}`,
      });
    }
  }

  // Estado global.
  const estadoGlobal = calcularEstado(hallazgos);
  return {
    tag, categoria: entrada.categoria, titulo: entrada.titulo,
    rutaJson: rutaRelativa,
    rutaModulo: entrada.rutaModuloRelativa ?? undefined,
    hallazgos,
    estado: estadoGlobal,
    metricas: {
      secciones: (cargado.def.sections ?? []).length,
      bloques: contarBloques(cargado.def),
      demos: contarPorKind(cargado.def, 'demo'),
      controles: contarControles(cargado.def),
    },
  };
}

/**
 * Audita el catálogo entero y devuelve el reporte agregado.
 * Si `estado.sesion` es null y no se pidió `soloJson`, no hace E2E
 * (útil cuando se llama desde CI que no tiene Playwright).
 */
export async function auditarCatalogo(estado: EstadoMotor): Promise<ReporteAuditoria> {
  const inicio = new Date(estado.inicio).toISOString();
  const t0 = Date.now();

  for (const entrada of estado.entradas) {
    if (estado.opciones.verbose) {
      console.log(`[motor] audit ${entrada.tag} (${entrada.categoria})`);
    }
    try {
      const r = await auditarComponente(estado, entrada);
      estado.componentes.push(r);
    } catch (err: any) {
      estado.erroresMotor.push({
        categoria: 'runtime', severidad: 'error', tag: entrada.tag,
        mensaje: `Error inesperado al auditar: ${err?.message ?? String(err)}`,
        detalle: { stack: err?.stack },
      });
    }
  }

  // Cleanup Stagehand.
  if (estado.sesion) {
    try { await estado.sesion.cerrar(); } catch { /* ignore */ }
  }

  const fin = new Date().toISOString();
  const conteo = contarSeveridades(estado.componentes.flatMap((c) => c.hallazgos));
  return {
    motorVersion: MOTOR_VERSION,
    inicio, fin,
    duracionMs: Date.now() - t0,
    totalComponentes: estado.componentes.length,
    conteo,
    componentes: estado.componentes,
    erroresMotor: estado.erroresMotor,
  };
}

/**
 * Genera un reporte "rápido" sin browser: solo validaciones JSON +
 * consistencia + runtime. No requiere Stagehand ni Playwright.
 */
export async function auditarSoloJson(raiz: string, opciones: OpcionesRunner = {}): Promise<ReporteAuditoria> {
  const estado = crearEstado(raiz, opciones);
  estado.opciones.soloJson = true;
  return auditarCatalogo(estado);
}

/**
 * Helper: orquesta un servidor de docs local (si el usuario no proveyó
 * URL) y arranca Stagehand contra él. Útil desde CLI.
 */
export async function prepararSesionBrowser(
  raiz: string,
  urlBase?: string,
  puerto?: number,
): Promise<{ url: string; sesion: SesionStagehand | null; serverProceso?: any }> {
  // Si urlBase vino, no levantamos server.
  if (urlBase) {
    const sesion = await crearSesion(urlBase, raiz);
    return { url: urlBase, sesion };
  }

  // Si no hay server, intentamos reutilizar el del puerto.
  const p = puerto ?? 8391;
  const url = `http://127.0.0.1:${p}/`;
  if (await alcanzaUrl(url)) {
    const sesion = await crearSesion(url, raiz);
    return { url, sesion };
  }

  // Si no hay server accesible, devolvemos URL y sesión null.
  return { url, sesion: null };
}

async function alcanzaUrl(url: string): Promise<boolean> {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(1500) });
    return r.ok || r.status === 404;
  } catch {
    return false;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Helpers.
// ─────────────────────────────────────────────────────────────────────────────

function calcularEstado(hallazgos: Hallazgo[]): 'ok' | 'warning' | 'fail' {
  if (hallazgos.some((h) => h.severidad === 'fatal' || h.severidad === 'error')) return 'fail';
  if (hallazgos.some((h) => h.severidad === 'warn')) return 'warning';
  return 'ok';
}

function contarSeveridades(arr: Hallazgo[]): Record<Severidad, number> {
  const acc: Record<Severidad, number> = { fatal: 0, error: 0, warn: 0, info: 0 };
  for (const h of arr) acc[h.severidad]++;
  return acc;
}

function contarBloques(def: any): number {
  let n = 0;
  for (const s of (def.sections ?? []) as Array<{ blocks?: any[] }>) {
    n += (s.blocks ?? []).length;
  }
  return n;
}

function contarPorKind(def: any, kind: string): number {
  let n = 0;
  for (const s of (def.sections ?? []) as Array<{ blocks?: any[] }>) {
    for (const b of s.blocks ?? []) if (b.kind === kind) n++;
  }
  return n;
}

function contarControles(def: any): number {
  let n = 0;
  for (const s of (def.sections ?? []) as Array<{ blocks?: any[] }>) {
    for (const b of s.blocks ?? []) {
      if (Array.isArray(b.controls)) n += b.controls.length;
    }
  }
  return n;
}

/** Resumen agregado (para el reporte inicial / banner). */
export function resumenMotor(estado: EstadoMotor): string {
  const resumen = resumirCatalogo(estado.entradas);
  return [
    `[motor v${MOTOR_VERSION}]`,
    `  catálogo: ${resumen.total} (${resumen.conJson} con JSON, ${resumen.conModulo} con módulo)`,
    `  páginas: ${resumen.paginas} · behaviors: ${resumen.conBehavior}`,
    `  opciones: ${JSON.stringify(estado.opciones)}`,
  ].join('\n');
}

/** Walk del filesystem para detectar componentes huérfanos (no en manifest/catalog). */
export function detectarHuerfanos(raiz: string): { enDisco: string[]; enCatalogo: Set<string> } {
  const enDisco = walkComponentes(raiz);
  const enCatalogo = new Set<string>(enumerarCatalogo(raiz).map((e) => e.tag));
  return { enDisco, enCatalogo };
}