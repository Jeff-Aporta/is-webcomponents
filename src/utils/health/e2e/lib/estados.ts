// estados.ts: estados de URL (?s=) de la galeria is-webcomponents.
// Mismo formato que index.html (JSON en base64url): { component, theme?, palette? }.
// El home (sin componente) y las paginas sueltas (theming/ecosystem) no son tags.
import { ENV } from './env.ts';

export function b64urlDe(objeto: unknown): string {
  const json = JSON.stringify(objeto);
  return Buffer.from(json, 'utf8').toString('base64url');
}

/** Estado ?s= para abrir el docs/preview de un tag del catalogo. */
export function estadoDe(tag: string): string {
  return b64urlDe({ component: tag });
}

/** Estado con tema/paleta forzados (p. ej. light + insoft). */
export function estadoTema(tag: string, cfg: { theme?: string; palette?: string } = {}): string {
  const { theme = 'light', palette = 'insoft' } = cfg;
  return b64urlDe({ component: tag, theme, palette });
}

export const HOME: string | null = null;
export const ESTADO_THEMING: string = b64urlDe({ component: 'theming' });
export const ESTADO_ECOSYSTEM: string = b64urlDe({ component: 'ecosystem' });

const estados: Record<string, string | null> = {
  home: HOME,
  theming: ESTADO_THEMING,
  ecosystem: ESTADO_ECOSYSTEM,
  'is-code': estadoDe('is-code'),
  'is-component-diagram': estadoDe('is-component-diagram'),
  'is-bar-chart': estadoDe('is-bar-chart'),
  'is-icon': estadoDe('is-icon'),
};

/** URL de un estado conocido; null si la clave no existe. */
export function urlDe(estadoKey: string): string | null {
  const s = estados[estadoKey];
  const base = (ENV.baseUrl || process.env.E2E_BASE_URL || 'http://127.0.0.1:8391/index.html').replace(/\/+$/, '');
  return s ? `${base}?s=${s}` : null;
}
