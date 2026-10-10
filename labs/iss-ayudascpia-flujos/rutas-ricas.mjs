// labs/iss-ayudascpia-flujos/rutas-ricas.mjs
// Compone las rutas ilustradas (diagramas combinados) de los procesos del ISS-AyudasCPIA con piezas
// REALES del ISS: componentes y endpoints (componentes.json), clases de controlador y POJO (clases.json),
// tablas del DER (der.json) y sistemas externos (OpenAI, DataSnap). Cada ruta sigue el modelo del tiquete:
//
//   - carril del cliente: el componente con su URL abre el flujo y recibe la respuesta (fin → componente);
//   - carril del controlador: la clase «uses» su POJO (grupo «Clases») y de ahí los pasos;
//   - carril de la BD: las tablas; cada paso las usa con una punteada SELECT / INSERT / UPDATE / DELETE;
//   - sistemas externos (OpenAI, DataSnap): su componente; los pasos los llaman con una punteada;
//   - numeración automática (todo 1..N), íconos por paso, comentarios en globo, barras para paralelismo.
//
// Escribe `payloads/ruta-<slug>.json` (formato de los editables del ISS) y, con `--iss`, también en
// `docs-experimental/diagramas` del ISS (la fuente de los docs). Exporta `ruta()` para `eps-iss.mjs`.
// Uso: deno run -A --no-check labs/iss-ayudascpia-flujos/rutas-ricas.mjs [--iss]

import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFile, writeFile } from 'node:fs/promises';

const LAB = dirname(fileURLToPath(import.meta.url));
export const ISS = join(LAB, '..', '..', '..', '..', '..', 'PatyIA', '_experimental', 'ISS-AyudasCPIA', 'docs-experimental', 'diagramas');
const leer = async (f) => JSON.parse(await readFile(join(ISS, f), 'utf8')).payload;

const componentes = new Map((await leer('componentes.json')).componentDiagram.components.map((c) => [c.id, c]));
const clases = new Map((await leer('clases.json')).classDiagram.classes.map((c) => [c.id, c]));
const tablas = new Map((await leer('der.json')).erDiagram.entities.map((e) => [e.name, e]));
/** Fuente de verdad de las clases, generada desde el código del ISS (codigo-a-fuentes.mjs). */
const codigo = JSON.parse(await readFile(join(ISS, '..', 'fuentes', 'codigo.json'), 'utf8'));
const enCodigo = new Set(codigo.clases.map((c) => c.name));
const pojoDe = new Map(codigo.pares.map((p) => [p.controller, p.pojo]));

/*
 * Referencias { path, query, actions } (ver `Obj` del kit): los nodos no copian datos, citan su
 * fuente de verdad. Las rutas son relativas a docs-experimental/diagramas del ISS; el lab las
 * reescribe hacia allá al escribir (ver `escribir`).
 */
const refComponente = (ref, campo) => ({ path: './componentes.json', query: { payload: { componentDiagram: { components: { [`[id=${ref}]`]: campo ? { [campo]: true } : true } } } } });
const refTabla = (nombre, campo) => ({ path: './der.json', query: { payload: { erDiagram: { entities: { [`[name=${nombre}]`]: campo ? { [campo]: true } : true } } } } });
const refClase = (nombre, campo) => ({ path: '../fuentes/codigo.json', query: { clases: { [`[name=${nombre}]`]: campo ? { uml: { [campo]: true } } : { uml: true } } } });

