// @contexto INDICE.md · src/components/data/README.md
/**
 * ag-grid/celdas/renderers — Renderers declarativos: `cellRenderer: 'delta'`.
 *
 * Todos devuelven string y no crean custom elements (salvo el icono Iconify de
 * una accion que lo pida): el pool recicla el DOM y un scroll repinta decenas de
 * celdas por cuadro. Los parametros llegan en `ctx.params` (cellRendererParams).
 */
import type { Opciones } from './celdas-renderers.schemas.js';
import type { ContextoCelda, RendererCelda } from './contrato.schemas.js';
import { fmtFecha, fmtMoneda, fmtNumero, fmtPorcentaje, fmtValor } from './celdas-formatos.js';
import { aNumero, escaparHtml, limpiarCss, urlSegura } from './celdas-html.js';
import { htmlSparkline, normalizarSerie, resumenSerie } from './celdas-spark.js';
import type { AccionCelda, CambioCelda, FormatoFecha, FormatoMoneda, FormatoNumero, FormatoPorcentaje, FormatoValor, OpcionesSparkline, Umbral } from './celdas.schemas.js';
import { paramsCelda } from './celdas-valores.js';

const TONOS = new Set<string>(['success', 'danger', 'warning', 'info', 'neutral', 'brand']);
const FLECHA_ARRIBA = '<svg class="iswc-ag-flecha" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 1.5 9.5 8.5H.5z"/></svg>';
const FLECHA_ABAJO = '<svg class="iswc-ag-flecha" viewBox="0 0 10 10" aria-hidden="true"><path d="M5 8.5.5 1.5h9z"/></svg>';
const MARCA = '<svg viewBox="0 0 12 12" aria-hidden="true"><path d="M2.5 6.5 5 9l4.5-5.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const COLORES_LOGO = 7;

function textoDe(ctx: ContextoCelda, clave: string, porDefecto: string): string {
  return ctx.grid.texto(clave, porDefecto);
}

/** Lee un parametro que puede ser dato fijo, funcion(params) o, con `campo`, ruta en la fila. */
function resolver(ctx: ContextoCelda, opcion: unknown): unknown {
  return typeof opcion === 'function' ? (opcion as (p: unknown) => unknown)(paramsCelda(ctx)) : opcion;
}

function campo(ctx: ContextoCelda, nombre: unknown): unknown {
  return typeof nombre === 'string' ? ctx.data?.[nombre] : undefined;
}

function tonoHtml(tono: string | undefined): { clase: string; estilo: string } {
  if (!tono) return { clase: 'iswc-ag-tono-neutral', estilo: '' };
  if (TONOS.has(tono)) return { clase: `iswc-ag-tono-${tono}`, estilo: '' };
  return { clase: '', estilo: ` style="--iswc-ag-tono:${escaparHtml(limpiarCss(tono))}"` };
}

function iniciales(texto: string): string {
  const palabras = texto.trim().split(/[\s._-]+/).filter(Boolean);
  if (palabras.length > 1) return `${palabras[0]?.[0] ?? ''}${palabras[1]?.[0] ?? ''}`.toUpperCase();
  return texto.trim().slice(0, 2).toUpperCase();
}

function indiceColor(texto: string): number {
  let h = 0;
  for (let i = 0; i < texto.length; i++) h = (h * 31 + texto.charCodeAt(i)) | 0;
  return Math.abs(h) % COLORES_LOGO;
}

function logoHtml(url: unknown, texto: string): string {
  const seguro = urlSegura(url);
  const imagen = seguro ? `<img src="${escaparHtml(seguro)}" alt="" loading="lazy" decoding="async">` : '';
  return `<span class="iswc-ag-logo iswc-ag-logo-${indiceColor(texto)}" aria-hidden="true">${escaparHtml(iniciales(texto))}${imagen}</span>`;
}

