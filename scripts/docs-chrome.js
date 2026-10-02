/**
 * docs-chrome.js — piezas comunes de TODAS las páginas de componente.
 *
 * Botón de copiar (<iswc-copy-button>) en cada snippet de código de la página
 * (`pre.code` legacy o `<iswc-code class="code|iswc-code-view">`).
 * El bloque "Consumo por CDN" es responsabilidad EXCLUSIVA de
 * <iswc-cdn-snippet>, que monta cdn-panel.js — aquí no se duplica ningún
 * callout CDN.
 *
 * Opt-out: data-no-copy.
 */
import '../src/components/actions/copy-button.js';

const SNIPPET_SEL = 'pre.code, iswc-code.code, iswc-code.iswc-code-view';

const snippetText = (el) => {
  if (el.localName === 'iswc-code') {
    return el.dataset.cmSource ?? el.value ?? '';
  }
  return el.dataset.cmSource ?? el.textContent ?? '';
};

/** Barra con botón de copiar sobre cada snippet. */
const addCopy = (el) => {
  if (el.dataset.copyReady || el.hasAttribute('data-no-copy')) return;
  if (el.closest('.demo-code-pop')) return;
  if (el.classList.contains('vs-pre') || el.closest('.iswc-view-sources, .vs-body')) return;
  el.dataset.copyReady = '1';

  const wrap = document.createElement('div');
  wrap.className = 'code-block';
  el.replaceWith(wrap);

  const btn = document.createElement('iswc-copy-button');
  btn.className = 'code-block__copy';
  btn.setAttribute('value', snippetText(el));
  btn.setAttribute('copy-label', 'Copiar');
  btn.setAttribute('success-label', 'Copiado');
  btn.setAttribute('tooltip-placement', 'left');

  // Mantener el valor de copia al día si el editor cambia.
  if (el.localName === 'iswc-code') {
    el.addEventListener('iswc-change', () => {
      btn.setAttribute('value', el.value ?? '');
    });
  }

  wrap.append(el, btn);
};

const boot = () => {
  document.querySelectorAll(SNIPPET_SEL).forEach(addCopy);
};

document.addEventListener('iswc-preview-ready', boot);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