/** Arma una ruta: lanes + nodos + aristas con atajos para cada pieza del ISS. */
export function ruta(meta, componer) {
  const nodes = [];
  const edges = [];
  /** Clase ya presente → id de su nodo (una clase aparece una sola vez por ruta). */
  const porClase = new Map();
  /** id pedido por el generador → id real (cuando la clase ya estaba, p. ej. el POJO automático). */
  const alias = new Map();
  const real = (id) => alias.get(id) ?? id;
  const n = (x) => (nodes.push(x), x.id);
  const arista = (e) => {
    const x = { ...e, from: real(e.from), to: real(e.to) };
    if (!edges.some((y) => y.from === x.from && y.to === x.to && (y.kind ?? '') === (x.kind ?? ''))) edges.push(x);
  };
  const nombreDe = (ref) => {
    const c = clases.get(ref);
    const name = c ? c.name.replace(/<.*>$/, '') : ref;
    if (!enCodigo.has(name)) throw new Error(`clase ${ref} (${name}) no está en fuentes/codigo.json`);
    return name;
  };
  const b = {
    componente(id, ref, lane, items) {
      if (!componentes.has(ref)) throw new Error(`componente ${ref} no está en componentes.json`);
      // Nombre, estereotipo e ítems desde componentes.json; los ítems propios de la ruta, si los hay, los pisan.
      const component = { ...refComponente(ref), actions: [{ op: 'get', query: { name: true, stereotype: true, items: true } }, ...(items ? [{ op: 'push', valor: { items } }] : [])] };
      return n({ id, label: refComponente(ref, 'name'), kind: 'component', lane, component });
    },
    clase(id, ref, lane, fill) {
      const name = nombreDe(ref);
      if (porClase.has(name)) { alias.set(id, porClase.get(name)); return porClase.get(name); }
      porClase.set(name, id);
      n({ id, label: name, kind: 'class', lane, class: { ...refClase(name), ...(fill ? { actions: [{ op: 'push', valor: { fill } }] } : {}) } });
      // Todo controller va con su POJO (fuente: los pares de codigo.json), unidos por «uses».
      const pojo = pojoDe.get(name);
      if (pojo && !porClase.has(pojo)) {
        const pid = `${id}-pojo`;
        porClase.set(pojo, pid);
        n({ id: pid, label: pojo, kind: 'class', lane, class: { ...refClase(pojo), actions: [{ op: 'push', valor: { fill: 'leaf' } }] } });
        arista({ from: id, to: pid, kind: 'dashed', label: '«uses»' });
      }
      return id;
    },
    tabla(id, nombre, lane, columnas) {
      const t = tablas.get(nombre);
      if (!t) throw new Error(`tabla ${nombre} no está en der.json`);
      for (const c of columnas ?? []) if (!t.attributes.some((a) => a.name === c)) throw new Error(`columna ${c} no está en ${nombre} (der.json)`);
      // La tabla del DER; con `columnas`, solo esas (get conserva la estructura { name, attributes }).
      const table = { ...refTabla(nombre), actions: [{ op: 'get', query: { name: true, attributes: columnas ? Object.fromEntries(columnas.map((c) => [`[name=${c}]`, true])) : true } }] };
      return n({ id, label: refTabla(nombre, 'name'), kind: 'tableder', lane, table });
    },
    paso: (id, label, lane, icon) => n({ id, label, lane, ...(icon ? { icon } : {}) }),
    decision: (id, label, lane) => n({ id, label, shape: 'diamond', lane }),
    inicio: (id, lane) => n({ id, label: 'Inicio', shape: 'start', lane }),
    fin: (id, lane) => n({ id, label: 'Fin', shape: 'end', lane }),
    barra: (id, lane) => n({ id, label: '', shape: 'bar', lane }),
    nota: (id, about, label) => n({ id, label, shape: 'comment', about: real(about) }),
    flujo: (from, to, label) => arista({ from, to, ...(label ? { label } : {}) }),
    uso: (from, to, label) => arista({ from, to, kind: 'dashed', label }),
    cadena: (...ids) => ids.slice(1).forEach((to, i) => arista({ from: ids[i], to })),
  };
  componer(b);
  return {
    slug: `ruta-${meta.slug}`,
    module: meta.module,
    tag: 'iswc-flowchart',
    script: 'diagrams/flowchart.min.js',
    attrs: { 'diagram-style': 'insoft' },
    payload: { title: meta.title, steps: 'auto', lanes: meta.lanes, nodes, edges },
  };
}

const RUTAS = [];

// ── 020 · Alta del tiquete (POST /tiquete) ──────────────────────────────────────────────────────
RUTAS.push(ruta({
  slug: 'conversacion-tiquete', module: '020-Conversaciones', title: 'Alta del tiquete',
  lanes: [{ id: 'P', label: 'Portal' }, { id: 'T', label: 'ISS · TConversationTicketController' }, { id: 'D', label: 'PostgreSQL' }],
}, (b) => {
  b.componente('api', 'grp-mensaje-tiquete', 'P', ['POST /tiquete']);
  b.clase('ctl', 'tiq', 'T', 'app');
  b.clase('pojo', 'm_tiq', 'T', 'leaf');
  b.paso('val', 'Valida el body: iconversacion e itiquete enteros positivos', 'T', 'mdi:shield-check-outline');
  b.paso('lee', 'Lee la conversación', 'T', 'mdi:database-search-outline');
  b.tabla('tconv', 'patyia_conversaciones', 'D', ['iconversacion', 'itercero', 'icontacto', 'itdestado', 'bautoriza_visualizacion']);
  b.decision('dec', '¿Estado de la conversación?', 'T');
  b.paso('e401', '401 · solo el propietario crea tiquetes', 'T', 'mdi:account-cancel-outline');
  b.paso('e404', '404 (500 si no se pudo leer)', 'T', 'mdi:file-question-outline');
  b.paso('e400', '400 · cerrada o eliminada', 'T', 'mdi:lock-outline');
  b.paso('ins', 'Inserta el tiquete (si ya existe ese número, lo relee)', 'T', 'mdi:ticket-confirmation-outline');
  b.tabla('ttiq', 'patyia_tiquetesconversacion', 'D');
  b.paso('cierra', 'Cierra y/o autoriza la visualización, si se pidió', 'T', 'mdi:check-decagram-outline');
  b.paso('ok', '{ ticket, sideEffects }', 'T', 'mdi:reply-outline');
  b.fin('fin', 'T');
  b.flujo('api', 'ctl', 'POST /tiquete');
  b.uso('ctl', 'pojo', '«uses»');
  b.cadena('ctl', 'val', 'lee', 'dec');
  b.uso('lee', 'tconv', 'SELECT');
  b.flujo('dec', 'e401', 'no es del dueño estricto');
  b.flujo('dec', 'e404', 'no existe');
  b.flujo('dec', 'e400', 'cerrada o eliminada');
  b.flujo('dec', 'ins', 'abierta y del dueño');
  b.uso('ins', 'ttiq', 'INSERT');
  b.cadena('ins', 'cierra', 'ok', 'fin');
  b.uso('cierra', 'tconv', 'UPDATE');
  for (const e of ['e401', 'e404', 'e400']) b.flujo(e, 'fin');
  b.flujo('fin', 'api', 'respuesta');
}));

