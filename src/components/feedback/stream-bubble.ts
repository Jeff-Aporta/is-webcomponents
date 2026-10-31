import { adoptCss, defineElement } from '../../core/element.js';
import { crearNodo, escapeHtml } from '../../core/dom-utils.js';
import { atributosDe, PropsElement } from '../../core/props-element.js';
import { StreamBubblePropsSchema } from './schemas/stream-bubble.schemas.js';
import type { StreamBubblePaso, StreamBubbleProps, StreamBubbleTextos } from './schemas/stream-bubble.schemas.js';

/**
 * <iswc-stream-bubble> — burbuja de una respuesta que llega por partes: estado (`idle`, `streaming`, `end`, `error`), pasos
 * previos, escritura letra a letra y markdown ligero. El texto se escapa antes de darle formato: es seguro pintar lo
 * que llegue de un modelo.
 *
 * CSS parts: bubble, avatar, estado, nombre, progreso, texto.
 */

const INICIAL: StreamBubbleProps = { text: '', state: 'idle', animated: false, progress: [], name: '', avatar: '', textos: {} };
const TEXTOS: StreamBubbleTextos = { idle: 'en espera', streaming: 'respondiendo', end: 'listo', error: 'error', esperando: '(esperando turno)', pensando: 'pensando', sinDetalle: 'error sin detalle' };

const TEMPLATE = document.createElement('template');
TEMPLATE.innerHTML = /* html */ `
  <div class="bubble" part="bubble">
    <div class="avatar" part="avatar" aria-hidden="true" hidden></div>
    <div class="estado" part="estado"><span class="punto"></span><span class="rotulo"></span></div>
    <div class="nombre" part="nombre" hidden></div>
    <div class="progreso" part="progreso" hidden></div>
    <div class="texto" part="texto"></div>
  </div>
`;

/** Solo destinos seguros: un enlace de un texto generado nunca ejecuta código. */
const hrefSeguro = (href: string): string => (/^(https?:|mailto:|tel:|#|\/)/i.test(href) ? href : '#');

function enLinea(linea: string): string {
  return linea
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m: string, texto: string, href: string) => `<a href="${hrefSeguro(href)}" target="_blank" rel="noopener noreferrer">${texto}</a>`);
}

/** Markdown ligero: encabezados, listas, citas y formato en línea, sobre texto ya escapado. */
export function markdownLigero(texto: string): string {
  const salida: string[] = [];
  let lista: 'ul' | 'ol' | null = null;
  const cerrar = (): void => {
    if (lista) salida.push(`</${lista}>`);
    lista = null;
  };
  const item = (tipo: 'ul' | 'ol', contenido: string): void => {
    if (lista !== tipo) {
      cerrar();
      salida.push(`<${tipo}>`);
      lista = tipo;
    }
    salida.push(`<li>${enLinea(contenido)}</li>`);
  };
  for (const cruda of escapeHtml(texto).split('\n')) {
    const linea = cruda.trim();
    if (/^#{1,6}\s+/.test(linea)) {
      cerrar();
      salida.push(`<strong class="encabezado">${enLinea(linea.replace(/^#{1,6}\s+/, ''))}</strong>`);
    } else if (/^[-*]\s+/.test(linea)) item('ul', linea.replace(/^[-*]\s+/, ''));
    else if (/^\d+\.\s+/.test(linea)) item('ol', linea.replace(/^\d+\.\s+/, ''));
    else if (/^&gt;\s+/.test(linea)) {
      cerrar();
      salida.push(`<blockquote>${enLinea(linea.replace(/^&gt;\s+/, ''))}</blockquote>`);
    } else {
      cerrar();
      salida.push(linea ? enLinea(linea) : '<br/>');
    }
  }
  cerrar();
  return salida.join('\n');
}

class IswcStreamBubble extends PropsElement<StreamBubbleProps> {
  static override get observedAttributes(): string[] { return atributosDe(INICIAL); }

  #bubble: HTMLElement;
  #avatar: HTMLElement;
  #rotulo: HTMLElement;
  #nombre: HTMLElement;
  #progreso: HTMLElement;
  #texto: HTMLElement;
  #escritos = 0;
  #objetivo = '';
  #timer = 0;
  #pasos: StreamBubblePaso[] = [];

