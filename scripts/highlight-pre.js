/**
 * highlight-pre.js — arranca el highlighter de `<pre class="code">` en el docs.
 *
 * La lógica vive en `components/_shared/highlight-code.js` para que
 * `<is-cdn-snippet>` (un componente, que NO puede importar de `scripts/`)
 * pueda usarla con un import estático. Aquí solo queda el arranque de la
 * página: cargar CodeMirror, pintar y escuchar los cambios de tema.
 *
 * Ya no hay puentes en `window`: quien necesite pintar importa `paint`.
 */
import {
  ensureCodeMirror,
  isReady,
  paint,
  reapplyTheme,
  repaint,
  softFormat,
  watchDom,
  watchTheme,
} from '../src/components/_shared/highlight-code.js';

export { paint, repaint, softFormat, reapplyTheme };

/**
 * El docs ya no es HTML estático: `<is-preview-component>` monta cada preview
 * cuando su JSON termina de bajar, así que el barrido del arranque solo
 * alcanza a los `<pre>` que existieran en ese instante. Con CodeMirror en
 * caché ese barrido gana la carrera y el código se queda sin colorear.
 *
 * Cuando CodeMirror ya está listo se pinta en el MISMO turno: el botón de
 * copiar de `docs-chrome.js` escucha el mismo evento después de este listener
 * y lee `data-cm-source`, el texto ya dedentado.
 */
const repintar = () => {
  if (isReady()) {
    paint();
    return;
  }
  ensureCodeMirror().then(() => paint()).catch(console.error);
};

document.addEventListener('is-preview-ready', repintar);

// El observer se engancha ANTES de que CodeMirror baje: así los `<pre>` que
// aparezcan mientras carga quedan encolados y ninguno se pierde.
watchDom();

const boot = async () => {
  await ensureCodeMirror();
  paint();
  watchTheme();
};

// Los módulos son diferidos: el DOM ya está parseado al ejecutarse. Aun así
// mantenemos la guarda por si alguien importa este módulo desde un script
// clásico inyectado antes de tiempo.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => { boot().catch(console.error); }, { once: true });
} else {
  boot().catch(console.error);
}