// ── 020 · Turno de conversación (POST /conversacion, SSE) ───────────────────────────────────────
RUTAS.push(ruta({
  slug: 'conversacion-turno', module: '020-Conversaciones', title: 'Turno de conversación',
  lanes: [{ id: 'C', label: 'Portal' }, { id: 'T', label: 'ISS · TConversacionController' }, { id: 'P', label: 'PostgreSQL' }, { id: 'O', label: 'OpenAI' }],
}, (b) => {
  b.componente('api', 'grp-conv-portal', 'C', ['POST /conversacion']);
  b.clase('ctl', 'conv', 'T', 'app');
  b.clase('pojo', 'm_conv', 'T', 'leaf');
  b.paso('seg', 'Puerta SEG, body estricto, contexto, prompt o adjuntos, modo libre', 'T', 'mdi:shield-check-outline');
  b.decision('dec', '¿Continúa una conversación?', 'T');
  b.paso('sigue', 'Valida que es del dueño y está abierta; fhultact = ahora', 'T', 'mdi:database-edit-outline');
  b.paso('nueva', 'Alta: título e hilo provisionales, qmensajes = 1', 'T', 'mdi:database-plus-outline');
  b.tabla('tconv', 'patyia_conversaciones', 'P', ['iconversacion', 'itercero', 'icontacto', 'titulo', 'hilo', 'qmensajes', 'qtokens', 'fhultact']);
  b.paso('begin', '200 text/event-stream · begin y los log que esperaban', 'T', 'mdi:broadcast');
  b.componente('ai', 'openai-chat', 'O');
  b.paso('voz', 'Transcribe las notas de voz (si hay)', 'T', 'mdi:microphone-outline');
  b.paso('clasif', 'Clasifica la consulta dentro del contexto', 'T', 'mdi:tag-search-outline');
  b.paso('hilo', 'Asegura el hilo (Conversations API)', 'T', 'mdi:forum-outline');
  b.paso('resp', 'Responses API en stream con instrucciones y file_search', 'T', 'mdi:robot-outline');
  b.paso('delta', 'Reenvía cada delta al cliente (message)', 'T', 'mdi:message-arrow-right-outline');
  b.nota('n-delta', 'delta', 'Se repite por cada fragmento del stream');
  b.paso('titulo', 'Título y consultas, solo si el turno salió bien', 'T', 'mdi:format-title');
  b.paso('hist', 'Guarda el historial del turno, bajo bloqueo', 'T', 'mdi:database-lock-outline');
  b.tabla('tlog', 'patyia_conversacion_log', 'P');
  b.paso('cuenta', 'Actualiza qmensajes, qtokens, hilo y fhultact', 'T', 'mdi:database-edit-outline');
  b.paso('end', 'end · meta con traza, imensaje y stream_ok', 'T', 'mdi:flag-checkered');
  b.nota('n-log', 'begin', 'Cada paso emite además un evento log');
  b.fin('fin', 'T');
  b.flujo('api', 'ctl', 'POST /conversacion');
  b.uso('ctl', 'pojo', '«uses»');
  b.cadena('ctl', 'seg', 'dec');
  b.flujo('dec', 'sigue', 'continúa');
  b.flujo('dec', 'nueva', 'nueva');
  b.uso('sigue', 'tconv', 'UPDATE');
  b.uso('nueva', 'tconv', 'INSERT');
  b.flujo('sigue', 'begin');
  b.flujo('nueva', 'begin');
  b.cadena('begin', 'voz', 'clasif', 'hilo', 'resp', 'delta', 'titulo', 'hist', 'cuenta', 'end', 'fin');
  b.uso('voz', 'ai', 'audio');
  b.uso('clasif', 'ai', 'clasifica');
  b.uso('hilo', 'ai', 'Conversations');
  b.uso('resp', 'ai', 'Responses');
  b.uso('titulo', 'ai', 'título');
  b.uso('hist', 'tlog', 'INSERT');
  b.uso('cuenta', 'tconv', 'UPDATE');
  b.flujo('fin', 'api', 'respuesta (stream)');
}));

// ── 020 · Traza del turno (eventos SSE) ─────────────────────────────────────────────────────────
RUTAS.push(ruta({
  slug: 'traza-turno', module: '020-Conversaciones', title: 'Traza del turno',
  lanes: [{ id: 'C', label: 'Portal (SSE)' }, { id: 'T', label: 'ISS · TConversacionController' }, { id: 'H', label: 'Historial' }],
}, (b) => {
  b.componente('api', 'grp-conv-portal', 'C', ['POST /conversacion']);
  b.paso('begin', 'Emite begin', 'T', 'mdi:broadcast');
  b.paso('ev', 'Emite un event log (seq, ms, nivel, etapa, mensaje)', 'T', 'mdi:text-box-search-outline');
  b.nota('n-ev', 'ev', 'Se repite en cada paso del pipeline');
  b.paso('guarda', 'Guarda el mensaje assistant con others.traza hasta ese momento', 'T', 'mdi:database-plus-outline');
  b.tabla('tlog', 'patyia_conversacion_log', 'H');
  b.paso('termina', 'Emite event log · Turno terminado (con dur)', 'T', 'mdi:timer-check-outline');
  b.paso('end', 'Emite end con meta.traza = la traza completa', 'T', 'mdi:flag-checkered');
  b.fin('fin', 'T');
  b.flujo('api', 'begin', 'POST /conversacion');
  b.cadena('begin', 'ev', 'guarda', 'termina', 'end', 'fin');
  b.uso('guarda', 'tlog', 'INSERT');
  b.flujo('fin', 'api', 'eventos SSE');
}));

