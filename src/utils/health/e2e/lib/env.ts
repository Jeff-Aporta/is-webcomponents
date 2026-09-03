// env.ts: configuración E2E de is-webcomponents SIN .env.
// Los secretos se leen SIEMPRE de rutas fijas:
//   - MiniMax:  C:\ContaPyme\Personal\secrets.json  -> Values.MINIMAX_API_KEY_50USD
// Base URL / modelo / host de MiniMax no son secretos y quedan quemados como
// constantes (se pueden sobreescribir por entorno solo para infraestructura).
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const e2eDir: string = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function subirHastaPackageJson(inicio: string): string {
  let d = inicio;
  for (let i = 0; i < 10; i++) {
    if (existsSync(path.join(d, 'package.json'))) return d;
    const padre = path.resolve(d, '..');
    if (padre === d) break;
    d = padre;
  }
  return inicio;
}

function subir(inicio: string, niveles: number): string {
  let d = inicio;
  for (let i = 0; i < niveles; i++) d = path.resolve(d, '..');
  return d;
}

const repoDir: string = subirHastaPackageJson(e2eDir);
// Raíz del workspace: C:\ContaPyme (repo en ...\Personal\apps\is-webcomponents)
const workspaceDir: string = subir(repoDir, 3);

/** Ruta fija del archivo de secretos del workspace. */
export const SECRETOS_PATH = path.join(workspaceDir, 'Personal', 'secrets.json');

function o(clave: string, defecto: string): string {
  const v = process.env[clave];
  return v === undefined ? defecto : String(v);
}

/** Lee un archivo JSON y devuelve {} si no existe o es inválido. */
function leerJson(ruta: string): Record<string, unknown> {
  try {
    if (!existsSync(ruta)) return {};
    return JSON.parse(readFileSync(ruta, 'utf8')) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function valorEn(objeto: unknown, ...claves: string[]): unknown {
  let actual: unknown = objeto;
  for (const c of claves) {
    if (!actual || typeof actual !== 'object') return undefined;
    actual = (actual as Record<string, unknown>)[c];
  }
  return actual;
}

function strValor(objeto: unknown, ...claves: string[]): string {
  const v = valorEn(objeto, ...claves);
  return typeof v === 'string' ? v : '';
}

// Secretos desde rutas fijas (nunca .env ni variables sueltas).
const secrets = leerJson(SECRETOS_PATH);
const MINIMAX_KEY = strValor(secrets, 'Values', 'MINIMAX_API_KEY_50USD');

export type ConfigE2E = { baseUrl: string; headless: boolean; escritura: boolean; estricto: boolean; minimaxKey: string; minimaxModelo: string; minimaxUrl: string; artefactos: string; asentarseMs: number; esperaMs: number; navegador: string; sweep: string[]; puerto: number; host: string };

export const ENV: ConfigE2E = {
  // Base URL quemada (no secreta): la del autoservidor o un host local.
  baseUrl: o('E2E_BASE_URL', 'http://127.0.0.1:8391/index.html').replace(/\/+$/, ''),
  // Navegador VISIBLE por defecto al correr en terminal (sigue en vivo el e2e).
  headless: o('E2E_HEADLESS', process.stdout.isTTY ? 'false' : 'true').toLowerCase() !== 'false',
  escritura: o('E2E_WRITE', 'false').toLowerCase() === '1' || o('E2E_WRITE', 'false').toLowerCase() === 'true',
  estricto: o('E2E_STRICT', 'false').toLowerCase() === '1' || o('E2E_STRICT', 'false').toLowerCase() === 'true',
  minimaxKey: MINIMAX_KEY,
  // Modelo y URL de MiniMax quemados (no comprometen seguridad).
  minimaxModelo: 'MiniMax-M3',
  minimaxUrl: o('E2E_MINIMAX_URL', 'https://api.minimax.io/v1'),
  artefactos: o('E2E_ARTIFACTS', path.join(e2eDir, '.artifacts')),
  asentarseMs: Number(o('E2E_SETTLE_MS', '1500')),
  esperaMs: Number(o('E2E_TIMEOUT_MS', '90000')),
  navegador: o('E2E_BROWSER', 'chrome'),
  puerto: Number(o('E2E_PORT', '0')),
  host: o('E2E_HOST', '127.0.0.1'),
  sweep: o('E2E_SWEEP',
    'is-code,is-component-diagram,is-flowchart,is-er-diagram,is-bar-chart,is-cdn-snippet,is-progress-bar,is-button,is-input,is-icon,is-confirm-modal,is-split-panel')
    .split(',').map((s) => s.trim()).filter(Boolean),
};

export function faltanRequisitos(): string[] {
  const faltan: string[] = [];
  if (!MINIMAX_KEY) {
    faltan.push(`MINIMAX_API_KEY_50USD en ${SECRETOS_PATH} (Values.MINIMAX_API_KEY_50USD)`);
  }
  return faltan;
}

export { e2eDir, repoDir };
