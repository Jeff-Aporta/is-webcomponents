/**
 * diagram-vocab.ts — Vocabulario común de diagramas: estructuras de nodo,
 * tipos de arista y política de aceptación.
 *
 * Idea: todo diagrama del kit es un dibujo libre sobre el mismo vocabulario.
 * Cada tipo de arista dice dónde se recomienda (componentes → conectores
 * -(O-, DER → relacionales con cardinalidad, secuencia → señales), pero
 * ninguna recomendación es una imposición: un diagrama puede mezclar nodos
 * y aristas de cualquier familia. Lo que sí puede hacer un diagrama es
 * **restringir** con una política (`policy` en el payload): cerrar la lista
 * de estructuras o aristas que acepta, y lo demás se rechaza con motivo.
 *
 *   import { applyDiagramPolicy, getEdgeKind } from './diagram-vocab.js';
 *   const r = applyDiagramPolicy({ allowFamilies: ['signal'] }, edges, (e) => e.kind);
 *   // r.rejected → [{ id, kind, reason }]
 *
 * Los motores siguen con sus tipos propios; este módulo es el catálogo y
 * el árbitro, no un renderizador.
 */
import {
  DiagramPolicySchema,
  EdgeKindDefSchema,
  EdgeStyleSchema,
  NodeStructureDefSchema,
} from './diagram-vocab.schemas.js';
import type {
  DiagramKindId,
  DiagramPolicy,
  EdgeFamily,
  EdgeKindDef,
  EdgeKindDefInput,
  EdgeStyle,
  NodeStructureDef,
  NodeStructureDefInput,
  PolicyReport,
  VocabStore,
} from './diagram-vocab.schemas.js';

export type { DiagramKindId, DiagramPolicy, EdgeFamily, EdgeKindDef, EdgeStyle, NodeStructureDef, PolicyReport };

// Un registro por página: cada bundle trae su copia del módulo.
const GLOBAL_KEY = '__iswcDiagramVocab';
const raiz = globalThis as typeof globalThis & { [GLOBAL_KEY]?: VocabStore };
const STORE: VocabStore = raiz[GLOBAL_KEY] ??= { edges: new Map(), nodes: new Map() };

const clave = (s: string): string => String(s ?? '').trim().toLowerCase();

/** Registra (o reemplaza) un tipo de arista. Valida con Zod. */
export function registerEdgeKind(def: EdgeKindDef): EdgeKindDef {
  const d = EdgeKindDefSchema.parse(def);
  STORE.edges.set(clave(d.id), d);
  return d;
}

/** Registra (o reemplaza) una estructura de nodo. Valida con Zod. */
export function registerNodeStructure(def: NodeStructureDef): NodeStructureDef {
  const d = NodeStructureDefSchema.parse(def);
  STORE.nodes.set(clave(d.id), d);
  return d;
}

export function getEdgeKind(id: string | null | undefined): EdgeKindDef | undefined {
  return STORE.edges.get(clave(id ?? ''));
}
export function getNodeStructure(id: string | null | undefined): NodeStructureDef | undefined {
  return STORE.nodes.get(clave(id ?? ''));
}
export function listEdgeKinds(family?: EdgeFamily): EdgeKindDef[] {
  const all = [...STORE.edges.values()];
  return family ? all.filter((e) => e.family === family) : all;
}
export function listNodeStructures(): NodeStructureDef[] {
  return [...STORE.nodes.values()];
}

/**
 * `recommended` si el vocabulario sugiere ese ítem para el diagrama,
 * `allowed` si no lo sugiere pero nada lo impide, `unknown` si no está
 * registrado (se dibuja igual: el vocabulario describe, no cierra).
 */
export function recommendationFor(kind: string, diagram: DiagramKindId, what: 'edge' | 'node' = 'edge'): 'recommended' | 'allowed' | 'unknown' {
  const def = what === 'edge' ? getEdgeKind(kind) : getNodeStructure(kind);
  if (!def) return 'unknown';
  return def.recommendedFor.includes(diagram) ? 'recommended' : 'allowed';
}

/** Objeto anidado del diagrama (`sequence`, `componentDiagram`, …), si lo hay. */
function nestedDiagram(o: Record<string, unknown>): Record<string, unknown> | undefined {
  return Object.values(o).find((v) => v && typeof v === 'object' && !Array.isArray(v)) as Record<string, unknown> | undefined;
}

/** Lee `policy` de un payload (o del objeto anidado del diagrama). */
export function readDiagramPolicy(payload: unknown): DiagramPolicy | null {
  if (!payload || typeof payload !== 'object') return null;
  const o = payload as Record<string, unknown>;
  const raw = o.policy ?? nestedDiagram(o)?.policy;
  if (!raw || typeof raw !== 'object') return null;
  const r = DiagramPolicySchema.safeParse(raw);
  return r.success ? r.data : null;
}