// ── 020 · Calificación de un mensaje (POST /mensaje) ────────────────────────────────────────────
RUTAS.push(ruta({
  slug: 'calificacion-mensaje', module: '020-Conversaciones', title: 'Calificación de un mensaje',
  lanes: [{ id: 'P', label: 'Portal' }, { id: 'T', label: 'ISS · TQualifiedMessageController' }, { id: 'D', label: 'PostgreSQL' }],
}, (b) => {
  b.componente('api', 'grp-mensaje-tiquete', 'P', ['POST /mensaje']);
  b.clase('ctl', 'msg', 'T', 'app');
  b.clase('pojo', 'm_msg', 'T', 'leaf');
  b.decision('d1', '¿Body estricto y token?', 'T');
  b.paso('r1', '400 · 401', 'T', 'mdi:shield-alert-outline');
  b.paso('lee', 'Lee la conversación', 'T', 'mdi:database-search-outline');
  b.tabla('tconv', 'patyia_conversaciones', 'D', ['iconversacion', 'itercero', 'icontacto', 'itdestado']);
  b.decision('d2', '¿Existe y no está borrada?', 'T');
  b.paso('r2', '400', 'T', 'mdi:file-question-outline');
  b.decision('d3', '¿Está cerrada?', 'T');
  b.paso('r3', '400 · cerrada', 'T', 'mdi:lock-outline');
  b.paso('r4', '401 · sin alcance de auditoría', 'T', 'mdi:shield-account-outline');
  b.decision('d4', '¿Es el dueño estricto?', 'T');
  b.paso('r5', '401 · solo el propietario puede calificarla', 'T', 'mdi:account-cancel-outline');
  b.decision('d5', '¿Es una respuesta del asistente, sin calificar?', 'T');
  b.tabla('tlog', 'patyia_conversacion_log', 'D');
  b.paso('r6', '400 · no calificable', 'T', 'mdi:message-alert-outline');
  b.paso('ins', 'Registra la calificación', 'T', 'mdi:thumb-up-outline');
  b.tabla('tmsg', 'patyia_mensajescalificados', 'D');
  b.fin('fin', 'T');
  b.flujo('api', 'ctl', 'POST /mensaje');
  b.uso('ctl', 'pojo', '«uses»');
  b.flujo('ctl', 'd1');
  b.flujo('d1', 'r1', 'no');
  b.flujo('d1', 'lee', 'sí');
  b.uso('lee', 'tconv', 'SELECT');
  b.flujo('lee', 'd2');
  b.flujo('d2', 'r2', 'no');
  b.flujo('d2', 'd3', 'sí');
  b.flujo('d3', 'r3', 'sí, sin calificar tarde');
  b.flujo('d3', 'r4', 'sí, con bandera sin auditoría');
  b.flujo('d3', 'd4', 'no, o con bandera y alcance');
  b.flujo('d4', 'r5', 'no');
  b.flujo('d4', 'd5', 'sí');
  b.uso('d5', 'tlog', 'SELECT');
  b.flujo('d5', 'r6', 'no');
  b.flujo('d5', 'ins', 'sí');
  b.uso('ins', 'tmsg', 'INSERT');
  for (const r of ['r1', 'r2', 'r3', 'r4', 'r5', 'r6', 'ins']) b.flujo(r, 'fin');
  b.flujo('fin', 'api', 'respuesta');
}));

// ── 020 · Acceso a una conversación ─────────────────────────────────────────────────────────────
RUTAS.push(ruta({
  slug: 'seguridad-conversaciones', module: '020-Conversaciones', title: 'Acceso a una conversación',
  lanes: [{ id: 'P', label: 'Portal' }, { id: 'T', label: 'ISS · TConversacionController' }, { id: 'D', label: 'PostgreSQL' }],
}, (b) => {
  b.componente('api', 'grp-conv-portal', 'P', ['GET|DELETE /conversacion/{iconversacion}']);
  b.clase('ctl', 'conv', 'T', 'app');
  b.paso('lee', 'Lee la conversación pedida', 'T', 'mdi:database-search-outline');
  b.tabla('tconv', 'patyia_conversaciones', 'D', ['iconversacion', 'itercero', 'icontacto', 'bautoriza_visualizacion']);
  b.decision('d1', '¿Existe?', 'T');
  b.paso('n404', '404', 'T', 'mdi:file-question-outline');
  b.decision('d2', '¿Mismo itercero e icontacto que el token?', 'T');
  b.paso('duenio', 'Dueño: puede leer e interactuar', 'T', 'mdi:account-check-outline');
  b.decision('d3', '¿La operación solo lee?', 'T');
  b.paso('u401', '401 · solo el propietario puede…', 'T', 'mdi:account-cancel-outline');
  b.decision('d4', '¿Capacidad auditoria (o logsAjenos para el historial)?', 'T');
  b.decision('d5', '¿Mismo itercero y bautoriza_visualizacion?', 'T');
  b.paso('lectura', 'Lee', 'T', 'mdi:eye-outline');
  b.paso('u401b', '401', 'T', 'mdi:shield-alert-outline');
  b.fin('fin', 'T');
  b.flujo('api', 'ctl', 'petición con token');
  b.cadena('ctl', 'lee', 'd1');
  b.uso('lee', 'tconv', 'SELECT');
  b.flujo('d1', 'n404', 'no');
  b.flujo('d1', 'd2', 'sí');
  b.flujo('d2', 'duenio', 'sí');
  b.flujo('d2', 'd3', 'no');
  b.flujo('d3', 'u401', 'no');
  b.flujo('d3', 'd4', 'sí');
  b.flujo('d4', 'lectura', 'sí');
  b.flujo('d4', 'd5', 'no');
  b.flujo('d5', 'lectura', 'sí');
  b.flujo('d5', 'u401b', 'no');
  for (const r of ['n404', 'duenio', 'u401', 'lectura', 'u401b']) b.flujo(r, 'fin');
  b.flujo('fin', 'api', 'respuesta');
}));

