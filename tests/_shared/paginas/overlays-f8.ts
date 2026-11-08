// overlays-f8.ts — casos en página de los overlays sobre la pila de capas de core/position.ts (F8 hito 4,
// specs/paridad-webawesome.md HOW-5): dialog con un select abierto dentro, drawer, window modal y no modal, confirm-modal.
// Lo corre tests/navegador/overlays-f8.test.ts en Edge headless; cada caso devuelve `true` o el motivo del fallo.

// Import dinámico a propósito (ver textos-f8.ts): un `import '…'` de efecto puro sobre `src/` podría descartarse.
await Promise.all([
  import('@jeff-aporta/iswc-base/components/actions/button.js'),
  import('@jeff-aporta/iswc-base/components/layout/dialog.js'),
  import('@jeff-aporta/iswc-base/components/layout/drawer.js'),
  import('@jeff-aporta/iswc-base/components/overlays/window.js'),
  import('@jeff-aporta/iswc-base/components/feedback/confirm-modal.js'),
  import('@jeff-aporta/iswc-base/components/forms/select.js'),
  import('@jeff-aporta/iswc-base/components/forms/option.js'),
]);

type Modal = HTMLElement & { open: boolean; show(): Promise<void>; hide(): Promise<void> };
type Lista = HTMLElement & { open: boolean; show(): void };
type Ventana = HTMLElement & { minimize(): void; restore(): void };

const espera = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const fallo = (msg: string, ...vals: unknown[]) => `${msg} ${vals.map((v) => JSON.stringify(v)).join(' ')}`;

/** Elemento con el foco, atravesando shadow roots. */
function enfocado(): Element | null {
  let a = document.activeElement;
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
  return a;
}

/** Pulsa `key` sobre el elemento con el foco (keydown compuesto y cancelable, como el del teclado). */
function tecla(key: string, shiftKey = false): KeyboardEvent {
  const e = new KeyboardEvent('keydown', { key, shiftKey, bubbles: true, composed: true, cancelable: true });
  (enfocado() ?? document.body).dispatchEvent(e);
  return e;
}

/** ¿El foco está en `host` (su shadow o su light DOM)? */
function dentro(host: HTMLElement): boolean {
  const a = document.activeElement;
  return a === host || host.contains(a);
}

/** Monta en <body> un botón disparador, un párrafo de fondo y `overlay`; enfoca el disparador. */
function montar<T extends HTMLElement>(overlay: T): { disparador: HTMLButtonElement; fondo: HTMLElement; quitar: () => void } {
  const disparador = document.createElement('button');
  disparador.textContent = 'abrir';
  const fondo = document.createElement('p');
  fondo.textContent = 'fondo';
  document.body.append(disparador, fondo);
  disparador.focus();
  return { disparador, fondo, quitar: () => { disparador.remove(); fondo.remove(); overlay.remove(); } };
}

const inertes = (...els: Element[]) => els.every((el) => el.hasAttribute('inert'));
const libres = (...els: Element[]) => els.every((el) => !el.hasAttribute('inert'));

/** Tab desde el último enfocable da la vuelta dentro; Shift+Tab desde el primero vuelve al último. */
function trampa(host: HTMLElement, ultimo: HTMLElement): true | string {
  ultimo.focus();
  tecla('Tab');
  if (!dentro(host) || document.activeElement === ultimo) return fallo('Tab salió o no dio la vuelta', document.activeElement?.tagName);
  tecla('Tab', true);
  if (document.activeElement !== ultimo) return fallo('Shift+Tab no volvió al último', document.activeElement?.tagName);
  return true;
}

