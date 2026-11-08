// textos-f8.ts — casos en página de los textos fijos que pasaron a `t()` (F8 hito 3, specs/paridad-webawesome.md HOW-4).
// Lo corre tests/navegador/textos-f8.test.ts en Edge headless; cada caso monta un componente en español y otro bajo un
// ancestro con `lang="en"` (el diccionario inglés llega perezoso y repinta) y devuelve `true` o el motivo del fallo.

// Import dinámico a propósito: `sideEffects` de package.json solo nombra `dist/`, así que esbuild descarta un
// `import '…'` de efecto puro sobre `src/` y los tags quedarían sin registrar.
await Promise.all([
  import('@jeff-aporta/iswc-base/components/feedback/toast.js'),
  import('@jeff-aporta/iswc-base/components/feedback/toast-item.js'),
  import('@jeff-aporta/iswc-base/components/forms/input.js'),
  import('@jeff-aporta/iswc-base/components/navigation/pagination.js'),
  import('@jeff-aporta/iswc-base/components/layout/dialog.js'),
  import('@jeff-aporta/iswc-base/components/feedback/spinner.js'),
]);

const fallo = (msg: string, ...vals: unknown[]) => `${msg} ${vals.map((v) => JSON.stringify(v)).join(' ')}`;

/** Espera (hasta ~1 s) a que `leer()` devuelva `esperado`; devuelve lo último leído. */
async function hasta(leer: () => string | null | undefined, esperado: string): Promise<string | null | undefined> {
  let v = leer();
  for (let i = 0; i < 50 && v !== esperado; i++) {
    await new Promise((r) => setTimeout(r, 20));
    v = leer();
  }
  return v;
}

/** Monta `tag` en una caja con `lang` (o sin él) y la devuelve con el elemento. */
function montar<T extends HTMLElement>(tag: string, lang: string | null, attrs: Record<string, string> = {}): [HTMLElement, T] {
  const caja = document.createElement('section');
  if (lang) caja.setAttribute('lang', lang);
  const el = document.createElement(tag) as T;
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  caja.append(el);
  document.body.append(caja);
  return [caja, el];
}

(globalThis as Record<string, unknown>).__casos = {
  async 'toast: región «Notificaciones» y botón de cierre de cada ítem en es y en'() {
    const [cajaEs, es] = montar('iswc-toast', null);
    const region = (el: HTMLElement) => el.shadowRoot!.querySelector('.stack')!.getAttribute('aria-label');
    if (region(es) !== 'Notificaciones') return fallo('es', region(es));
    const item = document.createElement('iswc-toast-item');
    es.append(item);
    const cierre = (el: Element) => el.shadowRoot!.querySelector('.close')!.getAttribute('label');
    if (cierre(item) !== 'Cerrar') return fallo('ítem es', cierre(item));
    const [cajaEn, en] = montar('iswc-toast', 'en');
    const v = await hasta(() => region(en), 'Notifications');
    if (v !== 'Notifications') return fallo('en', v);
    const itemEn = document.createElement('iswc-toast-item');
    en.append(itemEn);
    const c = await hasta(() => cierre(itemEn), 'Close');
    if (c !== 'Close') return fallo('ítem en', c);
    cajaEs.remove();
    cajaEn.remove();
    return true;
  },

  async 'input: Limpiar y Mostrar/Ocultar contraseña en es y en; el idioma sigue al ancestro'() {
    const textos = (el: HTMLElement) => {
      const r = el.shadowRoot!;
      const t = r.getElementById('toggle')!;
      return [r.getElementById('clear')!.getAttribute('aria-label'), t.getAttribute('label'), t.getAttribute('checked-label')].join('|');
    };
    const [cajaEs, es] = montar('iswc-input', null, { type: 'password', 'password-toggle': '', clearable: '' });
    if (textos(es) !== 'Limpiar|Mostrar contraseña|Ocultar contraseña') return fallo('es', textos(es));
    const [cajaEn, en] = montar('iswc-input', 'en', { type: 'password', 'password-toggle': '', clearable: '' });
    const v = await hasta(() => textos(en), 'Clear|Show password|Hide password');
    if (v !== 'Clear|Show password|Hide password') return fallo('en', v);
    // Cambiar `lang` del ancestro: el repintado lo pide quien cambia el idioma de una sección (el observador mira `<html>`).
    cajaEn.setAttribute('lang', 'es');
    (en as unknown as { solicitarRender(): Promise<boolean> }).solicitarRender();
    const w = await hasta(() => textos(en), 'Limpiar|Mostrar contraseña|Ocultar contraseña');
    if (w !== 'Limpiar|Mostrar contraseña|Ocultar contraseña') return fallo('vuelta a es', w);
    cajaEs.remove();
    cajaEn.remove();
    return true;
  },

  async 'pagination: textos por defecto en es y en; `label` y `textos` del consumidor mandan'() {
    const leer = (el: HTMLElement) => {
      const r = el.shadowRoot!;
      return [r.querySelector('nav')?.getAttribute('aria-label'), r.querySelector('.resumen')?.textContent, r.querySelector('.flecha-prev')?.getAttribute('aria-label')].join('|');
    };
    const [cajaEs, es] = montar('iswc-pagination', null, { page: '2', pages: '5' });
    if (leer(es) !== 'Paginación|Página 2 de 5|Desplazar páginas a la izquierda') return fallo('es', leer(es));
    const pg = es as HTMLElement & { textos: Record<string, string> };
    if (pg.textos.tamano !== 'Elementos por página') return fallo('getter textos', pg.textos);
    pg.textos = { resumen: '{n}/{total}' };
    es.setAttribute('label', 'Resultados');
    if (leer(es) !== 'Resultados|2/5|Desplazar páginas a la izquierda') return fallo('consumidor', leer(es));
    const [cajaEn, en] = montar('iswc-pagination', 'en', { page: '1', pages: '3' });
    const v = await hasta(() => leer(en), 'Pagination|Page 1 of 3|Scroll pages left');
    if (v !== 'Pagination|Page 1 of 3|Scroll pages left') return fallo('en', v);
    cajaEs.remove();
    cajaEn.remove();
    return true;
  },

  async 'dialog y spinner: «Cerrar» / «Cargando» en es y en; el aria-label del consumidor no se toca'() {
    const cierre = (el: HTMLElement) => el.shadowRoot!.querySelector('.close-btn')!.getAttribute('aria-label');
    const [cajaEs, es] = montar('iswc-dialog', null);
    if (cierre(es) !== 'Cerrar') return fallo('dialog es', cierre(es));
    const [cajaEn, en] = montar('iswc-dialog', 'en');
    const v = await hasta(() => cierre(en), 'Close');
    if (v !== 'Close') return fallo('dialog en', v);
    const [cajaS, s] = montar('iswc-spinner', null);
    if (s.getAttribute('aria-label') !== 'Cargando') return fallo('spinner es', s.getAttribute('aria-label'));
    const [cajaSe, se] = montar('iswc-spinner', 'en');
    const w = await hasta(() => se.getAttribute('aria-label'), 'Loading');
    if (w !== 'Loading') return fallo('spinner en', w);
    const [cajaP, propio] = montar('iswc-spinner', 'en', { 'aria-label': 'Subiendo' });
    await new Promise((r) => setTimeout(r, 60));
    if (propio.getAttribute('aria-label') !== 'Subiendo') return fallo('spinner consumidor', propio.getAttribute('aria-label'));
    for (const c of [cajaEs, cajaEn, cajaS, cajaSe, cajaP]) c.remove();
    return true;
  },
};