// ── 010 · Autorización de una ruta (puerta SEG) ─────────────────────────────────────────────────
RUTAS.push(ruta({
  slug: 'seguridad-autorizacion', module: '010-General', title: 'Autorización de una ruta (puerta SEG)',
  lanes: [{ id: 'C', label: 'Cliente' }, { id: 'B', label: 'ISS · TBasePatyIA' }, { id: 'P', label: 'PostgreSQL · seg_*' }],
}, (b) => {
  b.componente('api', 'grp-permisos', 'C');
  b.clase('base', 'base', 'B', 'app');
  b.clase('perm', 'perm', 'B', 'service');
  b.paso('id', 'Id SEG por prefijo (METHOD:/ruta · QUERY:/ruta · CFG:/ruta)', 'B', 'mdi:identifier');
  b.paso('fila', 'Busca la fila de USR para el id', 'B', 'mdi:database-search-outline');
  b.tabla('trec', 'seg_accionesrecursos', 'P', ['isysrecurso', 'iaccion', 'itdvalor', 'valordefecto']);
  b.decision('d1', '¿La ruta exige JWT?', 'B');
  b.paso('publica', 'Pasa sin token (ruta pública)', 'B', 'mdi:door-open');
  b.paso('jwt', 'Verifica el JWT HS384 (sin token o inválido: 401)', 'B', 'mdi:key-chain-variant');
  b.paso('rol', 'Rol vigente del contacto (sin rol: USR; lectura fallida: 503)', 'B', 'mdi:shield-account-outline');
  b.tabla('trol', 'seg_rolescontacto', 'P', ['itercero', 'irol', 'icontacto', 'finicial', 'ffinal', 'bprincipal']);
  b.paso('valor', 'Valor efectivo del id para el rol y el verbo', 'B', 'mdi:scale-balance');
  b.tabla('tacc', 'seg_accionesxrol', 'P', ['itercero', 'isysrecurso', 'iaccion', 'irol', 'valor']);
  b.decision('d2', '¿Qué permite el valor efectivo?', 'B');
  b.paso('deny', '401 · Sin permiso', 'B', 'mdi:account-cancel-outline');
  b.paso('handler', 'Corre el handler', 'B', 'mdi:cog-play-outline');
  b.fin('fin', 'B');
  b.flujo('api', 'base', 'petición (con o sin Authorization)');
  b.uso('base', 'perm', '«uses»');
  b.cadena('base', 'id', 'fila', 'd1');
  b.uso('fila', 'trec', 'SELECT');
  b.flujo('d1', 'publica', 'sin fila o protected false');
  b.flujo('d1', 'jwt', 'exige JWT');
  b.cadena('jwt', 'rol', 'valor', 'd2');
  b.uso('rol', 'trol', 'SELECT');
  b.uso('valor', 'tacc', 'SELECT');
  b.flujo('d2', 'deny', 'false');
  b.flujo('d2', 'handler', 'protected, true o capacidad');
  b.flujo('publica', 'handler');
  b.flujo('handler', 'fin');
  b.flujo('deny', 'fin');
  b.flujo('fin', 'api', 'respuesta');
}));

