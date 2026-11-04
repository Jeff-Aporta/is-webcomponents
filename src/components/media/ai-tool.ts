import { adoptCss, defineElement, emit } from '@jeff-aporta/iswc-base/core/element.js';
import { crearNodo } from '@jeff-aporta/iswc-base/core/dom-utils.js';
import { atributosDe, PropsElement } from '@jeff-aporta/iswc-base/core/props-element.js';
import { pospuesta } from '@jeff-aporta/iswc-base/ai/descarga.js';
import { herramienta, mbDe, pesoDe } from '@jeff-aporta/iswc-base/ai/herramientas.js';
import { ejecutar } from '@jeff-aporta/iswc-base/ai/motores.js';
import type { Caja, Entrada, Herramienta, Opcion, Opciones, Salida } from '@jeff-aporta/iswc-base/ai/schemas/ai.schemas.js';
import { AiToolPropsSchema } from './schemas/ai-tool.schemas.js';
import type { AiCampo, AiToolErrorDetalle, AiToolProps, AiToolResultadoDetalle, AiZona } from './schemas/ai-tool.schemas.js';
import '@jeff-aporta/iswc-base/components/actions/button.js';
import '@jeff-aporta/iswc-base/components/actions/copy-button.js';
import '@jeff-aporta/iswc-base/components/feedback/progress-bar.js';
import '@jeff-aporta/iswc-base/components/feedback/tag.js';
import '@jeff-aporta/iswc-base/components/forms/dropzone.js';
import '@jeff-aporta/iswc-base/components/forms/input.js';
import '@jeff-aporta/iswc-base/components/forms/option.js';
import '@jeff-aporta/iswc-base/components/forms/select.js';
import '@jeff-aporta/iswc-base/components/forms/textarea.js';
import '@jeff-aporta/iswc-base/components/layout/callout.js';
import './icon.js';
import './media-recorder.js';

/**
 * <iswc-ai-tool> — una herramienta de IA que corre en el navegador: recibe una imagen, un audio o un texto, baja su modelo
 * la primera vez y muestra el resultado. Nada sale del equipo. Sin UI, lo mismo se usa con `ejecutar()` de `ai/motores`.
 *
 * Eventos: `iswc-ai-result { herramienta, salida, entrada }`, `iswc-ai-error { herramienta, mensaje }`.
 * Métodos: `ejecutar()`.
 * CSS parts: herramienta, resultado.
 */

const INICIAL: AiToolProps = { herramienta: 'ocr', texto: '', variant: 'plain' };

const porcentaje = (n: number): string => `${Math.round(n * 100)} %`;

/** Frase para la persona; el detalle técnico queda en consola. */
const motivo = (err: unknown): string => {
  const m = err instanceof Error ? err.message : String(err);
  console.error('[iswc-ai-tool]', err);
  if (/fetch|network|load failed|importing a module/i.test(m)) return 'No se pudo descargar el modelo. Revisa la conexión e inténtalo de nuevo.';
  if (/memory|allocation|out of bounds/i.test(m)) return 'Este equipo se quedó sin memoria para el modelo. Cierra otras pestañas o prueba una herramienta más liviana.';
  return 'El modelo falló en este navegador. El detalle está en la consola.';
};

const campoDeOpcion = (o: Opcion): HTMLElement => (o.valores
  ? crearNodo('iswc-select', { class: 'opcion', 'data-id': o.id, label: o.rotulo, value: o.defecto }, ...Object.entries(o.valores).map(([v, r]) => crearNodo('iswc-option', { value: v }, r)))
  : crearNodo('iswc-input', { class: 'opcion', 'data-id': o.id, label: o.rotulo, value: o.defecto }));

const aviso = (color: string, texto: string): HTMLElement => crearNodo('iswc-callout', { color }, texto);

class IswcAiTool extends PropsElement<AiToolProps> {
  static override get observedAttributes(): string[] { return atributosDe(INICIAL); }

  #root: ShadowRoot;
  #caja: HTMLElement | null = null;
  #pintada = '';
  #urls: string[] = [];
  #grabado: Blob | null = null;
  #ocupada = false;
  #h: Herramienta = herramienta('');

