// @contexto INDICE.md · tests/_shared/README.md
// core-f8.ts — casos en página de IswcReactive, html, IswcFormControl, localize, PropsElement y capas (F8).
// Lo corre tests/navegador/core-f8.test.ts en Edge headless; cada caso devuelve `true` o el motivo del fallo.
import { define } from '@jeff-aporta/iswc-base/core/iswc-element.js';
import { IswcReactive, prop, state, watch } from '@jeff-aporta/iswc-base/core/iswc-reactive.js';
import { html, render, repetir, svg } from '@jeff-aporta/iswc-base/core/plantilla.js';
import { IswcFormControl } from '@jeff-aporta/iswc-base/core/iswc-form-control.js';
import { PropsElement } from '@jeff-aporta/iswc-base/core/props-element.js';
import { formato, registrarTerminos, resolverLocale } from '@jeff-aporta/iswc-base/core/localize.js';
import { abrirCapaModal, cerrarCapaModal, createPopupDismiss } from '@jeff-aporta/iswc-base/core/position.js';

const espera = () => new Promise((r) => setTimeout(r, 0));
const fallo = (msg: string, ...vals: unknown[]) => `${msg} ${vals.map((v) => JSON.stringify(v)).join(' ')}`;

class BaseF8 extends IswcReactive {
  @prop() accessor label = '';
  @prop({ type: 'bool' }) accessor open = false;
}

class F8Uno extends BaseF8 {
  static override tag = 'f8-uno';
  @prop({ enum: ['a', 'b'] }) accessor modo = 'a';
  @prop({ type: 'num' }) accessor max: number | null = null;
  @prop({ attr: 'prefix' }) accessor prefixText = '';
  @prop({ reflect: false }) accessor quieto = '';
  @prop({ vacio: true }) accessor texto = 'x';
  @state() accessor cuenta = 0;
  pintados = 0;
  vistos: [unknown, unknown][] = [];
  clics = 0;

  @watch('label')
  alCambiarLabel(antes: unknown, ahora: unknown): void {
    this.vistos.push([antes, ahora]);
  }

  #clic(this: F8Uno): void {
    this.clics++;
  }

  override render() {
    this.pintados++;
    return html`<p id="p" class=${this.modo} ?hidden=${!this.open} data-max=${this.max}>${this.label}</p>
      <button id="b" @click=${this.#clic}>${this.cuenta}</button>`;
  }
}
define(F8Uno);

class F8Dos extends BaseF8 {
  static override tag = 'f8-dos';
}
define(F8Dos);

class F8Form extends IswcFormControl {
  static override tag = 'f8-form';
  @prop({ reflect: false, vacio: true }) accessor value = '';
  override valorFormulario() { return this.value || null; }
  override restablecer(): void { this.value = this.defaultValue; }
  override get controlNativo() { return this.shadowRoot!.querySelector('input'); }
  override render() { return html`<input id="input" .value=${this.value} ?disabled=${this.inhabilitado}>`; }
}
define(F8Form);

class F8Props extends PropsElement<{ titulo: string }> {
  static override tag = 'f8-props';
  static override observed = ['titulo'];
  pintados = 0;
  constructor() { super({ titulo: '' }, { safeParse: (v: unknown) => ({ success: true as const, data: v }) }); }
  protected pintar(): void {
    this.pintados++;
    this.shadowRoot!.textContent = this.props.titulo;
  }
}
define(F8Props);

class F8Idioma extends IswcReactive {
  static override tag = 'f8-idioma';
  override render() { return html`<span>${this.t('cerrar')}</span>`; }
}
define(F8Idioma);

const nuevo = <T extends HTMLElement>(tag: string): T => {
  const el = document.createElement(tag) as T;
  document.body.append(el);
  return el;
};

