// @contexto INDICE.md · src/components/data/README.md
import type { VentanaFilas, ColPos, Diseno, PiezasMotor, InternosMotor, RecCelda, RecFila, GrupoFila } from './nucleo-motor.schemas.js';
import { applyFlex, colWindow, columnLayout } from '@jeff-aporta/iswc-base/components/data/utils/datagrid-core/viewport.js';
import { orderedForLayout } from '@jeff-aporta/iswc-base/components/data/utils/datagrid-core/column-state.js';
import type { RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { ContextoCelda, FilaDisplay, FilaExtra, GridHost, Rect, RefCelda, RendererMontable } from './contrato.schemas.js';

/**
 * ag-grid/nucleo-motor — Indice de alturas de fila para virtualizar.
 *
 * Con alto uniforme la posicion es una multiplicacion. Cuando alguna fila
 * difiere (detalle, autoHeight, getRowHeight) se construye una suma prefija y
 * la ventana se busca por biseccion. Medidas en px: solo se usan para la
 * matematica del scroll; al DOM llegan convertidas a em.
 */

function crearAlturas() {
  let cantidad = 0;
  let base = 0;
  let prefijo: Float64Array | null = null;

  function configurar(n: number, altoBase: number, altoDe: ((i: number) => number | undefined) | null): void {
    cantidad = n;
    base = altoBase;
    prefijo = null;
    if (!altoDe) return;
    const suma = new Float64Array(n + 1);
    let variable = false;
    for (let i = 0; i < n; i++) {
      const a = altoDe(i);
      if (a !== undefined && a !== altoBase) variable = true;
      suma[i + 1] = suma[i]! + (a ?? altoBase);
    }
    if (variable) prefijo = suma;
  }

  function arriba(i: number): number {
    return prefijo ? (prefijo[Math.max(0, Math.min(i, cantidad))] ?? 0) : i * base;
  }

  function alto(i: number): number {
    return arriba(i + 1) - arriba(i);
  }

  function total(): number {
    return arriba(cantidad);
  }

  function indiceEn(y: number): number {
    if (!prefijo) return base > 0 ? Math.floor(y / base) : 0;
    let lo = 0;
    let hi = cantidad;
    while (lo < hi) {
      const m = (lo + hi + 1) >> 1;
      if (prefijo[m]! <= y) lo = m;
      else hi = m - 1;
    }
    return lo;
  }

  function ventana(scroll: number, alturaVista: number, margen: number): VentanaFilas {
    const primero = indiceEn(scroll);
    const ultimo = indiceEn(scroll + alturaVista);
    return { inicio: Math.max(0, primero - margen), fin: Math.min(cantidad, ultimo + 1 + margen), total: total() };
  }

  return { configurar, arriba, alto, total, indiceEn, ventana };
}

// ── motor ──
/**
 * ag-grid/nucleo-motor — Render virtualizado del cuerpo.
 *
 * Pool de filas por clave: una fila que sigue visible conserva su DOM y solo
 * cambia de posicion (eso anima el orden y el filtro). Cada fila tiene tres
 * secciones: izquierda y derecha son sticky, el centro virtualiza columnas con
 * celdas absolutas. Solo se escribe al DOM lo que cambio.
 *
 * Unidades: anchos en u (1u = 1/16em), alturas en px para la matematica del
 * scroll. Al DOM todo llega en em, asi que un `font-size` escala la grilla.
 */
export const ANCHO_SELECCION = 44;
const SELECCION = '__seleccion';
const MARGEN_FILAS = 6;

function claveDe(fila: FilaDisplay | null, i: number): string {
  if (!fila) return `__carga-${i}`;
  if (fila.kind === 'leaf') return (fila as { node: RowNode }).node.id;
  return (fila as FilaExtra).id;
}

function nuevaSeccion(clase: string): HTMLElement {
  const s = document.createElement('div');
  s.className = clase;
  s.setAttribute('role', 'presentation');
  return s;
}

function htmlSeguro(html: string): boolean {
  return !/[<&]/.test(html);
}

export function crearMotor(h: GridHost, p: PiezasMotor, int: InternosMotor) {
  const alturas = crearAlturas();
  const filas = new Map<string, RecFila>();
  const porIndice = new Map<number, RecFila>();
  const libres: RecFila[] = [];
  const altosMedidos = new Map<string, number>();

  let pxU = 1;
  let altoBase = 40;
  let altoCabecera = 0;
  let altoPie = 0;
  let gen = 1;
  let listaFirma = -1;
  let listaTotal = -1;
  let altosRev = 0;
  let altosRevUsada = -1;
  let pendiente = 0;
  let scrollTop = 0;
  let scrollLeft = 0;
  let diseno: Diseno = { izq: [], centro: [], der: [], anchoIzq: 0, anchoCentro: 0, anchoDer: 0, anchoTotal: 0, total: 0 };
  let firmaDiseno: unknown = null;
  let layoutCentro = columnLayout([], [], []);
  let foco: RefCelda | null = null;
  let hayAutoAlto = false;
  let temporizador = 0;
  /** Se lee una vez por frame: medir dentro del pintado forzaba un layout por fila. */
  let anchoCentroVisible = 0;

  function medir(): void {
    const fs = parseFloat(getComputedStyle(p.sondaFila).fontSize) || 16;
    const proporcion = pxU > 0 ? fs / 16 / pxU : 1;
    pxU = fs / 16;
    if (proporcion !== 1 && Number.isFinite(proporcion)) {
      // Cambio de font-size: la misma fila sigue arriba y los anchos se reescalan.
      p.viewport.scrollTop *= proporcion;
      p.viewport.scrollLeft *= proporcion;
      scrollTop = p.viewport.scrollTop;
      scrollLeft = p.viewport.scrollLeft;
    }
    const opcion = h.opcion<number | undefined>('rowHeight');
    altoBase = opcion ? opcion * pxU : (p.sondaFila.getBoundingClientRect().height || 40);
    altosRev += 1;
    firmaDiseno = null;
  }

  function calcularDiseno(): boolean {
    const columnas = h.columnas();
    const ancho = p.viewport.clientWidth;
    const firma = `${ancho}|${pxU}|${int.columnaSeleccion()}`;
    if (firmaDiseno === columnas && (p.viewport.dataset['firma'] ?? '') === firma) return false;
    firmaDiseno = columnas;
    p.viewport.dataset['firma'] = firma;
    const seleccion = int.columnaSeleccion() ? ANCHO_SELECCION : 0;
    const layout = orderedForLayout(columnas);
    const plano = [...layout.left, ...layout.center, ...layout.right];
    const flex = applyFlex(plano, Math.max(0, ancho / pxU - seleccion));
    const izq: ColPos[] = [];
    const centro: ColPos[] = [];
    const der: ColPos[] = [];
    let xi = seleccion;
    let xc = 0;
    let xd = 0;
    flex.forEach((col, i) => {
      const aria = i + 1 + (seleccion ? 1 : 0);
      if (col.pinned === 'left') {
        izq.push({ col, x: xi, ancho: col.width, aria });
        xi += col.width;
      } else if (col.pinned === 'right') {
        der.push({ col, x: xd, ancho: col.width, aria });
        xd += col.width;
      } else {
        centro.push({ col, x: xc, ancho: col.width, aria });
        xc += col.width;
      }
    });
    diseno = { izq, centro, der, anchoIzq: xi, anchoCentro: xc, anchoDer: xd, anchoTotal: xi + xc + xd, total: flex.length + (seleccion ? 1 : 0) };
    layoutCentro = columnLayout(centro.map((c) => c.col), [], []);
    layoutCentro.positions = centro.map((c) => c.x);
    hayAutoAlto = flex.some((c) => h.defDe(c)['autoHeight'] === true);
    gen += 1;
    return true;
  }

  function altoDeFila(i: number): number | undefined {
    const f = h.filaEn(i);
    if (!f) return undefined;
    if ((f as { pegar?: string }).pegar) return 0;
    const extra = f as FilaExtra;
    if (extra.alto !== undefined) return extra.alto * pxU;
    const clave = claveDe(f, i);
    const medido = altosMedidos.get(clave);
    if (medido !== undefined) return medido;
    const getRowHeight = h.opcion<((p: Record<string, unknown>) => number | undefined) | undefined>('getRowHeight');
    if (getRowHeight && f.kind === 'leaf') {
      const node = (f as { node: RowNode }).node;
      const a = getRowHeight({ node, data: node.data });
      if (a) return a * pxU;
    }
    return undefined;
  }

  function sincronizarAlturas(): void {
    const n = h.totalFilas();
    const lista = h.estado();
    const firma = lista ? (lista.pagination ? lista.pageDisplayRows : lista.displayRows).length * 31 + lista.page : 0;
    if (n === listaTotal && firma === listaFirma && altosRev === altosRevUsada) return;
    listaTotal = n;
    listaFirma = firma;
    altosRevUsada = altosRev;
    const variable = altosMedidos.size > 0 || h.opcion('getRowHeight') != null || n < 200000;
    alturas.configurar(n, altoBase, variable ? altoDeFila : null);
    p.cuerpo.style.blockSize = `${alturas.total() / (pxU * 16)}em`;
  }

  /** El orden de la lista cambio aunque el largo no: rehacer alturas variables. */
  function listaCambio(): void {
    altosRev += 1;
    gen += 1;
  }

  function contexto(pos: ColPos, node: RowNode, indice: number): ContextoCelda {
    const def = h.defDe(pos.col);
    return { grid: h, col: pos.col, def, node, data: node.data, value: h.valor(pos.col, node), texto: '', rowIndex: indice, params: (def['cellRendererParams'] ?? {}) as Record<string, unknown> };
  }

  function escribirContenido(rec: RecCelda, html: string, r: RendererMontable, ctx: ContextoCelda): void {
    if (rec.html === html && !r.montar) return;
    rec.limpiar?.();
    rec.limpiar = null;
    rec.html = html;
    if (htmlSeguro(html)) rec.el.textContent = html;
    else rec.el.innerHTML = html;
    if (r.montar) rec.limpiar = r.montar(rec.el, ctx) ?? null;
  }

  function pintarCelda(fila: RecFila, sec: HTMLElement, pos: ColPos, x: number, ancho: number, node: RowNode, indice: number, forzado?: unknown, textoForzado?: string): void {
    const colId = pos.col.colId;
    let rec = fila.celdas.get(colId);
    if (!rec) {
      const el = document.createElement('div');
      el.setAttribute('role', 'gridcell');
      el.dataset['colId'] = colId;
      sec.append(el);
      rec = { el, html: '\u0000', clase: '', estilo: '', limpiar: null };
      fila.celdas.set(colId, rec);
    } else if (rec.el.parentElement !== sec) sec.append(rec.el);
    rec.el.dataset['rowId'] = node.id;
    rec.el.setAttribute('aria-colindex', String(pos.aria));
    const ctx = contexto(pos, node, indice);
    if (forzado !== undefined) {
      ctx.value = forzado;
      ctx.texto = textoForzado ?? String(forzado);
    }
    const r = int.resolver(ctx);
    const contenido = r.html(ctx);
    const decoraciones = int.decorar(ctx);
    const prefijo = decoraciones.map((d) => d.prefijo ?? '').join('');
    const presentacion = int.presentarCelda(ctx);
    const alinear = pos.col.align === 'right' ? ' mim-dg__cell--right' : pos.col.align === 'center' ? ' mim-dg__cell--center' : '';
    const enfocada = foco && foco.indice === indice && foco.colId === colId ? ' iswc-focused' : '';
    const clase = `mim-dg__cell${alinear}${enfocada}${presentacion?.clases ? ` ${presentacion.clases}` : ''}${decoraciones.map((d) => (d.clase ? ` ${d.clase}` : '')).join('')}`;
    if (clase !== rec.clase) {
      rec.clase = clase;
      rec.el.className = clase;
    }
    const estilo = `inset-inline-start:${x / 16}em;inline-size:${ancho / 16}em;${presentacion?.estilo ?? ''}`;
    if (estilo !== rec.estilo) {
      rec.estilo = estilo;
      rec.el.style.cssText = estilo;
    }
    const titulo = presentacion?.titulo ?? decoraciones.find((d) => d.titulo)?.titulo;
    if (titulo) rec.el.title = titulo;
    else if (rec.el.title) rec.el.removeAttribute('title');
    escribirContenido(rec, prefijo + contenido, r, ctx);
  }

  function celdaSeleccion(fila: RecFila, node: RowNode, indice: number): void {
    let rec = fila.celdas.get(SELECCION);
    if (!rec) {
      const el = document.createElement('div');
      el.setAttribute('role', 'gridcell');
      el.setAttribute('aria-colindex', '1');
      el.dataset['colId'] = SELECCION;
      el.className = 'mim-dg__cell mim-dg__cell--check iswc-pinned iswc-pinned-left';
      el.style.cssText = `inset-inline-start:0;inline-size:${ANCHO_SELECCION / 16}em;`;
      el.innerHTML = '<span class="mim-dg__checkbox"></span>';
      fila.secs[0]!.append(el);
      rec = { el, html: '', clase: '', estilo: '', limpiar: null };
      fila.celdas.set(SELECCION, rec);
    }
    rec.el.dataset['rowId'] = node.id;
    void indice;
    const marcado = int.seleccionados().has(node.id);
    const opcion = h.opcion<{ isRowSelectable?: (n: RowNode) => boolean; hideDisabledCheckboxes?: boolean } | string | undefined>('rowSelection');
    const reglas = typeof opcion === 'object' ? opcion : null;
    const elegible = reglas?.isRowSelectable?.(node) !== false;
    const estado = elegible ? '' : reglas?.hideDisabledCheckboxes ? ' iswc-oculta' : ' iswc-deshabilitada';
    rec.el.firstElementChild!.className = `mim-dg__checkbox mim-dg__checkbox--${marcado ? 'all' : 'none'}${estado}`;
  }

  function quitarCeldas(fila: RecFila, vivas: Set<string>): void {
    for (const [colId, rec] of fila.celdas) {
      if (vivas.has(colId)) continue;
      rec.limpiar?.();
      rec.el.remove();
      fila.celdas.delete(colId);
    }
  }

  function pintarCeldas(fila: RecFila, node: RowNode, indice: number): void {
    const vivas = new Set<string>();
    if (int.columnaSeleccion()) {
      celdaSeleccion(fila, node, indice);
      vivas.add(SELECCION);
    }
    const pintarSeccion = (lista: ColPos[], sec: HTMLElement): void => {
      for (let i = 0; i < lista.length; i++) {
        const pos = lista[i]!;
        const colSpan = h.defDe(pos.col)['colSpan'];
        let ancho = pos.ancho;
        let salto = 0;
        if (typeof colSpan === 'function') {
          const n = Number(colSpan({ node, data: node.data, column: pos.col })) || 1;
          for (let k = 1; k < n && lista[i + k]; k++) {
            ancho += lista[i + k]!.ancho;
            salto += 1;
          }
        }
        vivas.add(pos.col.colId);
        pintarCelda(fila, sec, pos, pos.x, ancho, node, indice);
        i += salto;
      }
    };
    pintarSeccion(diseno.izq, fila.secs[0]!);
    const vista = colWindow(layoutCentro, scrollLeft / pxU, anchoCentroVisible);
    pintarSeccion(diseno.centro.slice(vista.start, vista.end), fila.secs[1]!);
    pintarSeccion(diseno.der, fila.secs[2]!);
    fila.ventana = `${vista.start}:${vista.end}`;
    quitarCeldas(fila, vivas);
  }

  /** Etiqueta del grupo: ocupa desde la primera columna hasta el primer agregado. */
  function celdaEtiquetaGrupo(fila: RecFila, sec: HTMLElement, pos: ColPos, ancho: number, g: GrupoFila): void {
    const colId = pos.col.colId;
    let rec = fila.celdas.get(colId);
    if (!rec) {
      const el = document.createElement('div');
      el.setAttribute('role', 'gridcell');
      el.dataset['colId'] = colId;
      sec.append(el);
      rec = { el, html: '\u0000', clase: '', estilo: '', limpiar: null };
      fila.celdas.set(colId, rec);
    } else if (rec.el.parentElement !== sec) sec.append(rec.el);
    const clase = 'mim-dg__cell mim-dg__group-cell';
    if (rec.clase !== clase) {
      rec.clase = clase;
      rec.el.className = clase;
    }
    rec.el.setAttribute('aria-colindex', String(pos.aria));
    rec.el.setAttribute('aria-colspan', '1');
    const estilo = `inset-inline-start:${pos.x / 16}em;inline-size:${ancho / 16}em;padding-inline-start:${0.6 + g.level * 1.25}em;`;
    if (rec.estilo !== estilo) {
      rec.estilo = estilo;
      rec.el.style.cssText = estilo;
    }
    const chevron = (g as { expandible?: boolean }).expandible === false ? '' : `<span class="mim-dg__group-chevron${g.expanded ? ' iswc-open' : ''}"></span>`;
    const html = `${chevron}<span class="mim-dg__group-label">${h.escapar(g.label)}</span><span class="mim-dg__group-count">(${g.count.toLocaleString()})</span>`;
    if (rec.html !== html) {
      rec.html = html;
      rec.el.innerHTML = html;
    }
  }

  /** Celda de agregado: mismo pintado que una hoja, sobre un nodo sintetico. */
  function pintarAgregado(fila: RecFila, sec: HTMLElement, pos: ColPos, g: GrupoFila, indice: number): void {
    const data = { [pos.col.field]: g.agg[pos.col.colId] };
    const texto = (g as { aggTextos?: Record<string, string> }).aggTextos?.[pos.col.colId];
    pintarCelda(fila, sec, pos, pos.x, pos.ancho, { id: g.id, index: indice, data }, indice, g.agg[pos.col.colId], texto);
  }

  function pintarGrupo(fila: RecFila, g: GrupoFila, indice: number): void {
    const vivas = new Set<string>();
    if (int.columnaSeleccion()) vivas.add(SELECCION);
    const secciones: [ColPos[], HTMLElement][] = [[diseno.izq, fila.secs[0]!], [diseno.centro, fila.secs[1]!], [diseno.der, fila.secs[2]!]];
    let etiquetaPuesta = false;
    for (const [lista, sec] of secciones) {
      for (let i = 0; i < lista.length; i++) {
        const pos = lista[i]!;
        // Un agregado nunca cede su celda: la etiqueta va en la primera columna sin agregado.
        const tieneAgg = g.agg[pos.col.colId] != null;
        if (!etiquetaPuesta && !tieneAgg) {
          etiquetaPuesta = true;
          let ancho = pos.ancho;
          let k = i + 1;
          while (k < lista.length && g.agg[lista[k]!.col.colId] == null) {
            ancho += lista[k]!.ancho;
            k += 1;
          }
          vivas.add(pos.col.colId);
          celdaEtiquetaGrupo(fila, sec, pos, ancho, g);
          i = k - 1;
          continue;
        }
        if (!tieneAgg) continue;
        vivas.add(pos.col.colId);
        pintarAgregado(fila, sec, pos, g, indice);
      }
    }
    quitarCeldas(fila, vivas);
    fila.ventana = '';
    fila.el.setAttribute('aria-expanded', String(g.expanded));
    fila.el.setAttribute('aria-level', String(g.level + 1));
  }

  function pintarExtra(fila: RecFila, e: FilaExtra): void {
    if (fila.el.dataset['html'] === e.id) return;
    fila.limpiar?.();
    fila.el.dataset['html'] = e.id;
    fila.el.innerHTML = e.html ?? '';
    fila.limpiar = e.montar?.(fila.el) ?? null;
  }

  function vaciar(fila: RecFila): void {
    fila.limpiar?.();
    fila.limpiar = null;
    for (const c of fila.celdas.values()) c.limpiar?.();
    fila.celdas.clear();
    fila.secs = [];
    fila.el.textContent = '';
    delete fila.el.dataset['html'];
  }

  function nuevaFila(): RecFila {
    const el = document.createElement('div');
    el.setAttribute('role', 'row');
    return { el, tipo: '', clave: '', indice: -1, gen: 0, ventana: '', top: -1, celdas: new Map(), secs: [], limpiar: null, medido: false };
  }

  function prepararTipo(fila: RecFila, tipo: string): void {
    if (fila.tipo === tipo) return;
    vaciar(fila);
    fila.tipo = tipo;
    if (tipo !== 'leaf' && tipo !== 'group') return;
    fila.secs = [nuevaSeccion('mim-dg__sec mim-dg__sec--izq'), nuevaSeccion('mim-dg__sec mim-dg__sec--centro'), nuevaSeccion('mim-dg__sec mim-dg__sec--der')];
    fila.el.append(...fila.secs);
  }

  function clasesFila(f: FilaDisplay | null, indice: number): string {
    if (!f) return 'mim-dg__row mim-dg__row--carga';
    if (f.kind === 'group') return 'mim-dg__row mim-dg__group-row';
    if (f.kind !== 'leaf') return `mim-dg__row mim-dg__row--extra mim-dg__row--${h.escapar(f.kind)}`;
    const node = (f as { node: RowNode }).node;
    const seleccionada = int.seleccionados().has(node.id) ? ' iswc-selected' : '';
    const impar = indice % 2 ? ' iswc-odd' : '';
    const pres = int.presentarFila(node, indice);
    return `mim-dg__row${seleccionada}${impar}${pres?.clases ? ` ${pres.clases}` : ''}`;
  }

  function pintarAnchos(fila: RecFila): void {
    fila.secs[0]!.style.inlineSize = `${diseno.anchoIzq / 16}em`;
    fila.secs[1]!.style.inlineSize = `${diseno.anchoCentro / 16}em`;
    fila.secs[2]!.style.inlineSize = `${diseno.anchoDer / 16}em`;
  }

  function pintarFila(fila: RecFila, f: FilaDisplay | null, indice: number): void {
    const tipo = f ? (f.kind === 'leaf' || f.kind === 'group' ? f.kind : 'extra') : 'carga';
    prepararTipo(fila, tipo);
    fila.indice = indice;
    fila.el.dataset['rowId'] = f ? claveDe(f, indice) : '';
    fila.el.dataset['rowKind'] = f ? f.kind : 'carga';
    fila.el.dataset['rowIndex'] = String(indice);
    fila.el.setAttribute('aria-rowindex', String(indice + 2));
    const clase = clasesFila(f, indice);
    if (fila.el.className !== clase) fila.el.className = clase;
    if (!f) return;
    if (f.kind === 'group') {
      pintarAnchos(fila);
      pintarGrupo(fila, f as GrupoFila, indice);
      return;
    }
    if (f.kind !== 'leaf') {
      pintarExtra(fila, f as FilaExtra);
      return;
    }
    const node = (f as { node: RowNode }).node;
    fila.el.setAttribute('aria-selected', String(int.seleccionados().has(node.id)));
    pintarAnchos(fila);
    pintarCeldas(fila, node, indice);
    if (hayAutoAlto) fila.medido = false;
  }

  function colocar(fila: RecFila, indice: number): void {
    const top = alturas.arriba(indice);
    const alto = alturas.alto(indice);
    if (top !== fila.top) {
      fila.top = top;
      fila.el.style.transform = `translate3d(0,${top / (pxU * 16)}em,0)`;
    }
    fila.el.style.blockSize = `${alto / (pxU * 16)}em`;
  }

  function medirAutoAltos(): void {
    if (!hayAutoAlto) return;
    for (const fila of porIndice.values()) {
      if (fila.medido || fila.tipo !== 'leaf') continue;
      fila.medido = true;
      let max = 0;
      for (const c of fila.celdas.values()) max = Math.max(max, c.el.scrollHeight);
      if (max > altoBase) h.alturaFila(fila.clave, max / pxU);
    }
  }

  function zonaDe(f: FilaDisplay | null): HTMLElement {
    const pegar = (f as { pegar?: string } | null)?.pegar;
    if (pegar === 'arriba') return p.zonaArriba;
    if (pegar === 'abajo') return p.zonaAbajo;
    return p.cuerpo;
  }

  function renderizar(): void {
    pendiente = 0;
    if (!h.modelo()) return;
    const n0 = p.viewport.clientHeight;
    calcularDiseno();
    anchoCentroVisible = Math.max(0, p.viewport.clientWidth / pxU - diseno.anchoIzq - diseno.anchoDer);
    sincronizarAlturas();
    altoCabecera = p.cabecera.offsetHeight;
    altoPie = p.zonaAbajo.offsetHeight;
    const vista = Math.max(0, n0 - altoCabecera - altoPie);
    const anchoEm = `${diseno.anchoTotal / 16}em`;
    if (p.cuerpo.style.inlineSize !== anchoEm) {
      p.cuerpo.style.inlineSize = anchoEm;
      p.cabecera.style.inlineSize = anchoEm;
      p.zonaArriba.style.inlineSize = anchoEm;
      p.zonaAbajo.style.inlineSize = anchoEm;
    }
    const n = h.totalFilas();
    const margen = h.opcion<number>('rowBuffer', MARGEN_FILAS);
    const win = alturas.ventana(scrollTop, vista, margen);
    const buscadas = new Map<string, { f: FilaDisplay | null; i: number }>();
    const agregar = (i: number): void => {
      const f = h.filaEn(i);
      buscadas.set(claveDe(f, i), { f, i });
    };
    for (let i = win.inicio; i < win.fin; i++) agregar(i);
    for (let i = 0; i < n; i++) {
      if (!(h.filaEn(i) as { pegar?: string } | null)?.pegar) break;
      agregar(i);
    }
    for (let i = n - 1; i >= 0; i--) {
      if (!(h.filaEn(i) as { pegar?: string } | null)?.pegar) break;
      agregar(i);
    }
    for (const [clave, fila] of filas) {
      if (buscadas.has(clave)) continue;
      filas.delete(clave);
      fila.el.remove();
      libres.push(fila);
    }
    porIndice.clear();
    for (const [clave, { f, i }] of buscadas) {
      let fila = filas.get(clave);
      const reciclada = !fila;
      if (!fila) {
        fila = libres.pop() ?? nuevaFila();
        fila.clave = clave;
        fila.top = -1;
        filas.set(clave, fila);
      }
      const zona = zonaDe(f);
      if (fila.el.parentElement !== zona) zona.append(fila.el);
      const vista2 = reciclada || fila.gen !== gen || fila.indice !== i;
      if (vista2) {
        pintarFila(fila, f, i);
        fila.gen = gen;
      } else if (fila.tipo === 'leaf') {
        const c = colWindow(layoutCentro, scrollLeft / pxU, anchoCentroVisible);
        if (fila.ventana !== `${c.start}:${c.end}`) pintarCeldas(fila, (f as { node: RowNode }).node, i);
      }
      if (zona === p.cuerpo) colocar(fila, i);
      else fila.el.style.transform = '';
      porIndice.set(i, fila);
    }
    const asegurar = (h.opcion('__modeloExterno') as ((d: number, a: number) => void) | undefined);
    asegurar?.(win.inicio, win.fin);
    p.viewport.setAttribute('aria-rowcount', String(n + 1));
    p.viewport.setAttribute('aria-colcount', String(diseno.total));
    p.viewport.setAttribute('aria-busy', int.ocupado() ? 'true' : 'false');
    p.viewport.classList.toggle('iswc-scroll-x', scrollLeft > 0);
    medirAutoAltos();
    h.emitir('pintado', { inicio: win.inicio, fin: win.fin });
  }

  function pedir(): void {
    if (!pendiente) pendiente = requestAnimationFrame(renderizar);
  }

  /** Render sincrono: tests, API y cambios de estructura que deben verse ya. */
  function ahora(): void {
    if (pendiente) cancelAnimationFrame(pendiente);
    renderizar();
  }

  function alScroll(): void {
    const t = p.viewport.scrollTop;
    const l = p.viewport.scrollLeft;
    const vertical = t !== scrollTop;
    scrollTop = t;
    scrollLeft = l;
    pedir();
    h.emitir('bodyScroll', { top: t, left: l, direction: vertical ? 'vertical' : 'horizontal' });
    clearTimeout(temporizador);
    temporizador = window.setTimeout(() => h.emitir('bodyScrollEnd', { top: scrollTop, left: scrollLeft }), 120);
  }

  function animar(): void {
    if (h.opcion<boolean>('animateRows', true) === false) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    p.cuerpo.classList.add('iswc-animando');
    window.setTimeout(() => p.cuerpo.classList.remove('iswc-animando'), 420);
  }

  function refrescar(ids?: string[]): void {
    if (!ids) gen += 1;
    else for (const id of ids) {
      const fila = filas.get(id);
      if (fila) fila.gen = 0;
    }
    pedir();
  }

  function pintarSeleccion(): void {
    const sel = int.seleccionados();
    for (const fila of filas.values()) {
      if (fila.tipo !== 'leaf') continue;
      const si = sel.has(fila.clave);
      fila.el.classList.toggle('iswc-selected', si);
      fila.el.setAttribute('aria-selected', String(si));
      const cb = fila.celdas.get(SELECCION)?.el.firstElementChild;
      if (cb) cb.className = `mim-dg__checkbox mim-dg__checkbox--${si ? 'all' : 'none'}`;
    }
  }

  function posicionColumna(colId: string): { x: number; ancho: number; seccion: string } | null {
    const buscar = (l: ColPos[], seccion: string, base: number): { x: number; ancho: number; seccion: string } | null => {
      const c = l.find((c2) => c2.col.colId === colId);
      return c ? { x: base + c.x, ancho: c.ancho, seccion } : null;
    };
    return buscar(diseno.izq, 'izq', 0) ?? buscar(diseno.centro, 'centro', diseno.anchoIzq) ?? buscar(diseno.der, 'der', diseno.anchoIzq + diseno.anchoCentro);
  }

  function rectCelda(ref: RefCelda): Rect | null {
    const pos = posicionColumna(ref.colId);
    if (!pos || ref.indice < 0 || ref.indice >= h.totalFilas()) return null;
    return { arriba: alturas.arriba(ref.indice) / pxU, izquierda: pos.x, ancho: pos.ancho, alto: alturas.alto(ref.indice) / pxU };
  }

  function celdaDe(ref: RefCelda): HTMLElement | null {
    return porIndice.get(ref.indice)?.celdas.get(ref.colId)?.el ?? null;
  }

  function asegurarFila(indice: number): void {
    sincronizarAlturas();
    const vista = Math.max(0, p.viewport.clientHeight - p.cabecera.offsetHeight - p.zonaAbajo.offsetHeight);
    const arriba = alturas.arriba(indice);
    const abajo = arriba + alturas.alto(indice);
    if (arriba < scrollTop) p.viewport.scrollTop = arriba;
    else if (abajo > scrollTop + vista) p.viewport.scrollTop = abajo - vista;
    scrollTop = p.viewport.scrollTop;
  }

  function asegurarColumna(colId: string): void {
    const pos = posicionColumna(colId);
    if (!pos || pos.seccion !== 'centro') return;
    const izquierda = (pos.x - diseno.anchoIzq) * pxU;
    const derecha = izquierda + pos.ancho * pxU;
    const vista = p.viewport.clientWidth - (diseno.anchoIzq + diseno.anchoDer) * pxU;
    if (izquierda < scrollLeft) p.viewport.scrollLeft = izquierda;
    else if (derecha > scrollLeft + vista) p.viewport.scrollLeft = derecha - vista;
    scrollLeft = p.viewport.scrollLeft;
  }

  function asegurarVisible(ref: RefCelda): void {
    asegurarFila(ref.indice);
    asegurarColumna(ref.colId);
    ahora();
  }

  function enfocar(ref: RefCelda | null): void {
    if (foco) celdaDe(foco)?.classList.remove('iswc-focused');
    if (foco) {
      const r = porIndice.get(foco.indice)?.celdas.get(foco.colId);
      if (r) r.clase = r.clase.replace(' iswc-focused', '');
    }
    foco = ref;
    if (!ref) {
      p.viewport.removeAttribute('aria-activedescendant');
      return;
    }
    asegurarVisible(ref);
    const celda = celdaDe(ref);
    if (!celda) return;
    celda.classList.add('iswc-focused');
    const r = porIndice.get(ref.indice)?.celdas.get(ref.colId);
    if (r) r.clase = celda.className;
    celda.id = celda.id || `celda-${ref.indice}-${ref.colId}`;
    p.viewport.setAttribute('aria-activedescendant', celda.id);
  }

  function fijarAltura(id: string, unidades: number): void {
    const px = unidades * pxU;
    if (altosMedidos.get(id) === px) return;
    altosMedidos.set(id, px);
    altosRev += 1;
    pedir();
  }

  return {
    medir, pedir, ahora, alScroll, animar, refrescar, listaCambio, pintarSeleccion, rectCelda, celdaDe, asegurarVisible, asegurarFila, asegurarColumna, enfocar, fijarAltura,
    foco: () => foco,
    diseno: () => diseno,
    pxU: () => pxU,
    altoBase: () => altoBase,
    columnasOrdenadas: () => [...diseno.izq, ...diseno.centro, ...diseno.der],
    ventana: () => ({ inicio: alturas.indiceEn(scrollTop), fin: alturas.indiceEn(scrollTop + p.viewport.clientHeight) }),
    nodosPintados: () => [...filas.values()].map((f) => f.clave),
    resetAlturas: () => { altosMedidos.clear(); altosRev += 1; pedir(); },
  };
}