  constructor() {
    super(INICIAL, AiToolPropsSchema.partial());
    this.#root = this.attachShadow({ mode: 'open' });
    adoptCss(this.#root, import.meta.url);
  }

  override onDisconnected(): void {
    this.#soltarUrls();
  }

  #soltarUrls(): void {
    for (const u of this.#urls) URL.revokeObjectURL(u);
    this.#urls = [];
  }

  #url(blob: Blob): string {
    const u = URL.createObjectURL(blob);
    this.#urls.push(u);
    return u;
  }

  #q<T extends Element>(selector: string): T {
    return this.#caja!.querySelector(selector) as T;
  }

  #opciones(): Opciones {
    return Object.fromEntries([...this.#caja!.querySelectorAll<AiCampo>('.opcion')].map((c) => [c.dataset['id']!, c.value]));
  }

  #entrada(): Entrada | null {
    if (this.#h.entrada === 'texto') return this.#q<AiCampo>('.entrada').value.trim() || null;
    return this.#q<AiZona>('.entrada').files.at(-1)?.file ?? this.#grabado;
  }

  #rotular(): void {
    this.#q<HTMLElement>('.peso').textContent = pesoDe(mbDe(this.#h, this.#opciones()));
  }

  #fallar(mensaje: string): void {
    const error = this.#q<HTMLElement>('.error');
    error.textContent = mensaje;
    error.hidden = false;
  }

  /** `rotulo` falta en el OCR: la línea ya se lee en la imagen y en el texto de abajo. */
  #marca(c: Caja, rotulo: boolean): HTMLElement {
    const marca = crearNodo('span', { class: 'caja', title: `${c.etiqueta} · ${porcentaje(c.puntaje)}` }, rotulo ? crearNodo('b', {}, c.etiqueta) : null);
    marca.style.cssText = `left:${c.xmin * 100}%;top:${c.ymin * 100}%;width:${(c.xmax - c.xmin) * 100}%;height:${(c.ymax - c.ymin) * 100}%`;
    return marca;
  }

  #bajar(blob: Blob, nombre: string): HTMLElement {
    return crearNodo('iswc-button', { class: 'bajar', variant: 'plain', color: 'brand', href: this.#url(blob), download: nombre }, crearNodo('iswc-icon', { slot: 'start', icon: 'mdi:download' }), 'Descargar');
  }

  #texto(t: string, copiar: boolean): HTMLElement {
    return crearNodo('div', { class: 'texto' }, crearNodo('p', {}, t), copiar ? crearNodo('iswc-copy-button', { value: t }) : null);
  }

  #pintarSalida(s: Salida, e: Entrada): void {
    const h = this.#h;
    const lista: HTMLElement[] = [];
    if (s.cajas && e instanceof Blob) lista.push(crearNodo('figure', { class: 'lienzo' }, crearNodo('img', { src: this.#url(e), alt: '' }), ...s.cajas.map((c) => this.#marca(c, !s.texto))));
    if (s.imagen) lista.push(crearNodo('figure', { class: 'lienzo transparente' }, crearNodo('img', { src: this.#url(s.imagen), alt: `Resultado: ${h.nombre}` })), this.#bajar(s.imagen, `${h.id}.png`));
    if (s.audio) lista.push(crearNodo('audio', { controls: true, src: this.#url(s.audio) }), this.#bajar(s.audio, `${h.id}.wav`));
    if (s.barras?.length) {
      lista.push(crearNodo('ul', { class: 'barras' }, ...s.barras.map((b) => crearNodo('li', {}, crearNodo('span', { title: b.etiqueta }, b.etiqueta), crearNodo('b', {}, porcentaje(b.valor)), crearNodo('iswc-progress-bar', { value: Math.round(Math.max(0, b.valor) * 100), label: b.etiqueta })))));
    }
    if (s.texto != null) lista.push(this.#texto(s.texto, true));
    if (s.barras?.length === 0 || (s.cajas && !s.texto && !s.cajas.length)) lista.push(crearNodo('p', { class: 'nada' }, 'No se encontró nada.'));
    this.#q<HTMLElement>('.resultado').replaceChildren(...lista);
  }

  /** Corre la herramienta con lo que hay en sus campos. No hace nada si ya está corriendo. */
  async ejecutar(): Promise<Salida | null> {
    if (this.#ocupada) return null;
    const h = this.#h;
    const e = this.#entrada();
    if (!e) {
      this.#fallar(h.entrada === 'texto' ? 'Escribe un texto primero.' : `Agrega ${h.entrada === 'imagen' ? 'una imagen' : 'un audio'} primero.`);
      return null;
    }
    const caja = this.#caja!;
    const boton = this.#q<HTMLElement>('.correr');
    const estado = this.#q<HTMLElement>('.estado');
    const resultado = this.#q<HTMLElement>('.resultado');
    this.#q<HTMLElement>('.error').hidden = true;
    this.#ocupada = true;
    boton.toggleAttribute('loading', true);
    resultado.replaceChildren();
    this.#soltarUrls();
    const inicio = performance.now();
    let salida: Salida | null = null;
    try {
      estado.textContent = 'Procesando…';
      salida = await ejecutar(h, e, this.#opciones(), (t) => resultado.replaceChildren(this.#texto(t, false)));
      // Cambiaron de herramienta a mitad: el resultado ya no tiene dónde pintarse, pero el evento sí vale.
      if (caja === this.#caja) {
        this.#pintarSalida(salida, e);
        estado.textContent = `Listo en ${((performance.now() - inicio) / 1000).toFixed(1)} s`;
      }
      emit<AiToolResultadoDetalle>(this, 'iswc-ai-result', { herramienta: h.id, salida, entrada: e });
    } catch (err) {
      estado.textContent = '';
      if (!pospuesta(err)) {
        const mensaje = motivo(err);
        if (caja === this.#caja) this.#fallar(mensaje);
        emit<AiToolErrorDetalle>(this, 'iswc-ai-error', { herramienta: h.id, mensaje });
      }
    }
    this.#ocupada = false;
    boton.toggleAttribute('loading', false);
    if (caja === this.#caja) this.#rotular();
    return salida;
  }

  #construir(h: Herramienta, texto: string): HTMLElement {
    const sinGpu = h.gpu && !('gpu' in navigator);
    const caja = crearNodo('section', { class: 'ia', part: 'herramienta', 'data-entrada': h.entrada },
      crearNodo('header', {},
        crearNodo('iswc-icon', { class: 'icono', icon: h.icono }),
        crearNodo('div', { class: 'titulo' }, crearNodo('strong', {}, h.nombre), crearNodo('p', {}, h.descripcion)),
        crearNodo('iswc-tag', { class: 'peso' })),
      h.entrada === 'texto'
        ? crearNodo('iswc-textarea', { class: 'entrada', rows: 4, 'aria-label': h.nombre, value: texto || h.ejemplo || '' })
        : crearNodo('iswc-dropzone', { class: 'entrada', 'max-files': 1, accept: h.entrada === 'imagen' ? 'image/*' : 'audio/*,video/webm' }),
      h.entrada === 'audio' ? crearNodo('iswc-media-recorder', { class: 'grabar', source: 'mic' }) : null,
      h.opciones?.length ? crearNodo('div', { class: 'opciones' }, ...h.opciones.map(campoDeOpcion)) : null,
      h.aviso ? aviso('brand', h.aviso) : null,
      sinGpu ? aviso('warning', 'Este navegador no tiene WebGPU, que esta herramienta necesita.') : null,
      crearNodo('div', { class: 'accion' },
        crearNodo('iswc-button', { class: 'correr', color: 'brand', disabled: !!sinGpu }, 'Ejecutar'),
        crearNodo('span', { class: 'estado', role: 'status' })),
      crearNodo('iswc-callout', { class: 'error', color: 'danger', hidden: true }),
      crearNodo('div', { class: 'resultado', part: 'resultado', 'aria-live': 'polite' }));
    caja.querySelector('.opciones')?.addEventListener('iswc-change', () => this.#rotular());
    caja.querySelector('.grabar')?.addEventListener('iswc-stop', (e) => {
      this.#grabado = (e as CustomEvent<{ blob: Blob }>).detail.blob;
    });
    caja.querySelector('.correr')!.addEventListener('iswc-click', () => void this.ejecutar());
    return caja;
  }

  protected override pintar(): void {
    const { herramienta: id, texto, variant } = this.props;
    const firma = `${id}\n${texto}`;
    if (this.#caja && firma !== this.#pintada) {
      this.#caja.remove();
      this.#caja = null;
    }
    if (!this.#caja) {
      this.#soltarUrls();
      this.#grabado = null;
      this.#h = herramienta(id);
      this.#pintada = firma;
      this.#caja = this.#construir(this.#h, texto);
      this.#root.append(this.#caja);
      this.#rotular();
    }
    this.#caja.dataset['variant'] = variant;
  }
}

defineElement('iswc-ai-tool', IswcAiTool, 'IswcAiTool');
