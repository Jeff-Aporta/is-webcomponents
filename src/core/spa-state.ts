/// <reference lib="dom" />
/**
 * Estado de una SPA estática en la URL: `?s=<base64url de un JSON>`.
 *
 *   import { createSpaState } from '.../core/spa-state.js';
 *   const nav = createSpaState({ initial: { p: 'README.md' }, viewOf: (s) => String(s.p) });
 *   nav.subscribe((s) => pintar(s.p));
 *   nav.merge({ p: 'docs/otra.md' }); // entra al historial: atrás vuelve a la anterior
 *
 * - Un cambio de vista (`viewOf`) es una entrada nueva del historial; el resto
 *   (scroll, filtros, borradores) reemplaza la entrada actual con debounce.
 * - Atrás/adelante del navegador vuelven a leer `?s=` y notifican.
 * - Funciona en cualquier hosting estático (Live Server, Pages, SWA): no usa rutas del servidor.
 */
import type { EstadoSpa, OpcionesSpaState, SpaState } from './spa-state.schemas.js';

export type { EstadoSpa, OpcionesSpaState, SpaState } from './spa-state.schemas.js';

/** Base64 URL-safe (sin `+`, `/` ni `=`) de un texto UTF-8. */
export function b64urlEncode(texto: string): string {
  const bytes = new TextEncoder().encode(texto);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Inverso de `b64urlEncode` (tolera la falta de relleno). */
export function b64urlDecode(b64: string): string {
  let b = String(b64).replace(/-/g, '+').replace(/_/g, '/');
  while (b.length % 4) b += '=';
  const bin = atob(b);
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}

/** Copia sin nulos ni valores (cadena u objeto) más largos que `max`; números y booleanos siempre viajan. */
export function recortarPorValor(estado: EstadoSpa, max: number): EstadoSpa {
  const out: EstadoSpa = {};
  for (const [k, v] of Object.entries(estado ?? {})) {
    if (v == null) continue;
    if (typeof v === 'string') { if (v.length <= max) out[k] = v; }
    else if (typeof v === 'number' || typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'object' && JSON.stringify(v).length <= max) out[k] = v;
  }
  return out;
}

const esObjeto = (x: unknown): x is EstadoSpa => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Controlador del estado de la vista serializado en `?<param>=`. */
export function createSpaState(opts: OpcionesSpaState = {}): SpaState {
  const PARAM = opts.param || 's';
  const debounceMs = opts.debounceMs ?? 300;
  const inicial = (): EstadoSpa => (typeof opts.initial === 'function' ? opts.initial() : { ...(opts.initial ?? {}) });

  let estado = inicial();
  let oyentes: Array<(s: EstadoSpa) => void> = [];
  let temporizador: ReturnType<typeof setTimeout> | null = null;
  let vistaEnHistorial = '';

  const copia = (): EstadoSpa => JSON.parse(JSON.stringify(estado));
  const recortar = (s: EstadoSpa) => (opts.slimForUrl ? opts.slimForUrl(s) : opts.maxValue ? recortarPorValor(s, opts.maxValue) : s);
  const normalizar = (crudo: unknown) => (opts.normalize ? opts.normalize(crudo, estado) : esObjeto(crudo) ? crudo : estado);
  const combinar = (s: EstadoSpa, p: EstadoSpa) => (opts.merge ? opts.merge(s, p) : opts.maxValue ? recortarPorValor({ ...s, ...p }, opts.maxValue) : { ...s, ...p });
  const vistaDe = (s: EstadoSpa) => (opts.viewOf ? String(opts.viewOf(s) ?? '') : '');

  function leerUrl(): unknown {
    const crudo = new URLSearchParams(location.search).get(PARAM);
    if (!crudo) return null;
    try { return JSON.parse(b64urlDecode(crudo)); } catch { return null; }
  }

  function urlDe(s: EstadoSpa): URL | null {
    let carga = s;
    if (opts.maxB64Len) {
      if (b64urlEncode(JSON.stringify(carga)).length > opts.maxB64Len) carga = recortar(carga);
      if (b64urlEncode(JSON.stringify(carga)).length > opts.maxB64Len) return null;
    }
    const json = JSON.stringify(recortar(carga));
    const url = new URL(location.href);
    if (json === '{}') url.searchParams.delete(PARAM);
    else url.searchParams.set(PARAM, b64urlEncode(json));
    return url;
  }

  function escribir(url: URL, modo: 'push' | 'replace') {
    const datos = opts.historyKey ? { [opts.historyKey]: true } : null;
    if (modo === 'push') history.pushState(datos, '', url);
    else history.replaceState(datos, '', url);
  }

  function actualizarUrl(forzar?: 'push' | 'replace') {
    try {
      const url = urlDe(estado);
      if (!url) return;
      const vista = vistaDe(estado);
      const empuja = forzar === 'push' || (forzar !== 'replace' && Boolean(vista) && vista !== vistaEnHistorial);
      escribir(url, empuja ? 'push' : 'replace');
      if (vista) vistaEnHistorial = vista;
    } catch (e) {
      console.warn(`spa-state: no se pudo escribir ?${PARAM}=`, e);
    }
  }

  /** La vista anterior se queda en su entrada (con lo pendiente) y la nueva abre otra. */
  function abrirVista(antes: EstadoSpa) {
    const habiaPendiente = temporizador !== null;
    if (temporizador) clearTimeout(temporizador);
    temporizador = null;
    const ahora = estado;
    const previa = urlDe(antes);
    if (habiaPendiente && previa && previa.href !== location.href) {
      estado = antes;
      actualizarUrl('replace');
    }
    estado = ahora;
    actualizarUrl('push');
  }

  function programar() {
    if (temporizador) clearTimeout(temporizador);
    temporizador = setTimeout(() => { temporizador = null; actualizarUrl(); }, debounceMs);
  }

  function notificar() {
    for (const fn of oyentes) { try { fn(copia()); } catch { /* un oyente roto no corta a los demás */ } }
  }

  function aplicar(nuevo: EstadoSpa, antes: EstadoSpa) {
    estado = nuevo;
    const va = vistaDe(antes);
    const vn = vistaDe(estado);
    if (va && vn && va !== vn) abrirVista(antes);
    else programar();
    notificar();
    return copia();
  }

  /**
   * Enlaces de la misma página que solo cambian `?<param>=`: se navegan sin recargar
   * (sin parpadeo) con `navigate`. Atraviesa shadow roots (`composedPath`). Se excluyen
   * clic con modificadores o botón no principal, `target` distinto de `_self`,
   * `download` y `data-spa="off"`.
   */
  const alClicEnlace = (e: MouseEvent) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = e.composedPath().find((n): n is HTMLAnchorElement => typeof n === 'object' && n !== null && Reflect.get(n, 'tagName') === 'A' && 'href' in n);
    if (!a || a.getAttribute('data-spa') === 'off' || a.hasAttribute('download')) return;
    const target = (a.getAttribute('target') || '').toLowerCase();
    if (target && target !== '_self') return;
    let destino: URL;
    try { destino = new URL(a.href, location.href); } catch { return; }
    const aqui = new URL(location.href);
    if (destino.origin !== aqui.origin || destino.pathname !== aqui.pathname) return;
    // Solo cambia `?param=` (el resto de la query y el hash se respetan tal cual).
    const resto = (u: URL) => { const q = new URLSearchParams(u.search); q.delete(PARAM); return q.toString(); };
    if (resto(destino) !== resto(aqui)) return;
    e.preventDefault();
    const crudo = destino.searchParams.get(PARAM);
    let nuevo: unknown = null;
    if (crudo) { try { nuevo = JSON.parse(b64urlDecode(crudo)); } catch { nuevo = null; } }
    if (nuevo === null) api.clearQuery();
    else api.navigate(normalizar(nuevo));
  };

  const alNavegar = () => {
    if (temporizador) clearTimeout(temporizador);
    temporizador = null;
    const crudo = leerUrl();
    estado = crudo ? normalizar(crudo) : inicial();
    vistaEnHistorial = vistaDe(estado);
    notificar();
  };

  const api: SpaState = {
    PARAM,
    get: copia,
    merge: (parcial) => (esObjeto(parcial) ? aplicar(combinar(estado, parcial), copia()) : copia()),
    navigate(nuevo, modo) {
      const antes = copia();
      estado = esObjeto(nuevo) ? normalizar(nuevo) : inicial();
      if (temporizador) clearTimeout(temporizador);
      temporizador = null;
      const va = vistaDe(antes);
      const vn = vistaDe(estado);
      actualizarUrl(modo ?? (va !== vn ? 'push' : 'replace'));
      notificar();
      return copia();
    },
    hrefFor(parcial) {
      try {
        const sig = esObjeto(parcial) ? combinar(copia(), parcial) : copia();
        return urlDe(sig)?.href ?? location.href;
      } catch {
        return location.href;
      }
    },
    reset: () => aplicar(inicial(), copia()),
    clearQuery() {
      const antes = copia();
      estado = inicial();
      if (temporizador) clearTimeout(temporizador);
      temporizador = null;
      const url = new URL(location.href);
      url.search = '';
      const va = vistaDe(antes);
      const vn = vistaDe(estado);
      escribir(url, va && vn && va !== vn ? 'push' : 'replace');
      vistaEnHistorial = vn;
      notificar();
      return copia();
    },
    subscribe(fn) {
      oyentes.push(fn);
      return () => { oyentes = oyentes.filter((f) => f !== fn); };
    },
    boot: {},
    destroy() {
      removeEventListener('popstate', alNavegar);
      removeEventListener('click', alClicEnlace, true);
      oyentes = [];
    },
  };

  const crudo = leerUrl();
  if (crudo) {
    try { estado = normalizar(crudo); } catch (e) { console.warn(`spa-state: ?${PARAM}= inválido`, e); }
  }
  opts.onInit?.(estado, api);
  vistaEnHistorial = vistaDe(estado);
  addEventListener('popstate', alNavegar);
  if (opts.links !== false) addEventListener('click', alClicEnlace, true);
  api.boot = copia();
  return api;
}
