/**
 * set — Set filter: universo de valores, llaves, mini filtro, Select All, arbol y modelo.
 * La llave nula representa las celdas vacias, igual que `null` en `values`.
 */
import type { ItemSet, MarcaTodo, ModeloSet, NodoArbolSet, ParamsFiltro } from './filtros.schemas.js';

/** Llave de un valor: keyCreator o el valor; lo vacio es null. */
export function claveDe(valor: unknown, params: ParamsFiltro = {}): string | null {
  const crear = params['keyCreator'] as ((p: Record<string, unknown>) => unknown) | undefined;
  const k = crear ? crear({ value: valor }) : valor;
  if (k == null || k === '') return null;
  return k instanceof Date ? k.toISOString().slice(0, 10) : String(k);
}

function plegar(k: string | null, params: ParamsFiltro): string | null {
  if (k === null || params['caseSensitive'] === true) return k;
  return k.toLowerCase();
}

function etiquetaDe(valor: unknown, clave: string | null, params: ParamsFiltro, vacios: string): string {
  if (clave === null) return vacios;
  const formato = params['valueFormatter'] as ((p: Record<string, unknown>) => string) | undefined;
  return formato ? String(formato({ value: valor })) : clave;
}

function compararItems(a: ItemSet, b: ItemSet, params: ParamsFiltro): number {
  if (a.clave === null) return b.clave === null ? 0 : -1;
  if (b.clave === null) return 1;
  const propio = params['comparator'] as ((x: unknown, y: unknown) => number) | undefined;
  if (propio) return propio(a.valor, b.valor);
  if (typeof a.valor === 'number' && typeof b.valor === 'number') return a.valor - b.valor;
  return a.clave.localeCompare(b.clave, undefined, { numeric: true, sensitivity: 'base' });
}

/** Lista de valores unicos; las celdas con arreglo aportan cada elemento. Sin mayusculas por defecto. */
export function itemsSet(valores: Iterable<unknown>, params: ParamsFiltro = {}, vacios = '(Vacíos)'): ItemSet[] {
  const vistos = new Map<string | null, ItemSet>();
  for (const crudo of valores) {
    for (const v of Array.isArray(crudo) ? crudo : [crudo]) {
      const clave = claveDe(v, params);
      const plegada = plegar(clave, params);
      if (!vistos.has(plegada)) vistos.set(plegada, { clave, etiqueta: etiquetaDe(v, clave, params, vacios), valor: v });
    }
  }
  const items = [...vistos.values()];
  if (params['suppressSorting'] === true) return items;
  return items.sort((a, b) => compararItems(a, b, params));
}

/** Filtra por el mini filtro; textFormatter y caseSensitive igual que el text filter. */
export function filtrarMini(items: ItemSet[], texto: string, params: ParamsFiltro = {}): ItemSet[] {
  if (!texto) return items;
  const propio = params['textFormatter'] as ((v: string) => string) | undefined;
  const formato = propio ?? ((v: string): string => params['caseSensitive'] === true ? v : v.toLowerCase());
  const aguja = formato(texto);
  return items.filter((i) => formato(i.etiqueta).includes(aguja));
}

/** Estado del Select All frente a la lista visible. */
export function marcaDeTodo(visibles: ItemSet[], seleccion: Set<string | null>): MarcaTodo {
  const marcados = visibles.filter((i) => seleccion.has(i.clave)).length;
  if (!visibles.length || marcados === 0) return 'none';
  return marcados === visibles.length ? 'all' : 'some';
}

/** Modelo a partir de la seleccion: todo el universo marcado es "sin filtro". */
export function modeloSet(seleccion: Set<string | null>, universo: ItemSet[]): ModeloSet | null {
  if (universo.every((i) => seleccion.has(i.clave))) return null;
  return { filterType: 'set', values: universo.filter((i) => seleccion.has(i.clave)).map((i) => i.clave) };
}

/** Seleccion inicial: la del modelo o todo el universo (nada con defaultToNothingSelected). */
export function seleccionDe(modelo: ModeloSet | null | undefined, universo: ItemSet[], params: ParamsFiltro = {}): Set<string | null> {
  if (modelo) return new Set(modelo.values);
  if (params['defaultToNothingSelected'] === true) return new Set();
  return new Set(universo.map((i) => i.clave));
}

/** La fila pasa si su valor (o alguno, si la celda es arreglo) esta en `values`. */
export function coincideSet(modelo: ModeloSet, valor: unknown, params: ParamsFiltro = {}): boolean {
  const permitidos = new Set(modelo.values.map((k) => plegar(k, params)));
  const valores = Array.isArray(valor) ? valor : [valor];
  if (!valores.length) return permitidos.has(null);
  return valores.some((v) => permitidos.has(plegar(claveDe(v, params), params)));
}

/** Ruta por defecto del arbol: fecha → anio/mes/dia; lo demas, un nivel. */
export function rutaDefecto(item: ItemSet): string[] {
  const v = item.valor;
  const d = v instanceof Date ? v : null;
  if (!d) return [item.etiqueta];
  return [String(d.getFullYear()), String(d.getMonth() + 1).padStart(2, '0'), String(d.getDate()).padStart(2, '0')];
}

/** Arbol para treeList; un nodo hoja lleva su item. */
export function arbolSet(items: ItemSet[], params: ParamsFiltro = {}): NodoArbolSet[] {
  const rutaPropia = params['treeListPathGetter'] as ((v: unknown) => string[] | null) | undefined;
  const raiz: NodoArbolSet = { id: '', etiqueta: '', nivel: -1, hijos: [], item: null };
  for (const item of items) {
    const ruta = (rutaPropia ? rutaPropia(item.valor) : null) ?? rutaDefecto(item);
    let actual = raiz;
    ruta.forEach((parte, i) => {
      const id = `${actual.id}/${parte}`;
      let hijo = actual.hijos.find((n) => n.id === id);
      if (!hijo) {
        hijo = { id, etiqueta: parte, nivel: i, hijos: [], item: null };
        actual.hijos.push(hijo);
      }
      if (i === ruta.length - 1) hijo.item = item;
      actual = hijo;
    });
  }
  return raiz.hijos;
}

/** Todas las hojas bajo un nodo. */
export function hojasDe(nodo: NodoArbolSet): ItemSet[] {
  const propias = nodo.item ? [nodo.item] : [];
  return [...propias, ...nodo.hijos.flatMap(hojasDe)];
}