// ── 010 · Token de servidor (POST /JWT) ─────────────────────────────────────────────────────────
RUTAS.push(ruta({
  slug: 'seguridad-jwt', module: '010-General', title: 'Token de servidor (POST /JWT)',
  lanes: [{ id: 'C', label: 'ContaPyme / ISW' }, { id: 'I', label: 'ISS · TIdentityController' }, { id: 'D', label: 'DataSnap DSCLIENTES' }],
}, (b) => {
  b.componente('api', 'grp-identidad', 'C');
  b.clase('ctl', 'ident', 'I', 'app');
  b.decision('d1', '¿Llegan controlKey, iapp e idmaquina?', 'I');
  b.paso('e400', '400', 'I', 'mdi:form-textbox');
  b.paso('login', 'Consulta la sesión en DataSnap', 'I', 'mdi:server-network');
  b.componente('ds', 'ds-login', 'D');
  b.decision('d2', '¿Qué responde DataSnap?', 'I');
  b.paso('e503', '503 · reintentar', 'I', 'mdi:cloud-alert-outline');
  b.paso('e401', '401 · volver a iniciar sesión', 'I', 'mdi:account-cancel-outline');
  b.paso('firma', 'Firma HS384, 24 h, con el secreto del código', 'I', 'mdi:key-chain-variant');
  b.paso('token', '{ respuesta: { token } }', 'I', 'mdi:reply-outline');
  b.fin('fin', 'I');
  b.flujo('api', 'ctl', 'POST /JWT');
  b.flujo('ctl', 'd1');
  b.flujo('d1', 'e400', 'falta un dato');
  b.flujo('d1', 'login', 'completos');
  b.uso('login', 'ds', 'LogInContacto');
  b.flujo('login', 'd2');
  b.flujo('d2', 'e503', 'no responde o vacía');
  b.flujo('d2', 'e401', 'rechaza la llave');
  b.flujo('d2', 'firma', 'identidad válida');
  b.cadena('firma', 'token', 'fin');
  b.flujo('e400', 'fin');
  b.flujo('e503', 'fin');
  b.flujo('e401', 'fin');
  b.flujo('fin', 'api', 'respuesta');
}));

// ── 010 · Login del portal (POST /auth/portal-login) ────────────────────────────────────────────
RUTAS.push(ruta({
  slug: 'seguridad-portal-login', module: '010-General', title: 'Login del portal (POST /auth/portal-login)',
  lanes: [{ id: 'P', label: 'Portal / ISW' }, { id: 'I', label: 'ISS · TIdentityController' }, { id: 'D', label: 'DataSnap DSCLIENTES' }],
}, (b) => {
  b.componente('api', 'grp-login', 'P');
  b.clase('ctl', 'ident', 'I', 'app');
  b.paso('norm', 'Normaliza el correo (sin @ → @contapyme.com) y cifra la contraseña (MD5)', 'I', 'mdi:email-edit-outline');
  b.paso('existe', '¿Existe el contacto y tiene acceso web?', 'I', 'mdi:account-search-outline');
  b.componente('ds', 'ds-login', 'D');
  b.nota('n-ds', 'existe', 'DataSnap se consulta antes de validar las credenciales');
  b.paso('empresas', 'Empresas a las que pertenece el contacto', 'I', 'mdi:domain');
  b.decision('d1', '¿Cuántas empresas?', 'I');
  b.paso('multi', '409 MULTI_EMPRESA · lista de empresas para que el portal pregunte y reintente', 'I', 'mdi:office-building-cog-outline');
  b.paso('valida', 'Valida las credenciales', 'I', 'mdi:account-key-outline');
  b.paso('firma', 'Firma el token (HS384, 24 h)', 'I', 'mdi:key-chain-variant');
  b.paso('entrega', 'Entrega el token con usuario, nombre, vencimiento y claims', 'I', 'mdi:reply-outline');
  b.fin('fin', 'I');
  b.flujo('api', 'ctl', 'correo y contraseña (y empresa)');
  b.cadena('ctl', 'norm', 'existe', 'empresas', 'd1');
  b.uso('existe', 'ds', 'contacto');
  b.uso('empresas', 'ds', 'empresas');
  b.flujo('d1', 'multi', 'varias, sin itercero');
  b.flujo('d1', 'valida', 'una, o itercero elegido');
  b.uso('valida', 'ds', 'LogInContacto');
  b.cadena('valida', 'firma', 'entrega', 'fin');
  b.flujo('multi', 'fin');
  b.flujo('fin', 'api', 'respuesta');
}));

// ── 010 · Captura de errores 5xx ────────────────────────────────────────────────────────────────
RUTAS.push(ruta({
  slug: 'captura-errores', module: '010-General', title: 'Captura de errores 5xx',
  lanes: [{ id: 'C', label: 'Cliente' }, { id: 'W', label: 'Host · makeDispatchHandler' }, { id: 'E', label: 'ISS · TErrorController' }, { id: 'H', label: 'Controller de la ruta' }, { id: 'P', label: 'PostgreSQL' }],
}, (b) => {
  b.componente('api', 'grp-ops', 'C', ['cualquier ruta propia']);
  b.paso('llega', 'Llega la petición y pasa la puerta SEG', 'W', 'mdi:door-open');
  b.clase('err', 'err', 'E', 'app');
  b.clase('pojo', 'm_err', 'E', 'leaf');
  b.paso('envuelve', 'Envuelve el controller con la captura de errores', 'E', 'mdi:shield-bug-outline');
  b.nota('n-timer', 'envuelve', 'Los timers pasan por la misma envoltura: referencia TIMER:/<nombre> y el host sigue');
  b.paso('ejecuta', 'Ejecuta el método del controller', 'H', 'mdi:cog-play-outline');
  b.paso('lanza', 'Lanza un 5xx inesperado (sin status o ≥ 500)', 'H', 'mdi:alert-octagon-outline');
  b.nota('n-4xx', 'lanza', 'Los 4xx son errores del cliente: no se persisten');
  b.paso('excluye', 'Excluye 503 y 4xx; también POST /error y GET|DELETE /errores', 'E', 'mdi:filter-remove-outline');
  b.paso('censura', 'Censura tokens, hashes, claves de API y bearer del cuerpo', 'E', 'mdi:eye-off-outline');
  b.paso('guarda', 'Registra el error (referencia METHOD:/ruta)', 'E', 'mdi:database-plus-outline');
  b.tabla('terr', 'patyia_errores', 'P', ['ierror', 'jerror', 'batendido', 'fhcre', 'referencia', 'resumen']);
  b.nota('n-dup', 'terr', 'Índice único parcial por referencia: el mismo fallo no se duplica');
  b.paso('relanza', 'Vuelve a lanzar el error para el envelope', 'E', 'mdi:replay');
  b.paso('responde', 'Responde 500 (o 503 si era una Rst503_)', 'W', 'mdi:reply-outline');
  b.nota('n-stack', 'responde', 'Rutas montadas por el stack: capturarRespuesta ancla la 5xx (salvo 503)');
  b.fin('fin', 'W');
  b.flujo('api', 'llega', 'petición');
  b.cadena('llega', 'err');
  b.uso('err', 'pojo', '«uses»');
  b.cadena('err', 'envuelve', 'ejecuta', 'lanza', 'excluye', 'censura', 'guarda', 'relanza', 'responde', 'fin');
  b.uso('guarda', 'terr', 'INSERT');
  b.flujo('fin', 'api', 'respuesta');
}));