/** Logo + texto + subtexto, p. ej. ticker y nombre de empresa. El logo roto deja las iniciales. */
const logoTexto: RendererCelda = (ctx) => {
  const p = ctx.params;
  const principal = ctx.texto;
  if (!principal) return '';
  const logo = resolver(ctx, p['logo']) ?? campo(ctx, p['logoField']);
  const sub = resolver(ctx, p['sub']) ?? campo(ctx, p['subField']);
  const secundario = sub == null || sub === '' ? '' : `<span class="iswc-ag-sub">${escaparHtml(sub)}</span>`;
  const enLinea = p['enLinea'] === true ? ' iswc-ag-logotexto-linea' : '';
  return `<span class="iswc-ag-logotexto${enLinea}">${logoHtml(logo, principal)}<span class="iswc-ag-logotexto-txt"><span class="iswc-ag-principal">${escaparHtml(principal)}</span>${secundario}</span></span>`;
};

export const sparkline: RendererCelda = (ctx) => {
  const p = ctx.params;
  const o = (p['sparklineOptions'] ?? {}) as OpcionesSparkline;
  const opciones: OpcionesSparkline = p['tipo'] ? { ...o, type: p['tipo'] as OpcionesSparkline['type'] } : o;
  const serie = normalizarSerie(ctx.value, opciones);
  const r = resumenSerie(serie);
  if (r.n === 0) return '';
  const plantilla = textoDe(ctx, 'sparklineResumen', '{n} valores, ultimo {ultimo}');
  const etiqueta = plantilla.replace('{n}', String(r.n)).replace('{ultimo}', fmtNumero(r.ultimo, { maxDecimales: 2 }));
  return htmlSparkline(ctx.value, opciones, etiqueta);
};

function direccion(n: number, umbral: number): 'up' | 'down' | 'flat' {
  if (Math.abs(n) <= umbral) return 'flat';
  return n > 0 ? 'up' : 'down';
}

function deltaHtml(n: number, texto: string, invertir: boolean, umbral: number, soloIcono: boolean): string {
  const d = direccion(n, umbral);
  const flecha = d === 'up' ? FLECHA_ARRIBA : d === 'down' ? FLECHA_ABAJO : '';
  const bueno = invertir ? d === 'down' : d === 'up';
  const clase = d === 'flat' ? 'iswc-ag-flat' : bueno ? 'iswc-ag-up' : 'iswc-ag-down';
  const contenido = soloIcono ? '' : `<span>${escaparHtml(texto)}</span>`;
  return `<span class="iswc-ag-delta ${clase}">${flecha}${contenido}</span>`;
}

/** Variacion con flecha y color. `invertir`: para costos, bajar es lo bueno. */
export const delta: RendererCelda = (ctx) => {
  const p = ctx.params;
  const n = aNumero(ctx.value);
  if (n == null) return ctx.texto ? escaparHtml(ctx.texto) : '';
  const formato = p['formato'] as FormatoValor | undefined;
  const con = p as FormatoMoneda & FormatoPorcentaje;
  const absoluto = p['conSigno'] === true ? n : Math.abs(n);
  const texto = formato || p['decimales'] != null ? fmtValor(absoluto, formato, { ...con, signo: p['conSigno'] === true }) : (ctx.def['valueFormatter'] ? ctx.texto : fmtNumero(absoluto, con));
  return deltaHtml(n, texto, p['invertir'] === true, aNumero(p['umbral']) ?? 0, p['soloIcono'] === true);
};

function pillHtml(ctx: ContextoCelda, valor: unknown): string {
  const p = ctx.params;
  const clave = String(valor);
  const colores = p['colores'] as Record<string, string> | undefined;
  const etiquetas = p['etiquetas'] as Record<string, string> | undefined;
  const { clase, estilo } = tonoHtml(colores?.[clave] ?? (p['tono'] as string | undefined));
  const texto = etiquetas?.[clave] ?? (Array.isArray(ctx.value) ? clave : ctx.texto || clave);
  const punto = p['punto'] === true ? '<i class="iswc-ag-pill-punto"></i>' : '';
  return `<span class="iswc-ag-pill ${clase}"${estilo}>${punto}${escaparHtml(texto)}</span>`;
}

/** Estado o etiquetas. `colores` admite tonos del kit o un color CSS; un arreglo pinta varias. */
export const pill: RendererCelda = (ctx) => {
  if (ctx.value == null || ctx.value === '') return '';
  if (!Array.isArray(ctx.value)) return pillHtml(ctx, ctx.value);
  return `<span class="iswc-ag-pills">${ctx.value.map((v: unknown) => pillHtml(ctx, v)).join('')}</span>`;
};

