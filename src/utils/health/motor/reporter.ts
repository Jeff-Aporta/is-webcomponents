/**
 * Reporter del motor auditor.
 *
 * Convierte un `ReporteAuditoria` en dos formatos:
 *   - JSON: para integrar con otras herramientas (CI, dashboards, …).
 *   - Markdown: para revisión humana (README, comentarios de PR, …).
 *
 * El reporter NO filtra hallazgos: eso es responsabilidad del motor y
 * del runner. Solo los presenta.
 */

import type { ReporteAuditoria, Hallazgo, Severidad } from './types.js';

// ─────────────────────────────────────────────────────────────────────────────
// JSON: wrapper estable para integraciones.
// ─────────────────────────────────────────────────────────────────────────────

export interface ReporteJson {
  /** Versión del esquema de salida. */
  schema: 'iswc-audit/v1';
  /** Identificador de la corrida (timestamp). */
  corridaId: string;
  /** ISO inicio. */
  inicio: string;
  /** ISO fin. */
  fin: string;
  /** Duración en ms. */
  duracionMs: number;
  /** Conteo por severidad. */
  conteo: Record<Severidad, number>;
  /** Total de componentes auditados. */
  total: number;
  /** Resumen ejecutivo: ok / warning / fail. */
  estado: { ok: number; warning: number; fail: number };
  /** Componentes. */
  componentes: ReporteJsonComponente[];
  /** Errores del motor. */
  erroresMotor: Hallazgo[];
}

interface ReporteJsonComponente {
  tag: string;
  titulo: string;
  categoria: string;
  estado: 'ok' | 'warning' | 'fail';
  rutaJson: string;
  rutaModulo?: string;
  conteo: Record<Severidad, number>;
  hallazgos: Hallazgo[];
  metricas?: Record<string, number | string>;
}

