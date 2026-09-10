#!/usr/bin/env node
/**
 * CLI del motor auditor (iswc-audit).
 *
 * Uso:
 *   node --import ./scripts/ts-resolve-hook.ts src/utils/health/motor/cli.ts [opciones]
 *
 * Opciones (todas con --):
 *   --solo <tags>         Filtra por tag (coma-separado). Vacío = todos.
 *   --categoria <cats>    Filtra por categoría (coma-separado).
 *   --limite <n>          Limita el número de componentes auditados.
 *   --puerto <n>          Puerto del dev server (default 8391).
 *   --url-base <url>      URL del servidor de docs. Si no, intenta detectar.
 *   --sin-e2e             Salta la inspección con Stagehand.
 *   --solo-json           No requiere browser; solo valida JSON.
 *   --salida-json <ruta>  Guarda el reporte JSON en este archivo.
 *   --salida-md <ruta>    Guarda el reporte Markdown en este archivo.
 *   --verbose             Imprime cada paso.
 *   --no-fallar           No sale con código != 0 si hay hallazgos fatales.
 *   --help                Muestra esta ayuda.
 *
 * Exit code:
 *   0 = sin hallazgos fatales ni errores
 *   1 = hay hallazgos con severidad fatal o error
 *   2 = error del motor (Stagehand no arranca, JSON no parsea, etc.)
 */

import { writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  crearEstado, auditarCatalogo, MOTOR_VERSION, resumenMotor,
  prepararSesionBrowser,
} from './auditor.js';
import type { OpcionesRunner } from './types.js';
import { aJson, aMarkdown, imprimirConsola, imprimirResumenUnaLinea } from './reporter.js';
import { enumerarCatalogo, resumirCatalogo } from './catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// El motor vive en src/utils/health/motor/. La raíz del proyecto está
// tres niveles arriba.
const raizProyecto = resolve(__dirname, '..', '..', '..', '..');

interface ArgSpec {
  nombre: string;
  descripcion: string;
  tipo: 'string' | 'boolean' | 'number';
  default?: string | number | boolean;
}

const ESPECES: ArgSpec[] = [
  { nombre: 'solo', descripcion: 'Tags a auditar (coma-separado)', tipo: 'string' },
  { nombre: 'categoria', descripcion: 'Categorías a auditar (coma-separado)', tipo: 'string' },
  { nombre: 'limite', descripcion: 'Máximo de componentes a auditar', tipo: 'number' },
  { nombre: 'puerto', descripcion: 'Puerto del dev server (default 8391)', tipo: 'number', default: 8391 },
  { nombre: 'url-base', descripcion: 'URL del servidor de docs', tipo: 'string' },
  { nombre: 'sin-e2e', descripcion: 'Salta la inspección con Stagehand', tipo: 'boolean' },
  { nombre: 'solo-json', descripcion: 'Solo validaciones JSON, sin browser', tipo: 'boolean' },
  { nombre: 'salida-json', descripcion: 'Archivo de salida del reporte JSON', tipo: 'string' },
  { nombre: 'salida-md', descripcion: 'Archivo de salida del reporte Markdown', tipo: 'string' },
  { nombre: 'verbose', descripcion: 'Imprime cada paso', tipo: 'boolean' },
  { nombre: 'no-fallar', descripcion: 'No sale con código != 0 si hay hallazgos', tipo: 'boolean' },
  { nombre: 'help', descripcion: 'Muestra la ayuda', tipo: 'boolean' },
];

function parseArgs(argv: string[]): Record<string, string | boolean | number> {
  const out: Record<string, string | boolean | number> = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2);
    const spec = ESPECES.find((s) => s.nombre === key);
    if (!spec) continue;
    if (spec.tipo === 'boolean') {
      out[key] = true;
    } else {
      const val = argv[i + 1];
      if (val === undefined) {
        out[key] = '';
        continue;
      }
      if (spec.tipo === 'number') {
        out[key] = Number(val);
      } else {
        out[key] = val;
      }
      i++;
    }
  }
  return out;
}

function mostrarAyuda(): void {
  console.log(`iswc-audit v${MOTOR_VERSION} — auditor del kit iswc (is-webcomponents).`);
  console.log('');
  console.log('Uso:');
  console.log('  node --import ./scripts/ts-resolve-hook.ts src/utils/health/motor/cli.ts [opciones]');
  console.log('');
  console.log('Opciones:');
  for (const s of ESPECES) {
    const def = s.default !== undefined ? ` (default ${String(s.default)})` : '';
    console.log(`  --${s.nombre.padEnd(14)} ${s.descripcion}${def}`);
  }
  console.log('');
  console.log('Ejemplos:');
  console.log('  # Auditoría completa del catálogo (sin browser)');
  console.log('  node --import ./scripts/ts-resolve-hook.ts src/utils/health/motor/cli.ts --solo-json');
  console.log('');
  console.log('  # Auditoría de un tag puntual con E2E');
  console.log('  node --import ./scripts/ts-resolve-hook.ts src/utils/health/motor/cli.ts --solo is-button --puerto 8391');
  console.log('');
  console.log('  # Solo la categoría de charts');
  console.log('  node --import ./scripts/ts-resolve-hook.ts src/utils/health/motor/cli.ts --categoria data-viz --solo-json');
  console.log('');
  console.log('Exit codes:');
  console.log('  0 = sin hallazgos fatales/errores');
  console.log('  1 = hay hallazgos con severidad fatal/error');
  console.log('  2 = error del motor (servidor no disponible, etc.)');
}

