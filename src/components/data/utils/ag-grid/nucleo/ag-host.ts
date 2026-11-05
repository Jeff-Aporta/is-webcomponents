/**
 * nucleo/host — Implementa `GridHost`: opciones, eventos, registros y ganchos.
 *
 * ag-grid.ts solo aporta la plantilla, atributos y persistencia. Aqui se cablea
 * el motor, la cabecera, los menus y la API de nombres AG, y se instalan los
 * plugins. Un error en un oyente o plugin no tumba la grilla.
 */

import type { PiezasNucleo, PuertosNucleo } from './ag-host.schemas.js';
import { escapeHtml } from '@jeff-aporta/iswc-base/core/dom-utils.js';
import { cellText, getCellValue } from '@jeff-aporta/iswc-base/components/data/utils/datagrid-core/value-formatter.js';
import { headerCheckboxState, selectAll, clearSelection } from '@jeff-aporta/iswc-base/components/data/utils/datagrid-core/selection.js';
import { crearApiAg } from './api-ag.js';
import { registrarBase } from './base-celdas.js';
import { crearCabecera } from './cabecera.js';
import { crearInteraccion } from './interaccion.js';
import { crearExtras } from './extras.js';
import { crearMenus } from './menus.js';
import { crearMotor } from './motor.js';
import { aKebab } from './opciones.js';
import type { ContextoCelda, Decoracion, Desinstalar, EvaluadorFiltro, Exportador, FilaDisplay, Flotante, GridPlugin, ModeloFilas, PanelEstado, PanelLateral, PresentacionCelda, PresentacionFila, ProveedorMenu, RendererCelda, RendererMontable, TransformadorFilas } from '@jeff-aporta/iswc-base/components/data/utils/ag-grid/contrato.schemas.js';
import type { ColumnState, GridState, RowNode } from '@jeff-aporta/iswc-base/components/data/schemas/datagrid-types.schemas.js';
import type { Manejadores } from './interaccion.schemas.js';
import type { GridHost } from './tipos.schemas.js';


const INTERNOS = new Set(['pintado']);
const ETAPAS = ['filtrar', 'ordenar', 'agrupar', 'aplanar'];