/** Serializa el reporte a JSON estable. */
export function aJson(reporte: ReporteAuditoria): ReporteJson {
  const estado = { ok: 0, warning: 0, fail: 0 };
  const componentes = reporte.componentes.map<ReporteJsonComponente>((c) => {
    estado[c.estado]++;
    const cnt: Record<Severidad, number> = { fatal: 0, error: 0, warn: 0, info: 0 };
    for (const h of c.hallazgos) cnt[h.severidad]++;
    return {
      tag: c.tag,
      titulo: c.titulo,
      categoria: c.categoria,
      estado: c.estado,
      rutaJson: c.rutaJson,
      rutaModulo: c.rutaModulo,
      conteo: cnt,
      hallazgos: c.hallazgos,
      metricas: c.metricas,
    };
  });
  return {
    schema: 'iswc-audit/v1',
    corridaId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    inicio: reporte.inicio,
    fin: reporte.fin,
    duracionMs: reporte.duracionMs,
    conteo: reporte.conteo,
    total: reporte.totalComponentes,
    estado,
    componentes,
    erroresMotor: reporte.erroresMotor,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Markdown: presentacion humana.
// ─────────────────────────────────────────────────────────────────────────────

/** Emojis por severidad (estables). */
const ICONO_SEVERIDAD: Record<Severidad, string> = {
  fatal: '🛑',
  error: '🔴',
  warn: '🟡',
  info: '🔵',
};

/** Iconos por categoría. */
const ICONO_CATEGORIA: Record<string, string> = {
  'json-schema': '📐',
  'json-contenido': '📝',
  'json-complejidad': '🧩',
  'consistencia': '🔗',
  'playground': '🎮',
  'runtime': '⚙️',
  'demo-html': '🖼️',
  'cdn': '🌐',
  'export': '📦',
  'a11y': '♿',
  'theming': '🎨',
  'visual': '👀',
};

/** Genera el reporte en Markdown. */
export function aMarkdown(reporte: ReporteAuditoria): string {
  const lineas: string[] = [];
  const json = aJson(reporte);

  lineas.push('# Auditoría del kit iswc (iswc-audit)');
  lineas.push('');
  lineas.push(`- **Motor**: v${reporte.motorVersion}`);
  lineas.push(`- **Inicio**: ${reporte.inicio}`);
  lineas.push(`- **Fin**: ${reporte.fin}`);
  lineas.push(`- **Duración**: ${(reporte.duracionMs / 1000).toFixed(2)}s`);
  lineas.push(`- **Componentes auditados**: ${reporte.totalComponentes}`);
  lineas.push('');

  // Resumen.
  lineas.push('## Resumen');
  lineas.push('');
  lineas.push('| Estado | Cantidad |');
  lineas.push('|--------|----------|');
  lineas.push(`| ✅ ok | ${json.estado.ok} |`);
  lineas.push(`| ⚠️ warning | ${json.estado.warning} |`);
  lineas.push(`| ❌ fail | ${json.estado.fail} |`);
  lineas.push('');
  lineas.push('### Hallazgos por severidad');
  lineas.push('');
  lineas.push('| Severidad | Cantidad |');
  lineas.push('|-----------|----------|');
  lineas.push(`| 🛑 fatal | ${json.conteo.fatal} |`);
  lineas.push(`| 🔴 error | ${json.conteo.error} |`);
  lineas.push(`| 🟡 warn | ${json.conteo.warn} |`);
  lineas.push(`| 🔵 info | ${json.conteo.info} |`);
  lineas.push('');

  // Hallazgos del motor.
  if (reporte.erroresMotor.length) {
    lineas.push('## Errores del motor');
    lineas.push('');
    for (const h of reporte.erroresMotor) {
      lineas.push(`- ${ICONO_SEVERIDAD[h.severidad]} **${h.categoria}** (${h.tag ?? '?'}): ${h.mensaje}`);
    }
    lineas.push('');
  }

  // Componentes con hallazgos.
  const conHallazgos = reporte.componentes.filter((c) => c.hallazgos.length > 0);
  if (!conHallazgos.length) {
    lineas.push('## ✅ Sin hallazgos');
    lineas.push('');
    lineas.push('Todos los componentes del catálogo están limpios. 🎉');
    lineas.push('');
  } else {
    lineas.push('## Componentes con hallazgos');
    lineas.push('');
    for (const c of conHallazgos) {
      lineas.push(`### ${iconoEstado(c.estado)} \`${c.tag}\` — ${c.titulo} \`(${c.categoria})\``);
      lineas.push('');
      lineas.push(`- **Ruta JSON**: \`${c.rutaJson}\``);
      if (c.rutaModulo) lineas.push(`- **Ruta módulo**: \`${c.rutaModulo}\``);
      if (c.metricas) {
        lineas.push('- **Métricas**:');
        for (const [k, v] of Object.entries(c.metricas)) {
          lineas.push(`  - \`${k}\`: ${v}`);
        }
      }
      lineas.push('');
      for (const h of c.hallazgos) {
        const icono = ICONO_SEVERIDAD[h.severidad];
        const cat = ICONO_CATEGORIA[h.categoria] ?? '•';
        lineas.push(`- ${icono} ${cat} **${h.categoria}** — ${h.mensaje}`);
        if (h.ruta) lineas.push(`  - 📄 \`${h.ruta}\`${h.linea ? `:${h.linea}` : ''}`);
        if (h.sugerencia) lineas.push(`  - 💡 ${h.sugerencia}`);
        if (h.detalle !== undefined) {
          const detalleStr = typeof h.detalle === 'string' ? h.detalle : JSON.stringify(h.detalle);
          if (detalleStr.length < 240) lineas.push(`  - 🔎 ${detalleStr}`);
        }
      }
      lineas.push('');
    }
  }

  // Resumen por categoría (opcional).
  const porCategoria = new Map<string, number>();
  for (const c of reporte.componentes) {
    porCategoria.set(c.categoria, (porCategoria.get(c.categoria) ?? 0) + 1);
  }
  if (porCategoria.size > 1) {
    lineas.push('## Cobertura por categoría');
    lineas.push('');
    lineas.push('| Categoría | Componentes |');
    lineas.push('|-----------|-------------|');
    for (const [k, v] of [...porCategoria.entries()].sort((a, b) => b[1] - a[1])) {
      lineas.push(`| ${k || '—'} | ${v} |`);
    }
    lineas.push('');
  }

  return lineas.join('\n');
}

function iconoEstado(estado: 'ok' | 'warning' | 'fail'): string {
  switch (estado) {
    case 'ok': return '✅';
    case 'warning': return '⚠️';
    case 'fail': return '❌';
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Consola: salida colorizada para terminal.
// ─────────────────────────────────────────────────────────────────────────────

const COLOR_SEVERIDAD: Record<Severidad, string> = {
  fatal: '\x1b[41m\x1b[37m',   // fondo rojo, texto blanco
  error: '\x1b[31m',           // rojo
  warn: '\x1b[33m',            // amarillo
  info: '\x1b[36m',            // cyan
};
const RESET = '\x1b[0m';
const DIM = '\x1b[2m';

/** Imprime el reporte en la consola (formato compacto). */
export function imprimirConsola(reporte: ReporteAuditoria): void {
  console.log('');
  console.log(`🩺 iswc-audit v${reporte.motorVersion} — ${reporte.totalComponentes} componentes`);
  console.log(`⏱  ${(reporte.duracionMs / 1000).toFixed(2)}s`);
  const c = reporte.conteo;
  console.log(
    `  ${ICONO_SEVERIDAD.fatal} ${c.fatal}   ${ICONO_SEVERIDAD.error} ${c.error}   ${ICONO_SEVERIDAD.warn} ${c.warn}   ${ICONO_SEVERIDAD.info} ${c.info}`,
  );

  // Solo los fail/warning con hallazgos.
  const relevantes = reporte.componentes.filter(
    (c) => c.hallazgos.some((h) => h.severidad === 'fatal' || h.severidad === 'error' || h.severidad === 'warn'),
  );
  if (!relevantes.length) {
    console.log('\n✅ Sin hallazgos que requieran atención.');
    return;
  }
  for (const comp of relevantes) {
    const iconoEstadoComp = comp.estado === 'fail' ? '❌' : '⚠️';
    console.log(`\n${iconoEstadoComp} ${comp.tag} (${comp.categoria}) — ${comp.titulo}`);
    for (const h of comp.hallazgos) {
      const color = COLOR_SEVERIDAD[h.severidad];
      console.log(
        `   ${color}${h.severidad.toUpperCase()}${RESET} ${ICONO_CATEGORIA[h.categoria] ?? '•'} ${h.mensaje}`,
        h.ruta ? `${DIM}${h.ruta}${RESET}` : '',
      );
      if (h.sugerencia) {
        console.log(`      ${DIM}💡 ${h.sugerencia}${RESET}`);
      }
    }
  }
}

/** Imprime un resumen ejecutivo en una línea (para logs CI). */
export function imprimirResumenUnaLinea(reporte: ReporteAuditoria): void {
  const c = reporte.conteo;
  const ok = reporte.componentes.filter((x) => x.estado === 'ok').length;
  const fail = reporte.componentes.filter((x) => x.estado === 'fail').length;
  const warn = reporte.componentes.filter((x) => x.estado === 'warning').length;
  console.log(
    `[iswc-audit] ${reporte.totalComponentes} componentes: ✅${ok} ⚠️${warn} ❌${fail} | hallazgos: ${c.fatal}f ${c.error}e ${c.warn}w ${c.info}i | ${(reporte.duracionMs / 1000).toFixed(2)}s`,
  );
}