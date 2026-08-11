/**
 * docs-chrome.js — piezas comunes de TODAS las páginas de componente.
 *
 * Botón de copiar (<is-copy-button>) en cada snippet de código de la página
 * (`pre.code` legacy o `<is-code class="code|is-code-view">`).
 * El bloque "Consumo por CDN" es responsabilidad EXCLUSIVA de
 * <is-cdn-snippet>, que monta cdn-panel.js — aquí no se duplica ningún
 * callout CDN.
 *
 * Opt-out: data-no-copy.
 */
import '../src/components/actions/copy-button.js';

const SNIPPET_SEL = 'pre.code, is-code.code, is-code.is-code-view';

const snippetText = (el) => {
  if (el.localName === 'is-code') {
    return el.dataset.cmSource ?? el.value ?? '';
  }
  return el.dataset.cmSource ?? el.textContent ?? '';
};

/** Barra con botón de copiar sobre cada snippet. */
const addCopy = (el) => {
  if (el.dataset.copyReady || el.hasAttribute('data-no-copy')) return;
  if (el.closest('.demo-code-pop')) return;
  if (el.classList.contains('vs-pre') || el.closest('.is-view-sources, .vs-body')) return;
  el.dataset.copyReady = '1';

  const wrap = document.createElement('div');
  wrap.className = 'code-block';
  el.replaceWith(wrap);

  const btn = document.createElement('is-copy-button');
  btn.className = 'code-block__copy';
  btn.setAttribute('value', snippetText(el));
  btn.setAttribute('copy-label', 'Copiar');
  btn.setAttribute('success-label', 'Copiado');
  btn.setAttribute('tooltip-placement', 'left');

  // Mantener el valor de copia al día si el editor cambia.
  if (el.localName === 'is-code') {
    el.addEventListener('is-change', () => {
      btn.setAttribute('value', el.value ?? '');
    });
  }

  wrap.append(el, btn);
};

const boot = () => {
  document.querySelectorAll(SNIPPET_SEL).forEach(addCopy);
};

document.addEventListener('is-preview-ready', boot);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
