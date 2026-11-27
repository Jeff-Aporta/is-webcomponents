// @contexto INDICE.md · src/cdn/loader.md
/**
 * _plugin.js — los demos de diagramas NO son del kit: los componentes `iswd-*` viven en el repo iswc-diagrams y se cargan
 * como PLUGIN con `iswcLoader.loadPlugin`, fijados por SHA (el SHA vive aquí, en un solo sitio; `deno task shas` dice
 * cuál es el último). Cada demo muestra de dónde sale el componente: repo, SHA y enlace.
 */
import { iswcLoader as L } from '../../dist/cdn/core/loader.min.mjs';

export const PLUGIN = {
  app: 'diagrams',
  repo: 'Jeff-Aporta/iswc-diagrams',
  sha: 'd61aa3844bf37606e54c585ddb7a09649acef0d0',
  prefijo: 'iswd-',
};

/** Carga el plugin con los tags del demo y pinta el aviso de origen. Devuelve la info de `loadPlugin`. */
export async function cargarDiagramas(tags) {
  await L.load('iswc-callout', 'iswc-button');
  const info = await L.loadPlugin({ ...PLUGIN, tags });
  const aviso = document.createElement('iswc-callout');
  aviso.setAttribute('color', 'info');
  aviso.setAttribute('data-plugin-origen', '');
  aviso.style.margin = '0.5em';
  const repoUrl = `https://github.com/${PLUGIN.repo}`;
  aviso.innerHTML = `<strong>Plugin</strong> · ${tags.map((t) => `<code>&lt;${t}&gt;</code>`).join(' ')} no son del kit: vienen del repo `
    + `<a href="${repoUrl}" target="_blank" rel="noopener">${PLUGIN.repo}</a> en el commit `
    + `<a href="${repoUrl}/tree/${PLUGIN.sha}" target="_blank" rel="noopener"><code>${PLUGIN.sha.slice(0, 8)}</code></a> `
    + `(prefijo <code>${PLUGIN.prefijo}</code>, <code>loadPlugin</code>). `
    + `<a href="https://jeff-aporta.github.io/iswc-diagrams/view/demo/" target="_blank" rel="noopener">Galería del plugin</a>.`;
  const cuerpo = document.body;
  cuerpo.insertBefore(aviso, cuerpo.firstChild);
  return info;
}
