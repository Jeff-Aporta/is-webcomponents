/**
 * cdn-panel.js — bloque «Consumo por CDN» al final de la página de cada
 * componente.
 *
 * El panel lo pinta `<is-cdn-snippet>`; aquí solo se resuelve QUÉ componente
 * se está viendo y de dónde salen sus enlaces de documentación. Vive en
 * `scripts/` porque necesita el `manifest.js` del repo, y un componente del
 * kit no puede importarlo (acabaría dentro del bundle del CDN).
 *
 * Esto era parte de `preview-chrome.js` y sacaba el tag del nombre del archivo
 * (`is-button.html`). Al pasar el docs a una sola página que monta los previews
 * desde JSON ese nombre desapareció —la galería es `index.html` y el fullscreen
 * `_shell.html`—, así que el panel dejó de aparecer en todos los componentes.
 * Ahora el tag lo trae el propio preview montado, en `is-preview-ready`.
 */
import '../src/components/feedback/cdn-snippet.js';
import components from '../manifest.js';

/**
 * Enlaces a los LLM.md del REPO tal cual, sin copia en dist. Se usa
 * raw.githubusercontent porque es la única de las tres rutas que responde
 * `text/plain`, así que el navegador MUESTRA el texto al entrar; jsDelivr y
 * GitHub Pages lo mandan como `text/markdown` y lo descargan. Verificado con
 * curl sobre las tres. Para un fetch cualquiera de ellas sirve.
 *
 * Antes esto apuntaba a `../LLM.md`, o sea `previews/LLM.md`, que no existe:
 * el enlace daba 404 en blanco.
 *
 * La ruta de la categoría se deriva del `script` del manifest, NO del nombre
 * de la categoría: no son lo mismo. Los tags de `data-viz` viven repartidos
 * entre `components/charts/` y `components/data-viz/`, así que componer
 * `components/<categoria>/LLM.md` daba rutas inexistentes.
 *
 * El "índice global" apunta a `components/LLM.md`, NO al `LLM.md` de la raíz:
 * son documentos distintos con audiencias distintas. El de la raíz son
 * convenciones internas del repo (cómo se construye, qué bugs ya se
 * cometieron) — nada de eso sirve para CONSUMIR un componente. `components/
 * LLM.md` es el catálogo real: tabla de categorías con sus LLM.md y el
 * inventario completo de tags. Confundirlos manda a un LLM consumidor a leer
 * notas de desarrollo del repo en vez de la documentación de la API.
 */
const LLM_BASE = 'https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src';

function llmDocs(entry) {
  // script → ruta fuente relativa al repo (p. ej. components/actions/button.js)
  const scriptPath = (entry.script || '')
    .replace(/^\.\.\/\.\.\//, '')
    .replace(/^\.\.\//, '');
  const folder = scriptPath.replace(/\/[^/]+\.js$/, '');
  const moduleMd = scriptPath.replace(/\.js$/, '.md');
  const docs = [];
  if (moduleMd && moduleMd !== scriptPath) {
    docs.push({ label: 'Módulo', url: `${LLM_BASE}/${moduleMd}` });
  }
  if (folder) {
    docs.push({
      label: `Categoría ${entry.category || ''}`.trim(),
      url: `${LLM_BASE}/${folder}/LLM.md`,
    });
  }
  docs.push({ label: 'Índice global', url: `${LLM_BASE}/components/LLM.md` });
  docs.push({
    label: 'Skill · instalación CDN',
    url: `${LLM_BASE}/skills/is-cdn-install/SKILL.md`,
  });
  return docs;
}

/**
 * Añade el panel al final del main. Idempotente: `renderDefinition()` vacía el
 * main en cada preview, así que en la navegación el panel anterior ya no está
 * y hay que volver a montarlo; si sigue ahí, no se duplica.
 *
 * Sin entrada en el manifest no hay panel: `home` y `theming` son páginas
 * sueltas, no componentes del catálogo.
 */
function mountCdnPanel(tag) {
  const host = document.querySelector('is-main.main, main.main');
  if (!host) return;
  if (host.querySelector(':scope > is-cdn-snippet[data-auto-cdn]')) return;

  const entry = components.find((c) => c.tag === tag);
  if (!entry) return;

  const snippet = document.createElement('is-cdn-snippet');
  snippet.dataset.autoCdn = '1';
  snippet.setAttribute('tag', entry.tag);
  snippet.setAttribute('category', entry.category || '');
  snippet.setAttribute('title', `CDN · ${entry.title || entry.tag}`);
  // Opt-in: F5 recuerda Enlaces/Mirrors dentro de ?s= (key cdnTab)
  snippet.setAttribute('url-key', 'cdnTab');
  // Los enlaces a la documentación viajan como `config` del propio snippet:
  // es él quien decide si los pinta. Son opcionales, no obligatorios.
  snippet.setAttribute('config', JSON.stringify({ docs: llmDocs(entry) }));
  host.append(snippet);
}

document.addEventListener('is-preview-ready', (e) => {
  const { tag } = e.detail ?? {};
  if (typeof tag === 'string') mountCdnPanel(tag);
});

export { mountCdnPanel };