// ── 010 · Tareas programadas al arrancar ────────────────────────────────────────────────────────
RUTAS.push(ruta({
  slug: 'tareas-programadas', module: '010-General', title: 'Tareas programadas',
  lanes: [{ id: 'H', label: 'Host (func start)' }, { id: 'R', label: 'Runner de parches' }, { id: 'T', label: 'Timers' }, { id: 'P', label: 'PostgreSQL' }],
}, (b) => {
  b.inicio('ini', 'H');
  b.paso('start', 'app.hook.appStart, sin esperar el trabajo', 'H', 'mdi:rocket-launch-outline');
  b.barra('fork', 'H');
  b.paso('runner', 'applyPendingPatches(): patchdb y parches pendientes, por controllers', 'R', 'mdi:database-cog-outline');
  b.paso('estado', 'Publica el estado del runner (/api/info)', 'H', 'mdi:information-outline');
  b.paso('barrido', 'Barrido de cierre inmediato', 'H', 'mdi:broom');
  b.fin('fin-arranque', 'H');
  b.clase('cconv', 'conv', 'T', 'app');
  b.clase('clog', 'log', 'T', 'app');
  b.paso('flag', 'Lee runtime.timers (flag ausente = encendido)', 'T', 'mdi:timer-cog-outline');
  b.nota('n-cada', 'flag', 'Cada 30 minutos, los dos timers en paralelo');
  b.tabla('tsys', 'patyia_sys_values', 'P');
  b.decision('d1', '¿Flag encendido?', 'T');
  b.paso('nada', 'Sale sin hacer nada', 'T', 'mdi:skip-next-outline');
  b.paso('cierra', 'Cierra las conversaciones inactivas', 'T', 'mdi:archive-lock-outline');
  b.paso('purga', 'Purga el log de conversaciones', 'T', 'mdi:delete-sweep-outline');
  b.tabla('tconv', 'patyia_conversaciones', 'P', ['iconversacion', 'itdestado', 'fhultact']);
  b.tabla('tlog', 'patyia_conversacion_log', 'P');
  b.fin('fin', 'T');
  b.cadena('ini', 'start', 'fork');
  b.flujo('fork', 'runner', 'trabajo de arranque en segundo plano');
  b.cadena('runner', 'estado', 'barrido', 'fin-arranque');
  b.uso('barrido', 'tconv', 'UPDATE');
  b.flujo('fork', 'cconv', 'timers');
  b.uso('cconv', 'clog', '«uses»');
  b.cadena('cconv', 'flag', 'd1');
  b.uso('flag', 'tsys', 'SELECT');
  b.flujo('d1', 'nada', 'false');
  b.flujo('d1', 'cierra', 'encendido');
  b.cadena('cierra', 'purga', 'fin');
  b.uso('cierra', 'tconv', 'UPDATE');
  b.uso('purga', 'tlog', 'DELETE');
  b.flujo('nada', 'fin');
}));