function tonoPorUmbral(porcentaje: number, umbrales: Umbral[] | undefined): string | undefined {
  return umbrales?.find((u) => porcentaje <= u.hasta)?.tono;
}

export const progreso: RendererCelda = (ctx) => {
  const p = ctx.params;
  const n = aNumero(ctx.value);
  if (n == null) return '';
  const min = aNumero(p['min']) ?? 0;
  const max = aNumero(p['max']) ?? 100;
  const porcentaje = Math.max(0, Math.min(100, ((n - min) / (max - min || 1)) * 100));
  const { clase, estilo } = tonoHtml(tonoPorUmbral(porcentaje, p['umbrales'] as Umbral[] | undefined) ?? (p['tono'] as string | undefined) ?? 'brand');
  const etiqueta = p['sinTexto'] === true ? '' : `<span class="iswc-ag-progreso-txt">${escaparHtml(ctx.texto || fmtNumero(n, { maxDecimales: 1 }))}</span>`;
  return `<span class="iswc-ag-progreso ${clase}"${estilo} role="progressbar" aria-valuemin="${min}" aria-valuemax="${max}" aria-valuenow="${n}"><span class="iswc-ag-progreso-riel"><span style="inline-size:${Math.round(porcentaje * 10) / 10}%"></span></span>${etiqueta}</span>`;
};

const rating: RendererCelda = (ctx) => {
  const n = aNumero(ctx.value);
  if (n == null) return '';
  const max = aNumero(ctx.params['max']) ?? 5;
  const estrellas = '★'.repeat(max);
  const porcentaje = Math.max(0, Math.min(100, (n / max) * 100));
  const etiqueta = textoDe(ctx, 'ratingResumen', '{n} de {max}').replace('{n}', String(n)).replace('{max}', String(max));
  return `<span class="iswc-ag-rating" role="img" aria-label="${escaparHtml(etiqueta)}"><span aria-hidden="true">${estrellas}</span><span class="iswc-ag-rating-lleno" aria-hidden="true" style="inline-size:${porcentaje}%">${estrellas}</span></span>`;
};

/** Casilla de solo lectura; si la columna es editable, un clic alterna (ver `instalar`). */
export const booleano: RendererCelda = (ctx) => {
  if (ctx.value == null && ctx.params['mostrarVacio'] !== true) return '';
  const marcado = ctx.value === true || ctx.value === 'true';
  const editable = ctx.def['editable'] === true;
  const clase = `iswc-ag-check${marcado ? ' iswc-ag-check-on' : ''}${editable ? ' iswc-ag-check-editable' : ''}`;
  return `<span class="${clase}" role="checkbox" aria-checked="${marcado}" aria-readonly="${!editable}">${marcado ? MARCA : ''}</span>`;
};

function numerico(ctx: ContextoCelda, texto: string, opciones: Opciones): string {
  if (!texto) return '';
  const clase = opciones['colorSigno'] === true ? ` ${claseSigno(ctx.value)}` : '';
  return `<span class="iswc-ag-num${clase}">${escaparHtml(texto)}</span>`;
}

function claseSigno(valor: unknown): string {
  const n = aNumero(valor) ?? 0;
  if (n === 0) return 'iswc-ag-flat';
  return n > 0 ? 'iswc-ag-up' : 'iswc-ag-down';
}

const numero: RendererCelda = (ctx) => numerico(ctx, ctx.def['valueFormatter'] ? ctx.texto : fmtNumero(ctx.value, ctx.params as FormatoNumero), ctx.params);
const moneda: RendererCelda = (ctx) => numerico(ctx, ctx.def['valueFormatter'] ? ctx.texto : fmtMoneda(ctx.value, ctx.params as FormatoMoneda), ctx.params);
export const porcentaje: RendererCelda = (ctx) => numerico(ctx, ctx.def['valueFormatter'] ? ctx.texto : fmtPorcentaje(ctx.value, ctx.params as FormatoPorcentaje), ctx.params);

