/**
 * highlight-pre.js — arranca el highlighter de `<pre class="code">` en el docs.
 *
 * La lógica vive en `components/_shared/highlight-code.js` para que
 * `<iswc-cdn-snippet>` (un componente, que NO puede importar de `scripts/`)
 * pueda usarla con un import estático. Aquí solo queda el arranque de la
 * página: pintar (montando `<iswc-code readonly compact>`) y re-pintar cuando
 * llega un preview.
 *
 * No se carga CodeMirror (ni aquí ni en <iswc-code>): el resaltado y el tema
 * los resuelve el propio `<iswc-code>` con su motor nativo (code-highlight) y
 * las custom properties --iswc-code-* (reacciona a iswc-theme-change).
 *
 * Ya no hay puentes en `window`: quien necesite pintar importa `paint`.
 */
import {
  paint,
  repaint,
  softFormat,
  watchDom,
} from '../src/components/_shared/highlight-code.js';

export { paint, repaint, softFormat };

/**
 * El docs ya no es HTML estático: `<iswc-preview-component>` monta cada preview
 * cuando su JSON termina de bajar, así que el barrido del arranque solo
 * alcanza a los `<pre>` que existieran en ese instante.
 *
 * Se pinta en el MISMO turno: el botón de copiar de `docs-chrome.js` escucha
 * el mismo evento después de este listener y lee `data-cm-source` (nombre
 * legacy de la era CodeMirror; hoy es solo la caché del texto ya dedentado).
 */
const repintar = () => paint();

document.addEventListener('iswc-preview-ready', repintar);

// El observer se engancha desde el arranque: los `<pre>`/`<iswc-code>` que
// aparezcan después quedan encolados y ninguno se pierde.
watchDom();

const boot = () => {
  paint();
};

// Los módulos son diferidos: el DOM ya está parseado al ejecutarse. Aun así
// mantenemos la guarda por si alguien importa este módulo desde un script
// clásico inyectado antes de tiempo.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => boot(), { once: true });
} else {
  boot();
}