  constructor() {
    super(INICIAL, StreamBubblePropsSchema.partial());
    const shadow = this.attachShadow({ mode: 'open' });
    adoptCss(shadow, import.meta.url);
    shadow.appendChild(TEMPLATE.content.cloneNode(true));
    this.#bubble = shadow.querySelector<HTMLElement>('.bubble')!;
    this.#avatar = shadow.querySelector<HTMLElement>('.avatar')!;
    this.#rotulo = shadow.querySelector<HTMLElement>('.rotulo')!;
    this.#nombre = shadow.querySelector<HTMLElement>('.nombre')!;
    this.#progreso = shadow.querySelector<HTMLElement>('.progreso')!;
    this.#texto = shadow.querySelector<HTMLElement>('.texto')!;
  }

  override onDisconnected(): void {
    clearTimeout(this.#timer);
    this.#timer = 0;
  }

  get #t(): StreamBubbleTextos { return { ...TEXTOS, ...this.props.textos }; }

  /** Cuerpo de la burbuja: el texto con formato, o la marca de cada estado cuando aún no hay texto. */
  #cuerpo(texto: string): string {
    if (texto) return markdownLigero(texto);
    const { state } = this.props;
    const t = this.#t;
    if (state === 'streaming') return `<span class="espera" aria-label="${escapeHtml(t.pensando)}"><span></span><span></span><span></span></span>`;
    if (state === 'error') return `<em>${escapeHtml(t.sinDetalle)}</em>`;
    return state === 'idle' ? `<span class="aguarda">${escapeHtml(t.esperando)}</span>` : '';
  }

  /** Avanza más rápido cuanto más texto falta, para no quedarse atrás del stream. */
  #escribir = (): void => {
    const falta = this.#objetivo.length - this.#escritos;
    if (falta <= 0) {
      this.#timer = 0;
      this.#texto.innerHTML = this.#cuerpo(this.#objetivo);
      return;
    }
    this.#escritos = Math.min(this.#objetivo.length, this.#escritos + (falta > 50 ? 3 : 1));
    this.#texto.innerHTML = `${this.#cuerpo(this.#objetivo.slice(0, this.#escritos))}<span class="cursor" aria-hidden="true"></span>`;
    const espera = falta > 80 ? 6 : falta > 20 ? 14 : 30;
    this.#timer = window.setTimeout(() => requestAnimationFrame(this.#escribir), espera);
  };

  #pintarTexto(): void {
    const { text, state, animated } = this.props;
    if (state === 'streaming' && animated && text.length > this.#escritos) {
      this.#objetivo = text;
      if (!this.#timer) this.#escribir();
      return;
    }
    clearTimeout(this.#timer);
    this.#timer = 0;
    this.#objetivo = text;
    this.#escritos = text.length;
    this.#texto.innerHTML = this.#cuerpo(text);
  }

  /** Los pasos ya pintados no se recrean: su animación de entrada corre una sola vez. */
  #pintarProgreso(): void {
    const { progress, state } = this.props;
    const sellado = state === 'end' || state === 'error';
    if (sellado || progress.length === 0) {
      this.#pasos = [];
      this.#progreso.replaceChildren();
      this.#progreso.hidden = true;
      return;
    }
    this.#progreso.hidden = false;
    const mismoInicio = this.#pasos.length <= progress.length && this.#pasos.every((p, i) => p.texto === progress[i]?.texto && p.icono === progress[i]?.icono);
    if (!mismoInicio) {
      this.#pasos = [];
      this.#progreso.replaceChildren();
    }
    for (const p of progress.slice(this.#pasos.length)) {
      this.#progreso.append(crearNodo('div', { class: 'paso' }, crearNodo('span', { class: 'paso-icono' }, p.icono), crearNodo('span', { class: 'paso-texto' }, p.texto), crearNodo('span', { class: 'paso-pulso' })));
    }
    const pasos = [...this.#progreso.children];
    pasos.forEach((c, i) => c.classList.toggle('activo', i === pasos.length - 1));
    this.#pasos = progress;
  }

  protected override pintar(): void {
    const { state, name, avatar } = this.props;
    this.#bubble.dataset.state = state;
    this.#bubble.classList.toggle('con-avatar', Boolean(avatar));
    this.#avatar.hidden = !avatar;
    this.#avatar.textContent = avatar;
    this.#rotulo.textContent = this.#t[state];
    this.#nombre.hidden = !name;
    this.#nombre.textContent = name;
    this.#pintarProgreso();
    this.#pintarTexto();
  }
}

defineElement('iswc-stream-bubble', IswcStreamBubble, 'IswcStreamBubble');