// ── Parches de datos (runner) ───────────────────────────────────────────────────────────────────
RUTAS.push(ruta({
  slug: 'parches-de-datos', module: '010-General', title: 'Parches de datos',
  lanes: [{ id: 'R', label: 'Runner de parches · ZPatch' }, { id: 'P', label: 'PostgreSQL' }],
}, (b) => {
  b.inicio('ini', 'R');
  b.paso('a', 'El parche .sql.ts devuelve un TPatch', 'R', 'mdi:file-code-outline');
  b.decision('b', '¿ZPatch valida el objeto completo?', 'R');
  b.paso('x', 'Falla sin escribir: va a la bandeja de errores', 'R', 'mdi:alert-octagon-outline');
  b.tabla('terr', 'patyia_errores', 'P', ['ierror', 'jerror', 'referencia', 'resumen']);
  b.paso('c', 'Pasada 1: solo lee y planifica, tabla por tabla', 'R', 'mdi:clipboard-search-outline');
  b.componente('pg', 'db-pg', 'P');
  b.decision('d', '¿Hay bloqueos?', 'R');
  b.paso('f', 'Pasada 2: aplica y cada operación vuelve a leer', 'R', 'mdi:database-sync-outline');
  b.paso('g', 'Registra el parche en patchdb', 'R', 'mdi:database-check-outline');
  b.fin('fin', 'R');
  b.cadena('ini', 'a', 'b');
  b.flujo('b', 'x', 'no');
  b.flujo('b', 'c', 'sí');
  b.uso('c', 'pg', 'SELECT');
  b.flujo('c', 'd');
  b.flujo('d', 'x', 'sí');
  b.flujo('d', 'f', 'no');
  b.uso('f', 'pg', 'INSERT · UPDATE');
  b.cadena('f', 'g', 'fin');
  b.uso('g', 'pg', 'INSERT patchdb');
  b.uso('x', 'terr', 'INSERT');
  b.flujo('x', 'fin');
}));

// ── Gate del entregable (npm run sync:entregable) ───────────────────────────────────────────────
RUTAS.push(ruta({
  slug: 'gate-entregable', module: '010-General', title: 'Gate del entregable',
  lanes: [{ id: 'S', label: 'sync:entregable' }, { id: 'G', label: 'Gate (pruebas)' }, { id: 'E', label: 'Entregable y mirror' }],
}, (b) => {
  b.inicio('ini', 'S');
  b.paso('s', 'npm run sync:entregable', 'S', 'mdi:console');
  b.decision('v', '¿Remotos del mirror y dependencias del compilado en orden?', 'S');
  b.paso('x', 'Exit 4 · el entregable no se toca', 'S', 'mdi:cancel');
  b.paso('g1', 'pre:vendor: vendor del kit, build y bundle', 'S', 'mdi:package-variant-closed');
  b.paso('g2', 'docs:diagramas y docs:publicar', 'S', 'mdi:file-document-multiple-outline');
  b.paso('g3', 'mirror-guardian', 'S', 'mdi:shield-sync-outline');
  b.paso('g4', 'check-inbox-cero: local, staging y prod', 'S', 'mdi:inbox-outline');
  b.paso('g5', 'patch-cleanup', 'S', 'mdi:broom');
  b.decision('h', '¿Hay otro host en el puerto del gate?', 'G');
  b.paso('h2', 'Arranca su propio host y espera /api/info', 'G', 'mdi:server-plus');
  b.paso('t1', 'oxlint', 'G', 'mdi:format-list-checks');
  b.paso('t2', 'test:all', 'G', 'mdi:test-tube');
  b.paso('t3', 'tsc --noEmit', 'G', 'mdi:language-typescript');
  b.paso('baja', 'Baja el host siempre', 'G', 'mdi:server-off');
  b.decision('q', '¿Todo en verde?', 'G');
  b.paso('w', 'Escribe en el entregable solo lo que cambió', 'E', 'mdi:content-save-move-outline');
  b.paso('p', 'Post: dependencias en package.json, renombres de mayúsculas y estado', 'E', 'mdi:cog-transfer-outline');
  b.paso('c', 'Checkpoint: commit y push del mirror', 'E', 'mdi:source-commit');
  b.fin('fin', 'E');
  b.fin('fin-x', 'S');
  b.cadena('ini', 's', 'v');
  b.flujo('v', 'x', 'falla');
  b.flujo('v', 'g1', 'ok');
  b.cadena('g1', 'g2', 'g3', 'g4', 'g5', 'h');
  b.flujo('h', 'x', 'sí');
  b.flujo('h', 'h2', 'no');
  b.cadena('h2', 't1', 't2', 't3', 'baja', 'q');
  b.flujo('q', 'x', 'no');
  b.flujo('q', 'w', 'sí');
  b.cadena('w', 'p', 'c', 'fin');
  b.flujo('x', 'fin-x');
}));

/** Escribe cada editable en el lab y, con `--iss`, en los editables del ISS. */
export async function escribir(editables) {
  const destinos = [join(LAB, 'payloads'), ...(process.argv.includes('--iss') ? [ISS] : [])];
  // En el lab, las referencias apuntan a la carpeta del ISS (las fuentes de verdad viven allá).
  const haciaIss = relative(join(LAB, 'payloads'), ISS).split(sep).join('/');
  const paraLab = (v) => Array.isArray(v) ? v.map(paraLab)
    : v && typeof v === 'object'
      ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, k === 'path' && typeof x === 'string' && x.startsWith('.') ? `${haciaIss}/${x}`.replace(/\/\.\//g, '/') : paraLab(x)]))
      : v;
  for (const r of editables) {
    for (const d of destinos) await writeFile(join(d, `${r.slug}.json`), `${JSON.stringify(d === ISS ? r : paraLab(r), null, 2)}
`);
    console.log(`OK ${r.slug}`);
  }
}

if (import.meta.main) {
  // `gate-entregable` no es un proceso de negocio: se dibuja pero no va a la doc oficial.
  for (const r of RUTAS) if (r.slug === 'ruta-gate-entregable') r.oficial = false;
  await escribir(RUTAS);
  console.log(`${RUTAS.length} rutas ricas desde ${ISS}`);
}
