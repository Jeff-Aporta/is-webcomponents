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
import '../components/actions/copy-button.js';

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
  btn.setAttribute('value', pre.textContent);
  btn.setAttribute('copy-label', 'Copiar');
  btn.setAttribute('success-label', 'Copiado');
  btn.setAttribute('tooltip-placement', 'left');

  wrap.append(pre, btn);
};

const boot = () => {
  // El bloque CDN lo pinta <is-cdn-snippet> (auto-inyectado por
  // preview-chrome.js). Aquí solo queda el botón de copiar de los <pre>.
  document.querySelectorAll('pre.code').forEach(addCopy);
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot, { once: true });
} else {
  boot();
}
