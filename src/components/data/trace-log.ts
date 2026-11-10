import { emit, define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { copyText, crearNodo } from '@jeff-aporta/iswc-base/core/dom.js';
import { atributosDe, PropsElement } from '@jeff-aporta/iswc-base/core/props-element.js';
import { TraceLogPropsSchema } from './schemas/trace-log.schemas.js';
import type { TraceEvento, TraceFiltro, TraceLogProps, TraceNivel, TraceTextos } from './schemas/trace-log.schemas.js';
import css from 'iswc:css';

/**
 * <iswc-trace-log> — log de un proceso: cabecera plegable con el resumen y, desplegada, cada paso con su tiempo, nivel,
 * etapa, mensaje, duración y datos. Sirve para ver qué hizo un proceso, cuánto tardó cada paso y dónde falló.
 *
 * Evento: `iswc-trace-copy { json }` al copiar la traza.
 * CSS parts: traza, cabecera, barra, eventos.
 */

const INICIAL: TraceLogProps = { eventos: [], titulo: 'Traza', filtro: 'todo', abierto: false, enVivo: false, textos: {} };

const TEXTOS: TraceTextos = {
  evento: 'evento', eventos: 'eventos', aviso: 'aviso', avisos: 'avisos', error: 'error', errores: 'errores', enVivo: 'en vivo',
  filtrar: 'Filtrar por nivel', todo: 'Todo', info: 'Info', warn: 'Avisos', soloErrores: 'Errores',
  copiar: 'Copiar la traza en JSON', listado: 'Eventos de la traza', datos: 'datos', vacio: 'Sin eventos para este filtro.',
};

const ICONOS: Record<TraceNivel, string> = { debug: 'mdi:bug-outline', info: 'mdi:information-outline', warn: 'mdi:alert-outline', error: 'mdi:alert-circle-outline' };

/** `1234` → `1,2 s`; menos de un segundo, en ms. */
export function formatoMs(ms: number): string {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toLocaleString(undefined, { maximumFractionDigits: 1 })} s`;
}

/** Eventos que pasan el filtro: `warn` incluye errores; `info` excluye `debug`. */
export function filtrarEventos(eventos: readonly TraceEvento[], filtro: TraceFiltro): TraceEvento[] {
  if (filtro === 'todo') return [...eventos];
  if (filtro === 'error') return eventos.filter((e) => e.nivel === 'error');
  if (filtro === 'warn') return eventos.filter((e) => e.nivel === 'warn' || e.nivel === 'error');
  return eventos.filter((e) => e.nivel !== 'debug');
}

class IswcTraceLog extends PropsElement<TraceLogProps> {
  static override tag = 'iswc-trace-log';
  static override css = css;
  static override deps = ['iswc-badge', 'iswc-icon'];
  static override observed = atributosDe(INICIAL);

  #root: ShadowRoot;
  #abierto = false;
  #filtro: TraceFiltro = 'todo';
  #iniciada = false;

  constructor() {
    super(INICIAL, TraceLogPropsSchema.partial());
    this.#root = this.shadowRoot!;
  }

  /** Si está desplegada (quien repinte alrededor la puede conservar). */
  get abierta(): boolean { return this.#abierto; }

  #boton(clase: string, attrs: Record<string, string>, alPulsar: () => void, ...hijos: (Node | string)[]): HTMLElement {
    const b = crearNodo('button', { type: 'button', class: clase, ...attrs }, ...hijos);
    b.addEventListener('click', alPulsar);
    return b;
  }

  #fila(e: TraceEvento, marcado: boolean, t: TraceTextos): HTMLElement {
    return crearNodo(
      'li',
      { class: 'evento', 'data-nivel': e.nivel, 'data-etapa': e.etapa, 'data-ultimo': marcado },
      crearNodo('span', { class: 'ms' }, `+${formatoMs(e.ms)}`),
      crearNodo('iswc-icon', { class: 'nivel', icon: ICONOS[e.nivel], title: e.nivel }),
      crearNodo('span', { class: 'etapa' }, e.etapa),
      crearNodo('span', { class: 'mensaje' }, e.mensaje),
      e.dur !== undefined && crearNodo('span', { class: 'dur' }, formatoMs(e.dur)),
      e.datos !== undefined && crearNodo('details', { class: 'datos' }, crearNodo('summary', {}, t.datos), crearNodo('pre', {}, JSON.stringify(e.datos, null, 2))),
    );
  }

  #cuerpo(t: TraceTextos, ultimo: number | undefined): Node[] {
    const { eventos, enVivo } = this.props;
    const filtros: Array<[TraceFiltro, string]> = [['todo', t.todo], ['info', t.info], ['warn', t.warn], ['error', t.soloErrores]];
    const copiar = (): void => {
      const json = JSON.stringify(eventos, null, 2);
      void copyText(json);
      emit(this, 'iswc-trace-copy', { json });
    };
    const barra = crearNodo(
      'div',
      { class: 'barra', part: 'barra' },
      crearNodo('div', { class: 'filtros', role: 'group', 'aria-label': t.filtrar }, ...filtros.map(([id, rotulo]) => this.#boton('filtro', { 'aria-pressed': String(this.#filtro === id) }, () => { this.#filtro = id; this.#render(); }, rotulo))),
      this.#boton('copiar', { 'aria-label': t.copiar }, copiar, crearNodo('iswc-icon', { icon: 'mdi:content-copy' }), 'JSON'),
    );
    const visibles = filtrarEventos(eventos, this.#filtro);
    const filas = visibles.length ? visibles.map((e) => this.#fila(e, enVivo && e.seq === ultimo, t)) : [crearNodo('li', { class: 'vacio' }, t.vacio)];
    return [barra, crearNodo('ol', { class: 'eventos', part: 'eventos', 'aria-label': t.listado }, ...filas)];
  }

  #render(): void {
    const { eventos, titulo, enVivo, textos } = this.props;
    const t: TraceTextos = { ...TEXTOS, ...textos };
    const avisos = eventos.filter((e) => e.nivel === 'warn').length;
    const errores = eventos.filter((e) => e.nivel === 'error').length;
    const estado = errores ? 'error' : avisos ? 'warn' : 'ok';
    const cabecera = this.#boton(
      'cabecera',
      { part: 'cabecera', 'aria-expanded': String(this.#abierto) },
      () => { this.#abierto = !this.#abierto; this.#render(); },
      crearNodo('iswc-icon', { icon: this.#abierto ? 'mdi:chevron-down' : 'mdi:chevron-right' }),
      crearNodo('span', { class: 'titulo' }, titulo),
      crearNodo('span', { class: 'resumen' }, `${eventos.length} ${eventos.length === 1 ? t.evento : t.eventos} · ${formatoMs(eventos.at(-1)?.ms ?? 0)}`),
    );
    if (avisos) cabecera.append(crearNodo('iswc-badge', { class: 'cuenta', color: 'warning' }, `${avisos} ${avisos === 1 ? t.aviso : t.avisos}`));
    if (errores) cabecera.append(crearNodo('iswc-badge', { class: 'cuenta', color: 'danger' }, `${errores} ${errores === 1 ? t.error : t.errores}`));
    if (enVivo) cabecera.append(crearNodo('span', { class: 'vivo' }, t.enVivo));
    const seccion = crearNodo('section', { class: 'traza', part: 'traza', 'data-estado': estado }, cabecera);
    if (this.#abierto) seccion.append(...this.#cuerpo(t, eventos.at(-1)?.seq));
    this.#root.replaceChildren(seccion);
  }

  protected override pintar(previos: TraceLogProps): void {
    const { filtro, abierto, enVivo } = this.props;
    if (!this.#iniciada || filtro !== previos.filtro) this.#filtro = filtro;
    this.#iniciada = true;
    if (abierto || enVivo) this.#abierto = true;
    this.#render();
  }
}

define(IswcTraceLog, 'IswcTraceLog');