(globalThis as Record<string, unknown>).__casos = {
  async 'prop: atributo ↔ propiedad, enum, num, bool, attr propio'() {
    const el = nuevo<F8Uno>('f8-uno');
    el.setAttribute('modo', 'zzz');
    if (el.modo !== 'a') return fallo('enum inválido no cae al defecto', el.modo);
    el.modo = 'b';
    if (el.getAttribute('modo') !== 'b') return fallo('enum no refleja', el.getAttribute('modo'));
    el.setAttribute('max', '7');
    if (el.max !== 7) return fallo('num desde atributo', el.max);
    el.open = true;
    if (!el.hasAttribute('open')) return 'bool no refleja';
    el.removeAttribute('open');
    if (el.open) return 'bool no lee la ausencia';
    el.prefixText = 'kg';
    if (el.getAttribute('prefix') !== 'kg') return fallo('attr propio', el.getAttribute('prefix'));
    el.quieto = 'z';
    if (el.hasAttribute('quieto')) return 'reflect:false escribió el atributo';
    el.label = '';
    if (el.hasAttribute('label')) return 'texto vacío debió quitar el atributo';
    el.texto = '';
    if (el.getAttribute('texto') !== '') return 'vacio:true debió conservar x=""';
    el.remove();
    return true;
  },

  async 'prop: observedAttributes incluye lo heredado en cada subclase'() {
    const uno = (customElements.get('f8-uno') as unknown as { observedAttributes: string[] }).observedAttributes;
    const dos = (customElements.get('f8-dos') as unknown as { observedAttributes: string[] }).observedAttributes;
    for (const a of ['label', 'open']) if (!uno.includes(a) || !dos.includes(a)) return fallo('falta', a, uno, dos);
    if (!uno.includes('prefix') || uno.includes('prefix-text')) return fallo('attr propio', uno);
    if (dos.includes('modo')) return 'f8-dos hereda un atributo de su hermana';
    return true;
  },

  async 'render: primer pintado síncrono al conectar y coalescido después'() {
    const el = document.createElement('f8-uno') as F8Uno;
    el.label = 'antes';
    document.body.append(el);
    const p = el.shadowRoot!.getElementById('p');
    if (p?.textContent !== 'antes') return fallo('primer pintado no síncrono', p?.textContent);
    const base = el.pintados;
    for (let i = 0; i < 100; i++) el.label = `v${i}`;
    if (el.pintados !== base) return 'pintó en síncrono tras conectar';
    await el.actualizacionCompleta;
    if (el.pintados !== base + 1) return fallo('100 escrituras no coalescieron', el.pintados - base);
    if (p.textContent !== 'v99') return fallo('texto final', p.textContent);
    el.label = 'ya';
    el.actualizarAhora();
    if (p.textContent !== 'ya') return 'actualizarAhora no vació la cola';
    el.remove();
    return true;
  },

  async 'render: partes de atributo, ?bool, evento con this y nodo estable'() {
    const el = nuevo<F8Uno>('f8-uno');
    const p = el.shadowRoot!.getElementById('p')!;
    if (!p.hidden) return 'open=false debió poner hidden';
    if (p.hasAttribute('data-max')) return 'null debió quitar el atributo';
    el.open = true;
    el.max = 3;
    el.modo = 'b';
    await el.actualizacionCompleta;
    if (p.hidden || p.getAttribute('data-max') !== '3' || p.className !== 'b') return fallo('partes', p.outerHTML);
    if (el.shadowRoot!.getElementById('p') !== p) return 'el nodo se recreó';
    el.shadowRoot!.getElementById('b')!.click();
    if (el.clics !== 1) return 'el evento no llamó al método con this';
    el.cuenta = 5;
    await el.actualizacionCompleta;
    if (el.shadowRoot!.getElementById('b')!.textContent !== '5') return '@state no repintó';
    el.remove();
    return true;
  },

  async 'watch: (antes, ahora) una vez por ciclo'() {
    const el = document.createElement('f8-uno') as F8Uno;
    document.body.append(el);
    el.vistos.length = 0;
    el.label = 'a';
    el.label = 'b';
    await el.actualizacionCompleta;
    if (JSON.stringify(el.vistos) !== JSON.stringify([['', 'b']])) return fallo('vigía', el.vistos);
    el.remove();
    return true;
  },

  async 'upgrade: propiedad escrita antes de definir el tag'() {
    const el = document.createElement('f8-tarde') as HTMLElement & { label: string };
    el.label = 'temprano';
    document.body.append(el);
    class F8Tarde extends IswcReactive {
      static override tag = 'f8-tarde';
      @prop() accessor label = '';
      override render() { return html`<i>${this.label}</i>`; }
    }
    define(F8Tarde);
    const i = el.shadowRoot?.querySelector('i');
    if (i?.textContent !== 'temprano') return fallo('no recuperó la propiedad', i?.textContent);
    if (el.getAttribute('label') !== 'temprano') return 'no reflejó al conectar';
    el.remove();
    return true;
  },

  async 'html: plantilla anidada, lista por índice y repetir con clave'() {
    const raiz = document.createElement('div');
    const vista = (n: number, a: boolean) => html`<ul>${a ? html`<li class="a">A${n}</li>` : html`<li class="b">B</li>`}</ul>`;
    render(vista(1, true), raiz);
    const ul = raiz.querySelector('ul');
    render(vista(2, true), raiz);
    if (raiz.querySelector('ul') !== ul || raiz.textContent !== 'A2') return fallo('anidada', raiz.innerHTML);
    render(vista(2, false), raiz);
    if (raiz.textContent !== 'B') return fallo('cambio de literal', raiz.innerHTML);
    const lista = (xs: number[]) => html`<ol>${xs.map((x) => html`<li>${x}</li>`)}</ol>`;
    render(lista([1, 2, 3]), raiz);
    render(lista([1, 2]), raiz);
    if (raiz.querySelectorAll('li').length !== 2) return fallo('lista', raiz.innerHTML);
    const items = [{ id: 'x' }, { id: 'y' }, { id: 'z' }];
    const rep = (xs: { id: string }[]) => html`<ol>${repetir(xs, (x) => x.id, (x) => html`<li data-id=${x.id}>${x.id}</li>`)}</ol>`;
    render(rep(items), raiz);
    const y = raiz.querySelector('[data-id="y"]');
    render(rep([items[2]!, items[1]!, items[0]!]), raiz);
    const orden = [...raiz.querySelectorAll('li')].map((li) => li.textContent).join('');
    if (orden !== 'zyx') return fallo('orden', orden);
    if (raiz.querySelector('[data-id="y"]') !== y) return 'repetir recreó un ítem que solo se movió';
    render(rep([items[0]!]), raiz);
    if (raiz.querySelectorAll('li').length !== 1) return fallo('quitar ítems', raiz.innerHTML);
    return true;
  },

  async 'html: svg suelto, propiedad .x y rechazo de atributo parcial'() {
    const raiz = document.createElement('div');
    render(html`<svg viewBox="0 0 10 10">${svg`<circle r=${4} cx="5" cy="5"></circle>`}</svg>`, raiz);
    const c = raiz.querySelector('circle');
    if (!(c instanceof SVGElement) || c.getAttribute('r') !== '4') return fallo('svg', raiz.innerHTML);
    render(html`<input .value=${'hola'}>`, raiz);
    if (raiz.querySelector('input')!.value !== 'hola') return '.value no llegó';
    try {
      render(html`<p class="a ${'b'}"></p>`, raiz);
      return 'aceptó un valor parcial de atributo';
    } catch {
      return true;
    }
  },

  async 'estado: :state() en el host'() {
    const el = nuevo<F8Uno>('f8-uno');
    el.estado('abierto', true);
    if (!el.matches(':state(abierto)')) return ':state(abierto) no aplica';
    el.estado('abierto', false);
    if (el.matches(':state(abierto)')) return 'no se quitó el estado';
    el.remove();
    return true;
  },

  async 'localize: t() por idioma heredado y repinta al cambiar <html lang>'() {
    const caja = document.createElement('section');
    document.body.append(caja);
    const el = document.createElement('f8-idioma') as F8Idioma;
    caja.append(el);
    const texto = () => el.shadowRoot!.querySelector('span')!.textContent;
    if (texto() !== 'Cerrar') return fallo('es', texto());
    caja.setAttribute('lang', 'en');
    el.solicitarRender();
    await el.actualizacionCompleta;
    for (let i = 0; i < 50 && texto() !== 'Close'; i++) await new Promise((r) => setTimeout(r, 20));
    if (texto() !== 'Close') return fallo('en por ancestro (diccionario perezoso)', texto());
    caja.removeAttribute('lang');
    document.documentElement.lang = 'es';
    await espera();
    if (texto() !== 'Cerrar') return fallo('vuelta a es', texto());
    registrarTerminos('es', { cerrar: 'Cerrar ya' });
    await espera();
    if (texto() !== 'Cerrar ya') return fallo('registrarTerminos no repintó', texto());
    registrarTerminos('es', { cerrar: 'Cerrar' });
    if (resolverLocale(null, ' fr ') !== 'fr') return 'el explícito no ganó';
    if (formato('number', 'es') !== formato('number', 'es')) return 'Intl no memorizado';
    caja.remove();
    return true;
  },

  async 'form-control: FormData, required, reset, fieldset y user-invalid'() {
    const form = document.createElement('form');
    const fs = document.createElement('fieldset');
    const el = document.createElement('f8-form') as F8Form;
    el.setAttribute('name', 'campo');
    el.setAttribute('value', 'ini');
    el.required = true;
    fs.append(el);
    form.append(fs);
    document.body.append(form);
    if (new FormData(form).get('campo') !== 'ini') return fallo('valor inicial', new FormData(form).get('campo'));
    el.value = '';
    if (el.checkValidity()) return 'required vacío debió ser inválido';
    if (el.validity?.valueMissing !== true) return 'valueMissing en el setter';
    if (el.matches(':state(user-invalid)')) return 'user-invalid antes de interactuar';
    el.reportValidity();
    if (!el.matches(':state(user-invalid)')) return 'user-invalid tras reportValidity';
    el.value = 'ok';
    if (!el.checkValidity() || !el.matches(':state(user-valid)')) return 'user-valid tras corregir';
    form.reset();
    if (el.value !== 'ini' || el.matches(':state(user-valid)')) return fallo('reset', el.value);
    fs.disabled = true;
    await espera();
    if (!el.inhabilitado || !el.matches(':state(disabled)')) return 'fieldset disabled';
    fs.disabled = false;
    el.setCustomValidity('mal');
    if (el.validationMessage !== 'mal') return 'setCustomValidity';
    el.setCustomValidity('');
    form.remove();
    return true;
  },

  async 'form-control: aria-invalid solo tras interactuar y aria-required en el control nativo'() {
    const el = document.createElement('f8-form') as F8Form;
    el.required = true;
    document.body.append(el);
    const input = el.shadowRoot!.querySelector('input')!;
    if (input.hasAttribute('aria-invalid')) return 'aria-invalid antes de interactuar';
    if (input.getAttribute('aria-required') !== 'true') return 'aria-required';
    el.reportValidity();
    if (input.getAttribute('aria-invalid') !== 'true') return 'aria-invalid tras reportValidity';
    el.value = 'abc';
    if (input.hasAttribute('aria-invalid')) return 'aria-invalid tras corregir';
    el.remove();
    return true;
  },

  async 'props-element: pinta en síncrono y una vez por cambio'() {
    const el = nuevo<F8Props>('f8-props');
    const base = el.pintados;
    el.props = { titulo: 'uno' };
    if (el.shadowRoot!.textContent !== 'uno') return 'props no pintó en síncrono';
    el.props = { titulo: 'uno' };
    if (el.pintados !== base + 1) return fallo('repintó sin cambios', el.pintados - base);
    await espera();
    if (el.pintados !== base + 1) return 'doble pintado tras la microtarea';
    el.remove();
    return true;
  },

  async 'capas: inert, Escape solo arriba, foco devuelto'() {
    const fuera = document.createElement('button');
    fuera.textContent = 'fuera';
    const modal = document.createElement('div');
    modal.innerHTML = '<button id="m1">uno</button><button id="m2">dos</button>';
    document.body.append(fuera, modal);
    fuera.focus();
    let cerrado = '';
    abrirCapaModal(modal, { cerrar: (o) => { cerrado = o; } });
    if (!fuera.hasAttribute('inert')) return 'no inertizó al hermano';
    if (document.activeElement?.id !== 'm1') return fallo('foco inicial', document.activeElement?.id);
    const popup = document.createElement('div');
    modal.append(popup);
    let popupCerrado = false;
    const d = createPopupDismiss(popup, { onEscape: () => { popupCerrado = true; } });
    d.attach();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    if (!popupCerrado || cerrado) return fallo('Escape debió cerrar solo el popup', popupCerrado, cerrado);
    d.detach();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    if (cerrado !== 'escape') return 'Escape no llegó al modal';
    cerrarCapaModal(modal);
    if (fuera.hasAttribute('inert')) return 'no quitó el inert';
    if (document.activeElement !== fuera) return 'no devolvió el foco';
    fuera.remove();
    modal.remove();
    return true;
  },

  async 'capas: un modal dentro de un shadow root también aísla la página; inertizar:false no'() {
    const fuera = document.createElement('button');
    const anfitrion = document.createElement('div');
    const vecino = document.createElement('p');
    const modal = document.createElement('div');
    modal.innerHTML = '<button>dentro</button>';
    anfitrion.attachShadow({ mode: 'open' }).append(vecino, modal);
    document.body.append(fuera, anfitrion);
    abrirCapaModal(modal, { cerrar: () => {} });
    if (!fuera.hasAttribute('inert') || !vecino.hasAttribute('inert')) return fallo('no cruzó el shadow', fuera.hasAttribute('inert'), vecino.hasAttribute('inert'));
    cerrarCapaModal(modal);
    if (fuera.hasAttribute('inert') || vecino.hasAttribute('inert')) return 'no quitó el inert';
    abrirCapaModal(modal, { cerrar: () => {}, inertizar: false });
    if (fuera.hasAttribute('inert')) return 'inertizar:false puso inert';
    cerrarCapaModal(modal);
    fuera.remove();
    anfitrion.remove();
    return true;
  },
};
