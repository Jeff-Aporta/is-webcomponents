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
  paint,
  reapplyTheme,
  softFormat,
  watchTheme,
} from '../components/_shared/highlight-code.js';

export { paint, softFormat, reapplyTheme };

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