export const fecha: RendererCelda = (ctx) => {
  const texto = ctx.def['valueFormatter'] ? ctx.texto : fmtFecha(ctx.value, ctx.params as FormatoFecha);
  return texto ? `<span class="iswc-ag-num">${escaparHtml(texto)}</span>` : '';
};

export const enlace: RendererCelda = (ctx) => {
  const p = ctx.params;
  const url = urlSegura(resolver(ctx, p['href']) ?? ctx.value);
  const texto = resolver(ctx, p['texto']) ?? ctx.texto;
  if (!url) return escaparHtml(texto);
  const externo = p['target'] ?? '_blank';
  return `<a class="iswc-ag-link" href="${escaparHtml(url)}" target="${escaparHtml(externo)}" rel="noopener noreferrer">${escaparHtml(texto)}</a>`;
};

function iconoAccion(a: AccionCelda): string {
  if (a.svg) return `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${escaparHtml(a.svg)}"/></svg>`;
  if (a.icono) return `<iswc-icon icon="${escaparHtml(a.icono)}"></iswc-icon>`;
  return escaparHtml(a.texto ?? a.id);
}

/** Botones por fila. El clic se delega en `instalar`: aqui no hay listeners por celda. */
export const acciones: RendererCelda = (ctx) => {
  const lista = (resolver(ctx, ctx.params['acciones']) ?? []) as AccionCelda[];
  const botones: string[] = [];
  for (const a of lista) {
    if (a.visible != null && !resolver(ctx, a.visible)) continue;
    const apagado = a.deshabilitado != null && resolver(ctx, a.deshabilitado) ? ' disabled' : '';
    const { clase, estilo } = tonoHtml(a.tono);
    const titulo = escaparHtml(a.texto ?? a.id);
    botones.push(`<button class="iswc-ag-accion ${a.tono ? clase : ''}"${estilo} type="button" data-accion="${escaparHtml(a.id)}" title="${titulo}" aria-label="${titulo}"${apagado}>${iconoAccion(a)}</button>`);
  }
  return `<span class="iswc-ag-acciones">${botones.join('')}</span>`;
};

/** Equivale a agAnimateShowChangeCellRenderer: la diferencia junto al valor, y luego se apaga. */
const animarCambio: RendererCelda = (ctx) => {
  const valor = `<span class="iswc-ag-num">${escaparHtml(ctx.texto)}</span>`;
  const cambio = ctx.params['cambio'] as CambioCelda | undefined;
  const nuevo = aNumero(cambio?.nuevo);
  const anterior = aNumero(cambio?.anterior);
  if (nuevo == null || anterior == null || nuevo === anterior) return valor;
  const diferencia = nuevo - anterior;
  const texto = fmtNumero(Math.abs(diferencia), { maxDecimales: 2 });
  return `<span class="iswc-ag-cambio">${deltaHtml(diferencia, texto, false, 0, false)}${valor}</span>`;
};

/** Equivale a agAnimateSlideCellRenderer: el valor previo se desliza y se desvanece. */
const animarDeslizar: RendererCelda = (ctx) => {
  const valor = `<span class="iswc-ag-num">${escaparHtml(ctx.texto)}</span>`;
  const cambio = ctx.params['cambio'] as CambioCelda | undefined;
  if (cambio == null || cambio.anterior == null) return valor;
  return `<span class="iswc-ag-deslizar"><span class="iswc-ag-deslizar-viejo" aria-hidden="true">${escaparHtml(cambio.anterior)}</span>${valor}</span>`;
};

export const RENDERERS: Record<string, RendererCelda> = {
  logoTexto,
  ticker: logoTexto,
  sparkline,
  agSparklineCellRenderer: sparkline,
  delta,
  pill,
  progreso,
  rating,
  booleano,
  agCheckboxCellRenderer: booleano,
  numero,
  moneda,
  porcentaje,
  fecha,
  enlace,
  link: enlace,
  acciones,
  animarCambio,
  agAnimateShowChangeCellRenderer: animarCambio,
  animarDeslizar,
  agAnimateSlideCellRenderer: animarDeslizar,
};