/**
 * Aplica una política a una lista de ítems. `kindOf` dice el tipo de cada
 * ítem (`e.kind`, `n.structure`…). Devuelve ids aceptados y rechazados con
 * motivo; el motor pinta los aceptados y avisa de los demás.
 */
export function applyDiagramPolicy<T extends { id: string }>(
  policy: DiagramPolicy | null | undefined,
  items: readonly T[],
  kindOf: (item: T) => string,
  what: 'edge' | 'node' = 'edge',
): PolicyReport {
  const report: PolicyReport = { acceptedIds: [], rejected: [] };
  if (!policy) {
    report.acceptedIds = items.map((i) => i.id);
    return report;
  }
  const allow = (what === 'edge' ? policy.allowEdges : policy.allowNodes)?.map(clave);
  const deny = (what === 'edge' ? policy.denyEdges : policy.denyNodes)?.map(clave) ?? [];
  const allowFam = policy.allowFamilies;
  const denyFam = policy.denyFamilies ?? [];
  const listName = what === 'edge' ? 'Edges' : 'Nodes';
  for (const it of items) {
    const k = clave(kindOf(it));
    const fam = what === 'edge' ? getEdgeKind(k)?.family : undefined;
    let reason: string | null = null;
    if (allow && !allow.includes(k)) reason = `"${k}" no está en allow${listName}`;
    else if (deny.includes(k)) reason = `"${k}" está en deny${listName}`;
    else if (what === 'edge' && allowFam && (!fam || !allowFam.includes(fam))) reason = `familia "${fam ?? '?'}" no está en allowFamilies`;
    else if (what === 'edge' && fam && denyFam.includes(fam)) reason = `familia "${fam}" está en denyFamilies`;
    if (reason) report.rejected.push({ id: it.id, kind: k, reason });
    else report.acceptedIds.push(it.id);
  }
  return report;
}

/**
 * Estilo de arista efectivo: `layout.edgeStyle`, `edgeStyle` o
 * `policy.edgeStyle` del payload, con `orthogonal` por defecto. El router no
 * cambia; `curved` solo redondea los giros al pintar (`_shared/diagram-curve`).
 */
export function readEdgeStyle(payload: unknown, fallback: EdgeStyle = 'orthogonal'): EdgeStyle {
  if (!payload || typeof payload !== 'object') return fallback;
  const o = payload as Record<string, unknown>;
  const nested = nestedDiagram(o);
  const layout = (o.layout ?? nested?.layout) as Record<string, unknown> | undefined;
  const candidate = layout?.edgeStyle ?? o.edgeStyle ?? nested?.edgeStyle ?? readDiagramPolicy(payload)?.edgeStyle;
  const r = EdgeStyleSchema.safeParse(candidate);
  return r.success ? r.data : fallback;
}