(globalThis as Record<string, unknown>).__casos = {
  async 'dialog + select: Escape cierra primero el select y luego el dialog; inert, Tab y foco devuelto'() {
    const dlg = document.createElement('iswc-dialog') as Modal;
    dlg.setAttribute('label', 'Prueba');
    dlg.innerHTML = '<iswc-select label="País"><iswc-option value="co">Colombia</iswc-option><iswc-option value="pe">Perú</iswc-option></iswc-select><button id="dlg-ultimo">ok</button>';
    const { disparador, fondo, quitar } = montar(dlg);
    document.body.append(dlg);
    const caja = dlg.shadowRoot!.querySelector('.dialog')!;
    if (caja.getAttribute('role') !== 'dialog' || caja.getAttribute('aria-modal') !== 'true') return 'role/aria-modal en la caja';
    if (caja.getAttribute('aria-label') !== 'Prueba') return fallo('aria-label', caja.getAttribute('aria-label'));
    await dlg.show();
    if (!inertes(disparador, fondo)) return 'el resto de la página no quedó inert';
    if (!dentro(dlg)) return fallo('foco inicial fuera del dialog', document.activeElement?.tagName);
    const t = trampa(dlg, dlg.querySelector<HTMLElement>('#dlg-ultimo')!);
    if (t !== true) return t;
    const sel = dlg.querySelector('iswc-select') as Lista;
    sel.show();
    await espera();
    if (!sel.open) return 'el select no abrió';
    tecla('Escape');
    if (sel.open) return 'Escape no cerró el select';
    if (!dlg.open) return 'Escape cerró el dialog antes que el select';
    await espera();
    let origen: unknown = 'sin evento';
    dlg.addEventListener('iswc-hide', (e) => { origen = (e as CustomEvent).detail.source; }, { once: true });
    const oculto = new Promise((r) => dlg.addEventListener('iswc-after-hide', r, { once: true }));
    tecla('Escape');
    if (dlg.open) return 'el segundo Escape no cerró el dialog';
    if (origen !== null) return fallo('detail.source de Escape', String(origen));
    await oculto;
    if (!libres(disparador, fondo)) return 'quedó inert tras cerrar';
    if (document.activeElement !== disparador) return fallo('el foco no volvió al disparador', document.activeElement?.tagName);
    quitar();
    return true;
  },

  async 'drawer: inert, Tab dentro, light-dismiss por backdrop y foco devuelto'() {
    const dr = document.createElement('iswc-drawer') as Modal;
    dr.setAttribute('light-dismiss', '');
    dr.innerHTML = '<span slot="label">Menú</span><button>uno</button><button id="dr-ultimo">dos</button>';
    const { disparador, fondo, quitar } = montar(dr);
    document.body.append(dr);
    await dr.show();
    const caja = dr.shadowRoot!.querySelector('.drawer')!;
    const titulo = caja.getAttribute('aria-labelledby');
    if (!titulo || !dr.shadowRoot!.getElementById(titulo)) return fallo('aria-labelledby al título', titulo);
    if (!inertes(disparador, fondo)) return 'el resto de la página no quedó inert';
    if (!dentro(dr)) return 'foco inicial fuera del drawer';
    const t = trampa(dr, dr.querySelector<HTMLElement>('#dr-ultimo')!);
    if (t !== true) return t;
    const backdrop = dr.shadowRoot!.querySelector<HTMLElement>('.backdrop')!;
    let origen: unknown = null;
    dr.addEventListener('iswc-hide', (e) => { origen = (e as CustomEvent).detail.source; }, { once: true });
    const oculto = new Promise((r) => dr.addEventListener('iswc-after-hide', r, { once: true }));
    backdrop.click();
    if (origen !== backdrop) return 'el backdrop no pasó por iswc-hide con source=backdrop';
    await oculto;
    if (!libres(disparador, fondo)) return 'quedó inert tras cerrar';
    if (document.activeElement !== disparador) return fallo('el foco no volvió al disparador', document.activeElement?.tagName);
    quitar();
    return true;
  },

  async 'dialog: iswc-hide cancelado por Escape lo deja abierto y en la pila'() {
    const dlg = document.createElement('iswc-dialog') as Modal;
    dlg.setAttribute('label', 'Fijo');
    dlg.innerHTML = '<button>ok</button>';
    const { disparador, fondo, quitar } = montar(dlg);
    document.body.append(dlg);
    await dlg.show();
    const veto = (e: Event) => e.preventDefault();
    dlg.addEventListener('iswc-hide', veto);
    tecla('Escape');
    if (!dlg.open || !inertes(disparador, fondo)) return 'el veto no lo mantuvo abierto e inert alrededor';
    dlg.removeEventListener('iswc-hide', veto);
    await dlg.hide();
    if (!libres(disparador, fondo)) return 'hide() no quitó el inert';
    quitar();
    return true;
  },

  async 'window modal: sin inert (varias conviven), Tab dentro, minimizada sale de la pila, Escape (closable) cierra y devuelve el foco'() {
    const win = document.createElement('iswc-window') as Ventana;
    win.setAttribute('title', 'Ventana');
    win.setAttribute('closable', '');
    win.setAttribute('minimizable', '');
    win.innerHTML = '<button>uno</button><button id="win-ultimo">dos</button>';
    const { disparador, fondo, quitar } = montar(win);
    document.body.append(win);
    await espera();
    if (!libres(disparador, fondo)) return 'la ventana inertizó la página (iswc-window no aísla: inertizar: false)';
    if (!dentro(win)) return 'foco inicial fuera de la ventana';
    const t = trampa(win, win.querySelector<HTMLElement>('#win-ultimo')!);
    if (t !== true) return t;
    win.minimize();
    win.restore();
    if (!dentro(win)) return 'restaurada no volvió a la pila';
    tecla('Escape');
    if (win.isConnected) return 'Escape no cerró la ventana';
    if (!libres(disparador, fondo)) return 'quedó inert tras cerrar';
    if (document.activeElement !== disparador) return fallo('el foco no volvió al disparador', document.activeElement?.tagName);
    quitar();
    return true;
  },

  async 'window no modal (aria-modal="false"): sin inert; Escape con el foco dentro la cierra'() {
    const win = document.createElement('iswc-window');
    win.setAttribute('aria-modal', 'false');
    win.setAttribute('closable', '');
    win.innerHTML = '<button id="win-libre">uno</button>';
    const { disparador, fondo, quitar } = montar(win);
    document.body.append(win);
    await espera();
    if (!libres(disparador, fondo)) return 'una ventana no modal inertizó la página';
    win.querySelector<HTMLElement>('#win-libre')!.focus();
    tecla('Escape');
    if (win.isConnected) return 'Escape con el foco dentro no la cerró';
    quitar();
    return true;
  },

  async 'confirm-modal: inert, foco en Cancelar, Escape cancela y devuelve el foco'() {
    const cm = document.createElement('iswc-confirm-modal');
    cm.setAttribute('message', '¿Seguro?');
    const { disparador, fondo, quitar } = montar(cm);
    document.body.append(cm);
    let cancelado = false;
    cm.addEventListener('iswc-confirm-cancel', () => { cancelado = true; });
    cm.setAttribute('open', '');
    await new Promise((r) => requestAnimationFrame(r));
    await espera();
    if (!inertes(disparador, fondo)) return 'el resto de la página no quedó inert';
    const cancelar = cm.shadowRoot!.querySelector('.cancel')!;
    if (enfocado() !== cancelar && !cancelar.shadowRoot?.contains(enfocado())) return fallo('foco inicial', enfocado()?.tagName);
    tecla('Escape');
    if (!cancelado || cm.hasAttribute('open')) return 'Escape no canceló';
    if (!libres(disparador, fondo)) return 'quedó inert tras cerrar';
    if (document.activeElement !== disparador) return fallo('el foco no volvió al disparador', document.activeElement?.tagName);
    quitar();
    return true;
  },
};