async function main(): Promise<number> {
  const args = parseArgs(process.argv.slice(2));

  if (args.help) {
    mostrarAyuda();
    return 0;
  }

  const opciones: OpcionesRunner = {
    solo: typeof args['solo'] === 'string' && args['solo']
      ? String(args['solo']).split(',').map((s) => s.trim()).filter(Boolean)
      : undefined,
    categorias: typeof args['categoria'] === 'string' && args['categoria']
      ? String(args['categoria']).split(',').map((s) => s.trim()).filter(Boolean)
      : undefined,
    limite: typeof args['limite'] === 'number' ? args['limite'] : undefined,
    puerto: typeof args['puerto'] === 'number' ? args['puerto'] : 8391,
    urlBase: typeof args['url-base'] === 'string' ? String(args['url-base']) : undefined,
    saltarE2E: Boolean(args['sin-e2e']),
    soloJson: Boolean(args['solo-json']),
    salidaJson: typeof args['salida-json'] === 'string' ? String(args['salida-json']) : undefined,
    salidaMarkdown: typeof args['salida-md'] === 'string' ? String(args['salida-md']) : undefined,
    verbose: Boolean(args['verbose']),
    fallarEnFatal: !args['no-fallar'],
  };

  const raiz = process.env['ISWC_AUDIT_ROOT'] ?? raizProyecto;

  // Banner inicial.
  const estado = crearEstado(raiz, opciones);
  const resumen = resumirCatalogo(estado.entradas);
  console.log(`🩺 iswc-audit v${MOTOR_VERSION}`);
  console.log(`   catálogo: ${resumen.total} (${resumen.conJson} con JSON, ${resumen.conModulo} con módulo)`);
  if (opciones.solo?.length) console.log(`   solo: ${opciones.solo.join(', ')}`);
  if (opciones.categorias?.length) console.log(`   categorías: ${opciones.categorias.join(', ')}`);
  if (opciones.limite) console.log(`   límite: ${opciones.limite}`);
  console.log(`   modo: ${opciones.soloJson ? 'solo-json (sin browser)' : opciones.saltarE2E ? 'sin-e2e (skip Stagehand)' : 'completo (con Stagehand)'}`);
  console.log('');

  // Preparar Stagehand si aplica.
  if (!opciones.soloJson && !opciones.saltarE2E) {
    const prep = await prepararSesionBrowser(raiz, opciones.urlBase, opciones.puerto);
    estado.sesion = prep.sesion;
    if (!prep.sesion) {
      console.warn('⚠️  No se pudo crear sesión de Stagehand. Continuando sin E2E.');
      opciones.saltarE2E = true;
    } else {
      console.log(`🌐 Inspeccionando contra ${prep.url}`);
    }
  } else {
    console.log('📋 Modo JSON-only: sin browser, sin Stagehand.');
  }

  // Auditar.
  const reporte = await auditarCatalogo(estado);

  // Salidas.
  if (opciones.salidaJson) {
    writeFileSync(resolve(raiz, opciones.salidaJson), JSON.stringify(aJson(reporte), null, 2), 'utf8');
    console.log(`📄 Reporte JSON → ${opciones.salidaJson}`);
  }
  if (opciones.salidaMarkdown) {
    writeFileSync(resolve(raiz, opciones.salidaMarkdown), aMarkdown(reporte), 'utf8');
    console.log(`📝 Reporte Markdown → ${opciones.salidaMarkdown}`);
  }
  if (!opciones.salidaJson && !opciones.salidaMarkdown) {
    imprimirConsola(reporte);
  } else {
    imprimirResumenUnaLinea(reporte);
  }

  // Exit code.
  const hayHallazgosGraves = reporte.conteo.fatal > 0 || reporte.conteo.error > 0;
  if (opciones.fallarEnFatal && hayHallazgosGraves) return 1;
  return 0;
}

main().then(
  (code) => process.exit(code),
  (err) => {
    console.error('❌ iswc-audit falló:', err);
    process.exit(2);
  },
);

// Re-exports para consumo programático.
export { enumerarCatalogo } from './catalog.js';
export { aJson, aMarkdown } from './reporter.js';
export { MOTOR_VERSION } from './auditor.js';
export type { ReporteAuditoria, Hallazgo } from './types.js';