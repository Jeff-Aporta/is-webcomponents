// env.ts: carga la configuracion E2E desde el entorno y .env locales (sin dependencias).
// Orden de prioridad: variables ya presentes en process.env > .env de la raiz del repo > e2e/.env.
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

const repoDir: string = subirHastaPackageJson(e2eDir);

function leerEnvFile(archivo: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!existsSync(archivo)) return out;
  for (const linea of readFileSync(archivo, 'utf8').split(/\r?\n/)) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) continue;
    const i = limpia.indexOf('=');
    if (i <= 0) continue;
    const k = limpia.slice(0, i).trim();
    let v: string = limpia.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    if (k && !(k in process.env)) out[k] = v;
  }
  return out;
}

const archivo: Record<string, string> = leerEnvFile(path.join(repoDir, '.env'));
const archivoE2e: Record<string, string> = leerEnvFile(path.join(e2eDir, '.env'));

function o(clave: string, defecto: string): string {
  const v = process.env[clave] ?? archivo[clave] ?? archivoE2e[clave];
  return v === undefined ? defecto : String(v);
}

export interface ConfigE2E {
  baseUrl: string;
  headless: boolean;
  escritura: boolean;
  estricto: boolean;
  minimaxKey: string;
  minimaxModelo: string;
  minimaxUrl: string;
  artefactos: string;
  asentarseMs: number;
  esperaMs: number;
  navegador: string;
  sweep: string[];
}

export const ENV: ConfigE2E = {
  baseUrl: o('E2E_BASE_URL', 'http://127.0.0.1:8391/index.html').replace(/\/+$/, ''),
  headless: o('E2E_HEADLESS', 'true').toLowerCase() !== 'false',
  escritura: o('E2E_WRITE', '').toLowerCase() === '1' || o('E2E_WRITE', '').toLowerCase() === 'true',
  estricto: o('E2E_STRICT', '').toLowerCase() === '1' || o('E2E_STRICT', '').toLowerCase() === 'true',
  minimaxKey: o('MINIMAX_API_KEY', ''),
  minimaxModelo: o('E2E_MINIMAX_MODEL', 'MiniMax-M3'),
  minimaxUrl: o('E2E_MINIMAX_URL', 'https://api.minimax.io/v1'),
  artefactos: o('E2E_ARTIFACTS', path.join(e2eDir, '.artifacts')),
  asentarseMs: Number(o('E2E_SETTLE_MS', '1500')),
  esperaMs: Number(o('E2E_TIMEOUT_MS', '90000')),
  navegador: o('E2E_BROWSER', 'chrome'),
  sweep: o('E2E_SWEEP',
    'is-code,is-component-diagram,is-flowchart,is-er-diagram,is-bar-chart,is-cdn-snippet,is-progress-bar,is-button,is-input,is-icon,is-confirm-modal,is-split-panel')
    .split(',').map((s) => s.trim()).filter(Boolean),
};

export function faltanRequisitos(): string[] {
  const faltan: string[] = [];
  if (!ENV.minimaxKey) faltan.push('MINIMAX_API_KEY (MiniMax para el modelo de Stagehand)');
  return faltan;
}

export { e2eDir, repoDir };