// ── Vocabulario base ────────────────────────────────────────────────────
// Se registra una sola vez por página (si otro bundle ya lo hizo, se respeta
// lo que haya: una librería puede reemplazar definiciones).
if (!STORE.edges.size) {
  const E = (d: EdgeKindDefInput): void => { registerEdgeKind(EdgeKindDefSchema.parse(d)); };
  // Conectores (componentes): unas exponen, otras conectan.
  E({ id: 'assembly', family: 'connector', label: 'Ensamble -(O-', usage: 'Un componente expone una interfaz (-( ) y otro la consume (-O). Recomendado en componentes y despliegue.', recommendedFor: ['component', 'block'], start: 'socket', end: 'ball', direction: 'expose' });
  E({ id: 'dependency', family: 'connector', label: 'Dependencia', usage: 'Usa algo del destino sin exponer interfaz. Punteada con flecha abierta.', recommendedFor: ['component', 'class'], end: 'open-arrow', dash: 'dashed' });
  E({ id: 'realization', family: 'connector', label: 'Realización', usage: 'El origen implementa el contrato del destino. Punteada con triángulo hueco.', recommendedFor: ['component', 'class'], end: 'triangle', dash: 'dashed' });
  E({ id: 'association', family: 'connector', label: 'Asociación', usage: 'Vínculo estable entre dos partes, sin dirección obligada.', recommendedFor: ['component', 'class', 'usecase'], direction: 'none' });
  // Relacionales (DER): unas consultan, otras entregan, con cardinalidad.
  E({ id: 'relation', family: 'relational', label: 'Relación', usage: 'Llave foránea entre entidades; los extremos llevan cardinalidad (pata de gallo).', recommendedFor: ['er'], start: 'crow-one', end: 'crow-many', direction: 'both', cardinal: true });
  E({ id: 'query', family: 'relational', label: 'Consulta', usage: 'El origen lee del destino (lookup, join). Flecha hacia el que entrega.', recommendedFor: ['er', 'component'], end: 'open-arrow', direction: 'query', cardinal: true });
  E({ id: 'deliver', family: 'relational', label: 'Entrega', usage: 'El origen alimenta o escribe en el destino.', recommendedFor: ['er', 'component'], end: 'arrow', direction: 'deliver', cardinal: true });
  // Señales (secuencia, estados): sin remates o con mensaje.
  E({ id: 'signal', family: 'signal', label: 'Señal', usage: 'Línea de señalamiento sin flechas: une dos cosas sin afirmar dirección.', recommendedFor: ['sequence', 'state', 'block', 'mindmap'], direction: 'none' });
  E({ id: 'message-sync', family: 'signal', label: 'Mensaje síncrono', usage: 'Llamada que espera respuesta. Línea continua con flecha.', recommendedFor: ['sequence'], end: 'arrow' });
  E({ id: 'message-async', family: 'signal', label: 'Mensaje asíncrono', usage: 'Respuesta o evento que no bloquea. Línea punteada con flecha.', recommendedFor: ['sequence'], end: 'arrow', dash: 'dashed' });
  E({ id: 'self', family: 'signal', label: 'Mensaje a sí mismo', usage: 'Trabajo interno del participante (validar, firmar, decidir).', recommendedFor: ['sequence'], end: 'arrow' });
  // Flujo y estructura.
  E({ id: 'flow', family: 'flow', label: 'Flujo', usage: 'Paso siguiente en un proceso.', recommendedFor: ['flowchart', 'state', 'swimlane', 'journey'], end: 'arrow' });
  E({ id: 'inheritance', family: 'structural', label: 'Herencia', usage: 'Generalización: triángulo hueco en el padre. En clases se agrupa en bus.', recommendedFor: ['class'], end: 'triangle' });
  E({ id: 'composition', family: 'structural', label: 'Composición', usage: 'El todo posee la parte (rombo lleno en el todo).', recommendedFor: ['class'], start: 'filled-diamond', end: 'open-arrow' });
  E({ id: 'aggregation', family: 'structural', label: 'Agregación', usage: 'El todo agrupa la parte sin poseerla (rombo hueco).', recommendedFor: ['class'], start: 'diamond', end: 'open-arrow' });
}

if (!STORE.nodes.size) {
  const N = (d: NodeStructureDefInput): void => { registerNodeStructure(NodeStructureDefSchema.parse(d)); };
  N({ id: 'box', label: 'Caja', usage: 'Nodo rectangular con estereotipo, nombre e ítems. Sirve para componente, clase, entidad, actor o participante.', recommendedFor: ['component', 'class', 'er', 'sequence', 'block', 'flowchart'], fields: ['stereotype', 'name', 'items', 'icon', 'fill'] });
  N({ id: 'package', label: 'Paquete', usage: 'Agrupador con rótulo que contiene cajas u otros paquetes.', recommendedFor: ['component', 'class', 'block'], fields: ['stereotype', 'name', 'parent', 'cols'], container: true, icon: false });
  N({ id: 'layer', label: 'Capa', usage: 'Franja horizontal que ordena paquetes por nivel (entrada, controllers, base, objetos).', recommendedFor: ['component', 'class'], fields: ['name', 'cols'], container: true, icon: false });
  N({ id: 'interface-port', label: 'Puerto de interfaz', usage: 'Extremo -( / -O pegado a una cara de la caja; solo existe cableado.', recommendedFor: ['component'], fields: ['name', 'kind', 'side'], icon: false });
  N({ id: 'lifeline', label: 'Línea de vida', usage: 'Participante de secuencia: caja con icono y línea vertical punteada.', recommendedFor: ['sequence'], fields: ['label', 'kind', 'icon', 'hue'] });
  N({ id: 'region', label: 'Región', usage: 'Franja horizontal que agrupa mensajes o procesos (par, loop, opt, async). Dice que lo de adentro ocurre junto o repetido.', recommendedFor: ['sequence', 'swimlane'], fields: ['name', 'kind', 'messages', 'color'], container: true, icon: false });
  N({ id: 'participant-box', label: 'Caja de participantes', usage: 'Región vertical que agrupa líneas de vida por sistema (ISS, Servicios).', recommendedFor: ['sequence'], fields: ['name', 'actors', 'color'], container: true, icon: false });
  N({ id: 'entity', label: 'Entidad', usage: 'Tabla con atributos y llaves; el relleno naranja es exclusivo del DER InSoft.', recommendedFor: ['er'], fields: ['name', 'attributes', 'cluster'] });
  N({ id: 'note', label: 'Nota', usage: 'Texto libre pegado a un nodo o flotante.', recommendedFor: ['component', 'class', 'er', 'sequence', 'flowchart'], fields: ['text', 'target'], icon: false });
}
