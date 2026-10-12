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
export const ACEPTA_POR_TIPO: Record<TTipoColumna, readonly TTipoVector[]> = {
  clientes: ['cliente', 'nota'],
  componentes: ['componente', 'fin', 'inicio', 'nota'],
  flujo: ['paso', 'decision', 'variables', 'barra', 'nota', 'anidado', 'inicio', 'fin'],
  controllers: ['controller', 'puente', 'nota'],
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
    case 'bridge': return 'puente';
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

/** Títulos de los agrupadores automáticos (A10), en el orden del recorrido típico. */
export const GRUPOS_CRUD = { validacion: 'Validación', lectura: 'Lectura', escritura: 'Escritura', respuesta: 'Respuesta' } as const;
const VERBO_ESCRITURA = /\b(INSERT|UPDATE|UPSERT|DELETE|MERGE)\b/i;
const VERBO_LECTURA = /\bSELECT\b/i;
const TEXTO_VALIDA = /valid|verific|puerta|\bseg\b|jwt|permis|exige|estricto|autoriz|token|alcance|acceso/i;

/**
 * Grupo automático de cada paso del flujo, decidido por el verbo CRUD de lo que usa (A10):
 *   1 Escritura: usa un puente C/U/D o una arista de uso con INSERT, UPDATE, UPSERT, DELETE o MERGE.
 *   2 Lectura: usa un puente R o una arista SELECT.
 *   3 Respuesta: no usa nada y su salida va al fin (`end`).
 *   4 Validación: no usa nada y su texto habla de validar, la puerta SEG, el JWT o permisos.
 * Las decisiones, el inicio, el fin, las barras y los pasos con `group` propio no se agrupan.
 */
function gruposCrud(v: TVectorFlow): Map<string, string> {
  const nodo = new Map(v.columns.flatMap((c) => c.nodes.map((n) => [n.id, n] as const)));
  const forma = (id: string): string => String((nodo.get(id) as Record<string, unknown> | undefined)?.shape ?? '');
  const out = new Map<string, string>();
  for (const c of v.columns.filter((x) => x.tipo === 'flujo')) {
    for (const n of c.nodes) {
      const sh = forma(n.id);
      if (n.group || ['diamond', 'start', 'end', 'bar', 'comment'].includes(sh)) continue;
      const usos = v.edges.filter((e) => e.from === n.id && e.kind === 'dashed');
      const ops = usos.map((e) => String((nodo.get(e.to) as Record<string, unknown> | undefined)?.op ?? ''));
      const verbos = usos.map((e) => String(e.label ?? '')).join(' ');
      const texto = typeof n.label === 'string' ? n.label : '';
      if (ops.some((o) => /[CUD]/.test(o)) || VERBO_ESCRITURA.test(verbos)) out.set(n.id, GRUPOS_CRUD.escritura);
      else if (ops.includes('R') || VERBO_LECTURA.test(verbos)) out.set(n.id, GRUPOS_CRUD.lectura);
      else if (usos.length) continue;
      else if (v.edges.some((e) => e.from === n.id && e.kind !== 'dashed' && forma(e.to) === 'end')) out.set(n.id, GRUPOS_CRUD.respuesta);
      else if (TEXTO_VALIDA.test(texto)) out.set(n.id, GRUPOS_CRUD.validacion);
    }
  }
  return out;
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
  const auto = v.agrupar === false ? new Map<string, string>() : gruposCrud(v);
  const nodes = v.columns.flatMap((c) => c.nodes.map((n) => {
    const grupo = c.groups?.find((g) => g.id === n.group)?.label ?? auto.get(n.id);
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
  const { columns: _c, edges: _e, agrupar: _a, ...meta } = v;
  // Las columnas de entidades se apilan (aprovechan el alto); la del flujo sigue sus capas.
  return { ...meta, lanes: v.columns.map((c) => ({ id: c.id, label: c.label, ...(c.align ? { align: c.align } : {}), ...(c.tipo !== 'flujo' ? { stack: true } : {}) })), nodes, edges };
}
