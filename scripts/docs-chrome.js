/**
 * docs-chrome.js — piezas comunes de TODAS las páginas de componente.
 *
 * Botón de copiar (<is-copy-button>) en cada `pre.code` de la página.
 * El bloque "Consumo por CDN" es responsabilidad EXCLUSIVA de
 * <is-cdn-snippet>, auto-inyectado por preview-chrome.js — aquí no se
 * duplica ningún callout CDN.
 *
 * Opt-out: data-no-copy en un <pre>.
 *
 * Es un módulo ES: el componente que necesita se importa de forma estática,
 * sin inyectar `<script>` ni buscarse a sí mismo en `document.scripts`.
 */
import '../src/components/actions/copy-button.js';

/** Barra con botón de copiar sobre cada snippet. */
const addCopy = (pre) => {
  if (pre.dataset.copyReady || pre.hasAttribute('data-no-copy')) return;
  // El panel del demo trae su propia barra de copiar.
  if (pre.closest('.demo-code-pop')) return;
  pre.dataset.copyReady = '1';

  const wrap = document.createElement('div');
  wrap.className = 'code-block';
  pre.replaceWith(wrap);

  const btn = document.createElement('is-copy-button');
  btn.className = 'code-block__copy';
  // `data-cm-source` es el texto ya dedentado por el highlighter. Sin él se
  // copiaría la indentación heredada del markup del preview.
  btn.setAttribute('value', pre.dataset.cmSource ?? pre.textContent);
  btn.setAttribute('copy-label', 'Copiar');
  btn.setAttribute('success-label', 'Copiado');
  btn.setAttribute('tooltip-placement', 'left');

  wrap.append(pre, btn);
};

const boot = () => {
  // El bloque CDN lo pinta <is-cdn-snippet> (auto-inyectado por
  // cdn-panel.js). Aquí solo queda el botón de copiar de los <pre>.
  document.querySelectorAll('pre.code').forEach(addCopy);
};

// Los `<pre>` llegan con el preview, no con el HTML de la página: cada vez que
// `<is-preview-component>` monta uno hay que barrer de nuevo. `addCopy()` es
// idempotente (`data-copy-ready`), así que repetir el barrido no duplica nada.
document.addEventListener('is-preview-ready', boot);

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
