/**
 * vector-flow-spec.ts — «diagrama de flujo en vector»: valida el vector de columnas (cada una
 * restringida a sus tipos de entidad) y lo compila al payload del flowchart. Nada se dibuja si una
 * columna recibe lo que no acepta: el error dice qué nodo, qué tipo y qué columna.
 *
 * Doc: vector-flow.md
 */
import { ZVectorFlow } from './vector-flow-spec.schemas.js';
import type { TColumnaVector, TNodoVector, TTipoColumna, TTipoVector, TVectorFlow } from './vector-flow-spec.schemas.js';

export type * from './vector-flow-spec.schemas.js';

/** Lo que acepta cada tipo de columna por defecto (una nota puede comentar cualquier entidad). */
/** Lo que acepta cada tipo de columna por defecto (una nota puede comentar cualquier entidad). */
export const ACEPTA_POR_TIPO: Record<TTipoColumna, readonly TTipoVector[]> = {
  clientes: ['cliente', 'nota'],
  componentes: ['componente', 'fin', 'inicio', 'nota'],
  flujo: ['paso', 'decision', 'variables', 'barra', 'nota', 'anidado', 'inicio', 'fin'],
  controllers: ['controller', 'nota'],
  modelos: ['pojo', 'nota'],
  tablas: ['tabla', 'nota'],
  custom: [],
};

const registro = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? v as Record<string, unknown> : {});

/** Tipo de entidad de un nodo del vector (por su `kind`, su clase y su forma). */
export function tipoVector(n: TNodoVector): TTipoVector {
  const kind = String(n.kind ?? '');
  if (kind === 'component') return 'componente';
  if (kind === 'tableder') return 'tabla';
  if (kind === 'nested') return 'anidado';
  if (kind === 'class') {
    const name = String(registro(n.class).name ?? n.label ?? '');
    return /Client$/.test(name) ? 'cliente' : /Controller$/.test(name) ? 'controller' : 'pojo';
  }
  switch (String(n.shape ?? '')) {
    case 'diamond': return 'decision';
    case 'vars': return 'variables';
    case 'bar': return 'barra';
    case 'start': return 'inicio';
    case 'end': return 'fin';
    case 'comment': return 'nota';
    default: return 'paso';
  }
}

/** Tipos que acepta una columna (los propios o los de su tipo). */
export const aceptaColumna = (c: TColumnaVector): readonly TTipoVector[] => c.accepts ?? ACEPTA_POR_TIPO[c.tipo];

/** Violaciones del vector (vacío si es válido). */
export function validarVector(v: TVectorFlow): string[] {
  const errores: string[] = [];
  const ids = new Map<string, string>();
  for (const c of v.columns) {
    const acepta = aceptaColumna(c);
    const grupos = new Set((c.groups ?? []).map((g) => g.id));
    for (const n of c.nodes) {
      if (ids.has(n.id)) errores.push(`el nodo «${n.id}» está en dos columnas («${ids.get(n.id)}» y «${c.label}»)`);
      ids.set(n.id, c.label);
      const t = tipoVector(n);
      if (!acepta.includes(t)) errores.push(`el nodo «${n.id}» (${t}) no cabe en la columna «${c.label}» (acepta: ${acepta.join(', ') || 'nada'})`);
      if (n.group && !grupos.has(n.group)) errores.push(`el nodo «${n.id}» pide el grupo «${n.group}», que la columna «${c.label}» no declara`);
    }
  }
  for (const e of v.edges) {
    for (const extremo of [e.from, e.to]) if (!ids.has(extremo)) errores.push(`la arista ${e.from} → ${e.to} cita «${extremo}», que no está en ninguna columna`);
  }
  return errores;
}

/**
 * Compila el vector al payload del flowchart: una columna = un carril (en orden), el grupo como
 * contexto del nodo y la arista `klass` de cada controller con su POJO (si ambos están). Lanza si el
 * vector no es válido.
 */
export function vectorAFlujo(entrada: unknown): Record<string, unknown> {
  const v = ZVectorFlow.parse(entrada);
  const errores = validarVector(v);
  if (errores.length) throw new Error(`Diagrama de flujo en vector inválido:\n- ${errores.join('\n- ')}`);
  const nodes = v.columns.flatMap((c) => c.nodes.map((n) => {
    const grupo = c.groups?.find((g) => g.id === n.group)?.label;
    const { group: _g, klass: _k, ...resto } = n;
    return { ...resto, lane: c.id, ...(grupo ? { context: grupo } : {}) };
  }));
  const presentes = new Set(nodes.map((n) => n.id));
  const edges = [...v.edges];
  for (const c of v.columns) {
    for (const n of c.nodes) {
      if (!n.klass || !presentes.has(n.klass)) continue;
      if (!edges.some((e) => e.from === n.id && e.to === n.klass)) edges.push({ from: n.id, to: n.klass, kind: 'dashed', label: 'klass' });
    }
  }
  const { columns: _c, edges: _e, ...meta } = v;
  return { ...meta, lanes: v.columns.map((c) => ({ id: c.id, label: c.label, ...(c.align ? { align: c.align } : {}) })), nodes, edges };
}
