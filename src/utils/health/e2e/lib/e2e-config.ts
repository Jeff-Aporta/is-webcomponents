// e2e-config.ts — Configuración E2E estándar del ecosistema (vendor/copia de main/cdn).
// Norma de título de pestaña (emoji estado al inicio) para los e2e Stagehand y CLIs.
// NO EDITAR: en los repos que usan "vendor strategy" se sobrescribe con
//   `node scripts/vendor-e2e-config.mjs --out <dir>` (vendor DL con timestamp).
// Editar la fuente única en `Personal/Muéstralo/main/cdn/e2e-config.ts`.

/** Estados soportados por el estándar. */
export type EstadoE2E = 'success' | 'error' | 'warn' | 'run' | 'info';

/** Emojis por estado — el estado va SIEMPRE al inicio del título. */
export const EMOJIS: Record<EstadoE2E, string> = {
  success: '✅',
  error: '❌',
  warn: '⚠️',
  run: '▶️',
  info: 'ℹ️',
};

/** Nombre humano de cada estado para el detalle. */
export const ESTADO_NOMBRE: Record<EstadoE2E, string> = {
  success: 'ok',
  error: 'error',
  warn: 'warn',
  run: 'en curso',
  info: 'info',
};

/** Formato corto del título: "<emoji> <tarea> · <detalle>". */
export function tituloDe(estado: EstadoE2E, tarea: string, detalle = ''): string {
  const emoji = EMOJIS[estado] ?? EMOJIS.info;
  const cuerpo = String(tarea || 'e2e');
  const extra = detalle ? ` · ${detalle}` : '';
  return `${emoji} ${cuerpo}${extra}`;
}

/** Formato de la línea de consola (mismo estándar, sin la pestaña). */
export function lineaDe(estado: EstadoE2E, tarea: string, detalle = ''): string {
  return `[e2e] ${tituloDe(estado, tarea, detalle)}`;
}

/**
 * Marca en consola el estado de una tarea (para e2e por consola / sin pestaña).
 * error -> console.error, warn -> console.warn, resto -> console.log.
 */
export function marcar(estado: EstadoE2E, tarea: string, detalle = ''): string {
  const linea = lineaDe(estado, tarea, detalle);
  if (estado === 'error') console.error(linea);
  else if (estado === 'warn') console.warn(linea);
  else console.log(linea);
  return linea;
}

/**
 * Aplica el estándar a la pestaña del navegador (document.title) y a consola.
 * `page` debe ser un objeto con `.evaluate` (Stagehand/Playwright). Si no hay
 * page o no expone evaluate, solo imprime a consola (útil en CLIs).
 */
export async function titulo(
  page: { evaluate?: (fn: (texto: string) => void, arg: string) => Promise<unknown> } | null | undefined,
  estado: EstadoE2E,
  tarea: string,
  detalle = '',
): Promise<string> {
  const texto = tituloDe(estado, tarea, detalle);
  marcar(estado, tarea, detalle);
  if (page && typeof page.evaluate === 'function') {
    try {
      await page.evaluate((s) => { document.title = s; }, texto);
    } catch {
      /* la pestaña puede estar cerrada; el marcador de consola ya informó */
    }
  }
  return texto;
}