export function crearNucleo(el: HTMLElement, shadow: ShadowRoot, piezas: PiezasNucleo, puertos: PuertosNucleo) {
  const opciones = new Map<string, unknown>();
  const oyentesOpcion = new Map<string, Set<(v: unknown) => void>>();
  const oyentes = new Map<string, Set<(d: Record<string, unknown>) => void>>();
  const renderers = new Map<string, RendererCelda | RendererMontable>();
  const editores = new Map<string, unknown>();
  const filtros = new Map<string, EvaluadorFiltro>();
  const transformadores: TransformadorFilas[] = [];
  const modelos = new Map<string, (g: GridHost) => ModeloFilas>();
  const proveedores: ProveedorMenu[] = [];
  const paneles: PanelLateral[] = [];
  const estados: PanelEstado[] = [];
  const exportadores = new Map<string, Exportador>();
  const fuentes: ((c: ColumnState, n: RowNode) => { valor: unknown } | undefined)[] = [];
  const decoradores: ((c: ContextoCelda) => Decoracion | void)[] = [];
  const manejadores: Manejadores = { teclado: [], abajo: [], clic: [], dobleClic: [] };
  const expuestos: Record<string, (...a: never[]) => unknown> = {};
  let externo: ModeloFilas | null = null;
  let leerValor: ((col: ColumnState, node: RowNode) => unknown) = getCellValue;
  let leerTexto: ((col: ColumnState, node: RowNode) => string) = cellText;

  const quitar = <T>(lista: T[], item: T): Desinstalar => () => {
    const i = lista.indexOf(item);
    if (i >= 0) lista.splice(i, 1);
  };

  const estado = (): GridState | null => puertos.modelo()?.getState() ?? null;

  function listaActual(): FilaDisplay[] {
    const e = estado();
    if (!e) return [];
    return (e.pagination ? e.pageDisplayRows : e.displayRows) as FilaDisplay[];
  }

  function emitir(evento: string, detalle: Record<string, unknown> = {}): void {
    const d: Record<string, unknown> = { type: evento, api: (el as unknown as { api: unknown }).api, ...detalle };
    const lista = oyentes.get(evento);
    if (lista) for (const fn of [...lista]) {
      try { fn(d); } catch (e) { console.error(`[iswc-ag-grid] oyente ${evento}`, e); }
    }
    if (INTERNOS.has(evento)) return;
    for (const fn of oyentes.get('*') ?? []) fn(d);
    const propio = opciones.get(`on${evento[0]?.toUpperCase()}${evento.slice(1)}`);
    if (typeof propio === 'function') propio(d);
    el.dispatchEvent(new CustomEvent(`iswc-${aKebab(evento)}`, { bubbles: true, composed: true, detail: d }));
  }

  function resolver(ctx: ContextoCelda): RendererMontable {
    const { def } = ctx;
    const nombre = def['cellRenderer'] ?? def['renderer'] ?? def['type'] ?? ctx.col.type;
    if (typeof nombre === 'function') {
      const fn = nombre as (p: Record<string, unknown>) => unknown;
      return { html: (c) => {
        const r = fn({ ...c.params, value: c.value, valueFormatted: h.textoCelda(c.col, c.node as RowNode), data: c.data, node: c.node, colDef: c.def, column: c.col, api: (el as unknown as { api: unknown }).api, rowIndex: c.rowIndex });
        return r instanceof HTMLElement ? r.outerHTML : String(r ?? '');
      } };
    }
    const r = renderers.get(String(nombre));
    if (!r) return { html: (c) => escapeHtml(c.texto || (c.node ? h.textoCelda(c.col, c.node) : '')) };
    return typeof r === 'function' ? { html: r } : r;
  }

  const h: GridHost = {
    el, shadow,
    opcion: <T,>(n: string, d?: T) => (opciones.has(n) && opciones.get(n) !== undefined ? opciones.get(n) as T : d as T),
    fijarOpcion: (n, v) => {
      opciones.set(n, v);
      for (const fn of oyentesOpcion.get(n) ?? []) fn(v);
    },
    alCambiarOpcion: (n, fn) => {
      const s = oyentesOpcion.get(n) ?? new Set();
      oyentesOpcion.set(n, s);
      s.add(fn);
      return () => s.delete(fn);
    },
    modelo: puertos.modelo,
    estado,
    columnas: () => puertos.modelo()?.getColumns() ?? [],
    columna: (id) => puertos.modelo()?.getColumns().find((c) => c.colId === id) ?? null,
    defDe: (col) => col.def as ReturnType<GridHost['defDe']>,
    valor: (col, node) => {
      for (const f of fuentes) {
        const r = f(col, node);
        if (r) return r.valor;
      }
      return leerValor(col, node);
    },
    texto: (clave, porDefecto) => {
      const propio = opciones.get('getLocaleText') as ((p: { key: string; defaultValue: string }) => string) | undefined;
      if (propio) return propio({ key: clave, defaultValue: porDefecto });
      return (opciones.get('localeText') as Record<string, string> | undefined)?.[clave] ?? porDefecto;
    },
    textoCelda: (col, node) => {
      for (const f of fuentes) {
        const r = f(col, node);
        if (r) return leerTexto(col, { ...node, data: { ...node.data, [col.field]: r.valor } });
      }
      return leerTexto(col, node);
    },
    filaEn: (i) => (externo ? externo.filaEn(i) : listaActual()[i] ?? null),
    totalFilas: () => (externo ? externo.total() : listaActual().length),
    nodo: (id) => puertos.modelo()?.getRowNode(id) as RowNode | null ?? null,
    fijarValor: (node, colId, valor, origen = 'edit') => {
      const col = h.columna(colId);
      if (!col) return false;
      const def = h.defDe(col);
      const anterior = h.valor(col, node);
      const iguales = typeof def['equals'] === 'function' ? (def['equals'] as (a: unknown, b: unknown) => boolean)(anterior, valor) : anterior === valor;
      if (iguales) return false;
      const setter = def['valueSetter'];
      const data = { ...node.data };
      if (typeof setter === 'function') {
        if (!(setter as (p: Record<string, unknown>) => boolean)({ oldValue: anterior, newValue: valor, data, node, colDef: def, column: col })) return false;
      } else data[col.field] = valor;
      if (puertos.modelo()?.getRowNode(node.id)) puertos.modelo()?.applyTransaction({ nodos: [{ node, data }] });
      else {
        // Filas fijadas: no estan en el modelo, viven en su propio nodo.
        node.data = data;
        motor.refrescar();
      }
      const detalle = { oldValue: anterior, newValue: valor, source: origen, node, data, column: col, colDef: def, rowIndex: null };
      if (typeof def['onCellValueChanged'] === 'function') (def['onCellValueChanged'] as (d: unknown) => void)(detalle);
      emitir('cellValueChanged', detalle);
      el.dispatchEvent(new CustomEvent('iswc-cell-edit', { bubbles: true, composed: true, detail: { row: data, column: col, oldValue: anterior, newValue: valor } }));
      return true;
    },
    emitir,
    on: (ev, fn) => {
      const s = oyentes.get(ev) ?? new Set();
      oyentes.set(ev, s);
      s.add(fn);
      return () => s.delete(fn);
    },
    exponer: (metodos) => {
      Object.assign(expuestos, metodos);
      // Los paneles registrados antes de que el plugin de filtros se instalara.
      if ('registrarPanelLateral' in metodos) for (const p of paneles) (metodos['registrarPanelLateral'] as unknown as (x: PanelLateral) => void)(p);
      if ('registrarPanelEstado' in metodos) for (const p of estados) (metodos['registrarPanelEstado'] as unknown as (x: PanelEstado) => void)(p);
    },
    renderer: (n, r) => { renderers.set(n, r); },
    fuenteValor: (fn) => {
      fuentes.push(fn);
      return quitar(fuentes, fn);
    },
    decorarCelda: (fn) => {
      decoradores.push(fn);
      return quitar(decoradores, fn);
    },
    editor: (n, c) => { editores.set(n, c); },
    filtro: (e) => {
      filtros.set(e.tipo, e);
      sincronizarFiltros();
    },
    transformador: (t) => {
      transformadores.push(t);
      sincronizarTransformadores();
      return () => {
        quitar(transformadores, t)();
        sincronizarTransformadores();
      };
    },
    modeloFilas: (tipo, crear) => { modelos.set(tipo, crear); },
    menu: (p) => {
      proveedores.push(p);
      return quitar(proveedores, p);
    },
    panel: (p) => {
      paneles.push(p);
      (expuestos['registrarPanelLateral'] as unknown as ((x: PanelLateral) => void) | undefined)?.(p);
    },
    panelEstado: (p) => {
      estados.push(p);
      (expuestos['registrarPanelEstado'] as unknown as ((x: PanelEstado) => void) | undefined)?.(p);
    },
    exportador: (e) => { exportadores.set(e.formato, e); },
    teclado: (fn) => {
      manejadores.teclado.push(fn);
      return quitar(manejadores.teclado, fn);
    },
    celdaAbajo: (fn) => {
      manejadores.abajo.push(fn);
      return quitar(manejadores.abajo, fn);
    },
    celdaClic: (fn) => {
      manejadores.clic.push(fn);
      return quitar(manejadores.clic, fn);
    },
    celdaDobleClic: (fn) => {
      manejadores.dobleClic.push(fn);
      return quitar(manejadores.dobleClic, fn);
    },
    foco: () => motor.foco(),
    enfocar: (ref) => {
      motor.enfocar(ref);
      emitir('cellFocused', { rowIndex: ref?.indice ?? null, column: ref ? h.columna(ref.colId) : null });
    },
    enfocarSinScroll: (ref) => motor.enfocar(ref),
    em: (u) => `${u / 16}em`,
    escapar: (s) => escapeHtml(s == null ? '' : String(s)),
    capa: (n) => piezas.capas[n],
    zona: (n) => piezas.zonas[n],
    flotante: (rol = 'dialog') => {
      const f = document.createElement('div');
      f.className = 'iswc-ag-flotante';
      f.setAttribute('role', rol);
      f.setAttribute('popover', 'auto');
      shadow.append(f);
      const flotante: Flotante = {
        el: f,
        abrir: (ancla) => {
          f.showPopover();
          const fs = parseFloat(getComputedStyle(f).fontSize) || 16;
          const base = piezas.cuerpo.getBoundingClientRect();
          const u = motor.pxU();
          const r = ancla instanceof Element ? ancla.getBoundingClientRect() : { left: base.left + ancla.izquierda * u, bottom: base.top + (ancla.arriba + ancla.alto) * u };
          const caja = f.getBoundingClientRect();
          const x = Math.max(8, Math.min(r.left, innerWidth - caja.width - 8));
          const y = r.bottom + caja.height > innerHeight ? Math.max(8, innerHeight - caja.height - 8) : r.bottom;
          f.style.insetInlineStart = `${x / fs}em`;
          f.style.insetBlockStart = `${y / fs}em`;
        },
        cerrar: () => { if (f.matches(':popover-open')) f.hidePopover(); },
      };
      return flotante;
    },
    rectCelda: (ref) => motor.rectCelda(ref),
    celdaDe: (ref) => motor.celdaDe(ref),
    asegurarVisible: (ref) => motor.asegurarVisible(ref),
    pedirRender: () => {
      motor.pedir();
      cabecera.pintar();
    },
    recomputar: (dep) => {
      const m = puertos.modelo();
      if (!m) return;
      const etapas = transformadores.filter((t) => dep != null && t.depende.includes(dep)).map((t) => ETAPAS.indexOf(t.etapa));
      const primera = etapas.length ? Math.min(...etapas) : 0;
      m.invalidate((['filtrar', 'ordenar', 'agrupar', 'agrupar'] as const)[primera] ?? 'filtrar');
    },
    refrescarCeldas: (ids) => motor.refrescar(ids),
    alturaFila: (id, u) => motor.fijarAltura(id, u),
  };

  function sincronizarFiltros(): void {
    const mapa = new Map<string, (f: unknown, v: unknown, t: string, n: RowNode, c: ColumnState) => boolean>();
    for (const [tipo, e] of filtros) mapa.set(tipo, e.coincide as (f: unknown, v: unknown, t: string, n: RowNode, c: ColumnState) => boolean);
    puertos.modelo()?.setFilterEvaluators(mapa);
  }

  function sincronizarTransformadores(): void {
    puertos.modelo()?.setTransforms(transformadores.map((t) => ({ etapa: t.etapa, aplicar: (f: unknown[]) => t.aplicar(f, h), activo: t.activo })));
  }

  const int = {
    resolver,
    presentarCelda: (ctx: ContextoCelda) => (expuestos['presentarCelda'] as unknown as ((c: ContextoCelda) => PresentacionCelda) | undefined)?.(ctx) ?? null,
    presentarFila: (n: RowNode, i: number) => (expuestos['presentarFila'] as unknown as ((n: RowNode, i: number) => PresentacionFila) | undefined)?.(n, i) ?? null,
    decorar: (ctx: ContextoCelda) => decoradores.map((d) => d(ctx)).filter((d): d is Decoracion => d != null),
    columnaSeleccion: () => {
      const objeto = opciones.get('rowSelection');
      if (objeto && typeof objeto === 'object' && (objeto as { checkboxes?: boolean }).checkboxes === false) return false;
      return puertos.modoSeleccion() !== 'none';
    },
    multiple: () => puertos.modoSeleccion() === 'multiple',
    seleccionados: () => estado()?.selection ?? new Set<string>(),
    expuesto: (n: string) => expuestos[n],
    ocupado: () => el.hasAttribute('loading') || opciones.get('loading') === true,
  };

  const motor = crearMotor(h, { viewport: piezas.viewport, cuerpo: piezas.cuerpo, zonaArriba: piezas.zonaArriba, zonaAbajo: piezas.zonaAbajo, cabecera: piezas.cabecera, sondaFila: piezas.sondaFila }, int);
  const menus = crearMenus(h, proveedores);

  function ordenar(colId: string, ev: MouseEvent): void {
    const propio = expuestos['ordenarPorClic'] as unknown as ((c: string, e: MouseEvent) => void) | undefined;
    if (propio) {
      propio(colId, ev);
    } else {
      const m = puertos.modelo();
      m?.toggleSort(colId, ev.ctrlKey || ev.metaKey || ev.shiftKey);
    }
    const dir = estado()?.sortModel.find((s) => s.colId === colId)?.dir ?? null;
    el.dispatchEvent(new CustomEvent('iswc-sort-change', { bubbles: true, composed: true, detail: { column: colId, direction: dir } }));
  }

  function abrirFiltro(colId: string, ancla: HTMLElement): void {
    const fn = expuestos['showColumnFilter'] as unknown as ((c: string, a: HTMLElement) => void) | undefined;
    fn?.(colId, ancla);
  }

  function alternarTodo(): void {
    const e = estado();
    const m = puertos.modelo();
    if (!e || !m) return;
    const hojas = e.pagination ? e.pageRows : e.displayedRows;
    const todas = headerCheckboxState(e.selection, hojas) === 'all';
    m.setSelection(todas ? clearSelection() : selectAll(hojas));
    const rows = (el as unknown as { api: { getSelectedRows: () => unknown[] } }).api.getSelectedRows();
    el.dispatchEvent(new CustomEvent('iswc-row-select', { bubbles: true, composed: true, detail: { rows } }));
    emitir('selectionChanged', { rows, source: 'uiSelectAll' });
  }

  const cabecera = crearCabecera(h, motor, { grupos: piezas.grupos, fila: piezas.filaCabecera }, {
    ordenar,
    abrirMenu: (col, boton) => menus.abrirColumna({ tipo: 'columna', col, node: null }, boton),
    abrirFiltro: (col, boton) => abrirFiltro(col.colId, boton),
    alternarTodo,
    estadoTodo: () => {
      const e = estado();
      return e ? headerCheckboxState(e.selection, e.pagination ? e.pageRows : e.displayedRows) : 'none';
    },
    columnaSeleccion: int.columnaSeleccion,
    multiple: int.multiple,
  });

  crearInteraccion(h, motor, menus, piezas.viewport, manejadores, {
    modo: puertos.modoSeleccion,
    seleccionPropia: () => typeof opciones.get('rowSelection') === 'object' && opciones.get('rowSelection') != null,
    ordenar,
    abrirFiltro,
  });

  const apiAg = crearApiAg(h, motor, () => motor.refrescar());
  registrarBase(h);
  h.on('themeChanged', () => {
    motor.medir();
    motor.ahora();
    cabecera.pintar();
  });

  /** Propaga el estado del modelo a la vista. */
  function alModelo(_e: GridState, razon = 'all'): void {
    if (razon === 'selection') {
      motor.pintarSeleccion();
      cabecera.pintar();
      return;
    }
    if (razon === 'transaction') {
      motor.listaCambio();
      motor.pedir();
      emitir('modelUpdated', { razon });
      return;
    }
    motor.listaCambio();
    motor.ahora();
    cabecera.pintar();
    if (razon === 'sort' || razon === 'filter') motor.animar();
    if (razon === 'sort') emitir('sortChanged', {});
    if (razon === 'filter') emitir('filterChanged', {});
    if (razon === 'page') emitir('paginationChanged', {});
    emitir('modelUpdated', { razon });
  }

  function instalar(plugins: GridPlugin[]): Desinstalar[] {
    const limpiezas: Desinstalar[] = [];
    for (const p of [{ nombre: 'extras', instalar: crearExtras(motor, menus) }, ...plugins]) {
      try {
        const fin = p.instalar(h);
        if (fin) limpiezas.push(fin);
      } catch (e) {
        console.error(`[iswc-ag-grid] plugin ${p.nombre}`, e);
      }
    }
    return limpiezas;
  }

  /** Tras crear el modelo: reinyecta registros y arranca el modelo de filas externo. */
  function alCrearModelo(): void {
    sincronizarFiltros();
    if (transformadores.length) sincronizarTransformadores();
    const tipo = String(opciones.get('rowModelType') ?? 'clientSide');
    const crear = modelos.get(tipo);
    externo?.destruir?.();
    externo = crear ? crear(h) : null;
    if (externo) {
      const m = externo;
      opciones.set('__modeloExterno', (d: number, a: number) => m.asegurar(d, a));
    }
  }

  function fijarLectores(valor: typeof leerValor, texto: typeof leerTexto): void {
    leerValor = valor;
    leerTexto = texto;
  }

  return { h, motor, cabecera, menus, apiAg, expuestos, paneles, estados, exportadores, editores, opciones, alModelo, alCrearModelo, instalar, fijarLectores, emitir, ordenar };
}

