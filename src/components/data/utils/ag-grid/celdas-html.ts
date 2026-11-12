// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid/celdas-html — Saneo de lo que entra a los strings de celda.
 * Puro: sin DOM. Cada valor del usuario pasa por aqui antes de tocar HTML.
 */

const MAPA_HTML: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const RE_HTML = /[&<>"']/g;
const RE_ESQUEMA = /^[\s\u0000-\u001f]*([a-z][a-z0-9+.-]*):/i;
const ESQUEMAS_SEGUROS = new Set(['http', 'https', 'mailto', 'tel']);

export function escaparHtml(valor: unknown): string {
  if (valor == null) return '';
  return String(valor).replace(RE_HTML, (c) => MAPA_HTML[c] ?? c);
}

/** Valor CSS para un atributo style: corta lo que abriria otra declaracion o una carga externa. */
export function limpiarCss(valor: unknown): string {
  if (valor == null) return '';
  const texto = String(valor);
  if (/url\s*\(|expression\s*\(|@import/i.test(texto)) return '';
  return texto.replace(/[;{}<>"]/g, '');
}

/** URL navegable: vacia si el esquema puede ejecutar codigo (javascript:, data:, vbscript:). */
export function urlSegura(valor: unknown): string {
  if (valor == null) return '';
  const url = String(valor).trim();
  const esquema = RE_ESQUEMA.exec(url)?.[1]?.toLowerCase();
  if (esquema == null) return url;
  return ESQUEMAS_SEGUROS.has(esquema) ? url : '';
}

/** Nombre de clase CSS: descarta lo que no pueda serlo. */
export function claseSegura(valor: unknown): string {
  return String(valor ?? '').replace(/[^\w\s-]/g, '').trim();
}

export function unirClases(...partes: Array<string | false | null | undefined>): string {
  let salida = '';
  for (const parte of partes) {
    if (!parte) continue;
    salida = salida ? `${salida} ${parte}` : parte;
  }
  return salida;
}

/** AG usa px en parametros numericos; aqui 16 unidades = 1em. */
export function aEm(unidades: number): string {
  return `${Math.round((unidades / 16) * 10000) / 10000}em`;
}

export function aNumero(valor: unknown): number | null {
  if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
  if (typeof valor !== 'string' || valor.trim() === '') return null;
  const n = Number(valor);
  return Number.isFinite(n) ? n : null;
}
