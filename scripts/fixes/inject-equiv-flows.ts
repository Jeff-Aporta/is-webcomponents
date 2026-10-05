/**
 * Inyecta equivFlow (+ note) en el primer demo de la sección intro
 * de previews que aún no lo tienen. Idempotente.
 *
 * Uso: deno run -A --no-check scripts/inject-equiv-flows.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const previews = join(root, 'src', 'previews');

function flow(title, nodes, edges, note) {
  const payload = {
    flowchart: { title, direction: 'TB', nodes, edges },
  };
  const html =
    `<iswc-flowchart open-on-click animation="flow">\n` +
    `  <script type="application/json">\n` +
    `  ${JSON.stringify(payload, null, 2).replace(/\n/g, '\n  ')}\n` +
    `  </script>\n` +
    `</iswc-flowchart>`;
  return { html, note };
}

/** @type {Record<string, { note: string, html: string }>} */
const FLOWS = {
  'forms/iswc-select.json': flow(
    'iswc-select: ramas',
    [
      { id: 'q', label: 'multiple?', shape: 'diamond' },
      { id: 's', label: 'single → value string', shape: 'stadium' },
      { id: 'm', label: 'multiple → CSV / tags', shape: 'round' },
      { id: 'd', label: 'selection-display?', shape: 'diamond' },
      { id: 't', label: 'tags | text | count', shape: 'stadium' },
    ],
    [
      { from: 'q', to: 's', label: 'no' },
      { from: 'q', to: 'm', label: 'si' },
      { from: 'm', to: 'd' },
      { from: 'd', to: 't' },
    ],
    'Ramas de selección: multiple cambia FormData y cómo se muestra el valor.',
  ),

  'navigation/iswc-tree.json': flow(
    'iswc-tree: selection',
    [
      { id: 'q', label: 'selection=?', shape: 'diamond' },
      { id: 'a', label: 'none → solo expand', shape: 'stadium' },
      { id: 'b', label: 'single → un nodo', shape: 'round' },
      { id: 'c', label: 'leaf → solo hojas', shape: 'round' },
      { id: 'd', label: 'multiple → checks', shape: 'stadium' },
    ],
    [
      { from: 'q', to: 'a', label: 'none' },
      { from: 'q', to: 'b', label: 'single' },
      { from: 'q', to: 'c', label: 'leaf' },
      { from: 'q', to: 'd', label: 'multiple' },
    ],
    'El atributo selection define si el árbol selecciona nodos y cómo.',
  ),

  'actions/iswc-copy-button.json': flow(
    'iswc-copy-button: fuente',
    [
      { id: 'q', label: 'tiene from?', shape: 'diamond' },
      { id: 'a', label: 'resolver #id / .value', shape: 'round' },
      { id: 'b', label: 'tiene value?', shape: 'diamond' },
      { id: 'c', label: 'copiar literal', shape: 'stadium' },
      { id: 'e', label: 'iswc-error', shape: 'stadium' },
    ],
    [
      { from: 'q', to: 'a', label: 'si' },
      { from: 'q', to: 'b', label: 'no' },
      { from: 'b', to: 'c', label: 'si' },
      { from: 'b', to: 'e', label: 'no' },
    ],
    'from gana sobre value. Sin fuente válida emite iswc-error.',
  ),

  'navigation/iswc-breadcrumb-item.json': flow(
    'iswc-breadcrumb-item: host',
    [
      { id: 'q', label: 'tiene href?', shape: 'diamond' },
      { id: 'a', label: 'elemento a (enlace)', shape: 'stadium' },
      { id: 'b', label: 'href vacío?', shape: 'diamond' },
      { id: 'c', label: 'página actual (span)', shape: 'round' },
      { id: 'd', label: 'span SPA', shape: 'stadium' },
    ],
    [
      { from: 'q', to: 'b', label: 'si' },
      { from: 'q', to: 'd', label: 'no' },
      { from: 'b', to: 'c', label: '""' },
      { from: 'b', to: 'a', label: 'url' },
    ],
    'Con href pinta enlace; vacío = current; sin href = span.',
  ),

  'layout/iswc-dialog.json': flow(
    'iswc-dialog: cierre',
    [
      { id: 'q', label: 'light-dismiss?', shape: 'diamond' },
      { id: 'a', label: 'clic fuera → hide', shape: 'round' },
      { id: 'b', label: 'solo X / Escape', shape: 'round' },
      { id: 'c', label: 'iswc-hide cancelado?', shape: 'diamond' },
      { id: 'd', label: 'pulse / no cierra', shape: 'stadium' },
      { id: 'e', label: 'cierra', shape: 'stadium' },
    ],
    [
      { from: 'q', to: 'a', label: 'si' },
      { from: 'q', to: 'b', label: 'no' },
      { from: 'a', to: 'c' },
      { from: 'b', to: 'c' },
      { from: 'c', to: 'd', label: 'si' },
      { from: 'c', to: 'e', label: 'no' },
    ],
    'light-dismiss y cancelación de iswc-hide controlan el cierre.',
  ),

  'layout/iswc-drawer.json': flow(
    'iswc-drawer: placement',
    [
      { id: 'q', label: 'placement=?', shape: 'diamond' },
      { id: 'a', label: 'start / end → ancho', shape: 'round' },
      { id: 'b', label: 'top / bottom → alto', shape: 'round' },
      { id: 'c', label: 'light-dismiss?', shape: 'diamond' },
      { id: 'd', label: 'clic fuera cierra', shape: 'stadium' },
      { id: 'e', label: 'solo chrome / Escape', shape: 'stadium' },
    ],
    [
      { from: 'q', to: 'a', label: 'lat' },
      { from: 'q', to: 'b', label: 'vert' },
      { from: 'a', to: 'c' },
      { from: 'b', to: 'c' },
      { from: 'c', to: 'd', label: 'si' },
      { from: 'c', to: 'e', label: 'no' },
    ],
    'placement define el eje; light-dismiss el cierre por backdrop.',
  ),

  'layout/iswc-details.json': flow(
    'iswc-details: accordion',
    [
      { id: 'q', label: 'mismo name?', shape: 'diamond' },
      { id: 'a', label: 'accordion (uno abierto)', shape: 'stadium' },
      { id: 'b', label: 'disclosure independiente', shape: 'stadium' },
    ],
    [
      { from: 'q', to: 'a', label: 'si' },
      { from: 'q', to: 'b', label: 'no' },
    ],
    'Varios details con el mismo name se comportan como accordion.',
  ),

  'navigation/iswc-tab-group.json': flow(
    'iswc-tab-group: activation',
    [
      { id: 'q', label: 'activation=?', shape: 'diamond' },
      { id: 'a', label: 'auto → flechas cambian', shape: 'stadium' },
      { id: 'b', label: 'manual → Space/Enter', shape: 'stadium' },
      { id: 'c', label: 'closable?', shape: 'diamond' },
      { id: 'd', label: 'emite close', shape: 'round' },
    ],
    [
      { from: 'q', to: 'a', label: 'auto' },
      { from: 'q', to: 'b', label: 'manual' },
      { from: 'a', to: 'c' },
      { from: 'b', to: 'c' },
      { from: 'c', to: 'd', label: 'si' },
    ],
    'activation define teclado; closable añade cierre de pestaña.',
  ),

  'feedback/iswc-tooltip.json': flow(
    'iswc-tooltip: trigger',
    [
      { id: 'q', label: 'trigger=?', shape: 'diamond' },
      { id: 'a', label: 'hover → show/hide', shape: 'stadium' },
      { id: 'b', label: 'click → toggle', shape: 'stadium' },
      { id: 'c', label: 'manual → API', shape: 'stadium' },
    ],
    [
      { from: 'q', to: 'a', label: 'hover' },
      { from: 'q', to: 'b', label: 'click' },
      { from: 'q', to: 'c', label: 'manual' },
    ],
    'trigger decide cómo se abre; tip con HTML suele ir mejor con click.',
  ),

  'helpers/iswc-popover.json': flow(
    'iswc-popover: trigger',
    [
      { id: 'q', label: 'trigger=?', shape: 'diamond' },
      { id: 'a', label: 'click → toggle', shape: 'stadium' },
      { id: 'b', label: 'manual → open()', shape: 'stadium' },
      { id: 'c', label: 'Escape / fuera / close', shape: 'round' },
    ],
    [
      { from: 'q', to: 'a', label: 'click' },
      { from: 'q', to: 'b', label: 'manual' },
      { from: 'a', to: 'c' },
      { from: 'b', to: 'c' },
    ],
    'Base de overlays anclados: click o API; cierre Escape/fuera.',
  ),

  'overlays/iswc-pdf-viewer.json': flow(
    'iswc-pdf-viewer: engine',
    [
      { id: 'q', label: 'engine=?', shape: 'diamond' },
      { id: 'a', label: 'native → iframe', shape: 'stadium' },
      { id: 'b', label: 'pdfjs → page/zoom', shape: 'stadium' },
      { id: 'c', label: 'download / print', shape: 'round' },
    ],
    [
      { from: 'q', to: 'a', label: 'native' },
      { from: 'q', to: 'b', label: 'pdfjs' },
      { from: 'a', to: 'c' },
      { from: 'b', to: 'c' },
    ],
    'engine elige motor; flags de toolbar son independientes.',
  ),

  'forms/iswc-inline-edit.json': flow(
    'iswc-inline-edit: blur',
    [
      { id: 'q', label: 'mode=?', shape: 'diamond' },
      { id: 'a', label: 'text → input', shape: 'round' },
      { id: 'b', label: 'textarea', shape: 'round' },
      { id: 'c', label: 'cancel-on-blur?', shape: 'diamond' },
      { id: 'd', label: 'descarta', shape: 'stadium' },
      { id: 'e', label: 'guarda (iswc-change)', shape: 'stadium' },
    ],
    [
      { from: 'q', to: 'a', label: 'text' },
      { from: 'q', to: 'b', label: 'textarea' },
      { from: 'a', to: 'c' },
      { from: 'b', to: 'c' },
      { from: 'c', to: 'd', label: 'si' },
      { from: 'c', to: 'e', label: 'no' },
    ],
    'mode elige control; cancel-on-blur decide si blur guarda o cancela.',
  ),

  'forms/iswc-input.json': flow(
    'iswc-input: type',
    [
      { id: 'q', label: 'type=?', shape: 'diamond' },
      { id: 'a', label: 'password → toggle', shape: 'stadium' },
      { id: 'b', label: 'search → clearable', shape: 'stadium' },
      { id: 'c', label: 'number → min/max', shape: 'stadium' },
      { id: 'd', label: 'input genérico FA', shape: 'stadium' },
    ],
    [
      { from: 'q', to: 'a', label: 'password' },
      { from: 'q', to: 'b', label: 'search' },
      { from: 'q', to: 'c', label: 'number' },
      { from: 'q', to: 'd', label: 'otro' },
    ],
    'type especializa chrome (ojo, clear, steppers) sobre el FA base.',
  ),

  'forms/iswc-checkbox.json': flow(
    'iswc-checkbox: estado',
    [
      { id: 'q', label: 'indeterminate?', shape: 'diamond' },
      { id: 'a', label: 'tri-state UI', shape: 'stadium' },
      { id: 'b', label: 'checked?', shape: 'diamond' },
      { id: 'c', label: 'on → FormData', shape: 'round' },
      { id: 'd', label: 'off', shape: 'round' },
      { id: 'e', label: 'readonly / disabled', shape: 'stadium' },
    ],
    [
      { from: 'q', to: 'a', label: 'si' },
      { from: 'q', to: 'b', label: 'no' },
      { from: 'b', to: 'c', label: 'si' },
      { from: 'b', to: 'd', label: 'no' },
      { from: 'c', to: 'e' },
      { from: 'd', to: 'e' },
      { from: 'a', to: 'e' },
    ],
    'checked / indeterminate / bloqueo (readonly vs disabled).',
  ),

  'forms/iswc-switch.json': flow(
    'iswc-switch: FormData',
    [
      { id: 'q', label: 'checked?', shape: 'diamond' },
      { id: 'a', label: 'on → aporta value', shape: 'stadium' },
      { id: 'b', label: 'off → no envía', shape: 'stadium' },
      { id: 'c', label: 'readonly / disabled', shape: 'round' },
    ],
    [
      { from: 'q', to: 'a', label: 'si' },
      { from: 'q', to: 'b', label: 'no' },
      { from: 'a', to: 'c' },
      { from: 'b', to: 'c' },
    ],
    'Como checkbox: solo el estado on aporta al FormData.',
  ),

  'actions/iswc-dropdown-item.json': flow(
    'iswc-dropdown-item: tipo',
    [
      { id: 'q', label: 'type=checkbox?', shape: 'diamond' },
      { id: 'a', label: 'toggle + aria-checked', shape: 'stadium' },
      { id: 'b', label: 'slot submenu?', shape: 'diamond' },
      { id: 'c', label: 'popover anidado', shape: 'stadium' },
      { id: 'd', label: 'ítem de acción', shape: 'stadium' },
    ],
    [
      { from: 'q', to: 'a', label: 'si' },
      { from: 'q', to: 'b', label: 'no' },
      { from: 'b', to: 'c', label: 'si' },
      { from: 'b', to: 'd', label: 'no' },
    ],
    'checkbox vs acción; submenu abre popover anidado.',
  ),

  'actions/iswc-speed-dial.json': flow(
    'iswc-speed-dial: layout',
    [
      { id: 'q', label: 'direction=?', shape: 'diamond' },
      { id: 'a', label: 'radial → grid/flex', shape: 'stadium' },
      { id: 'b', label: 'up/down/left/right', shape: 'stadium' },
    ],
    [
      { from: 'q', to: 'a', label: 'radial' },
      { from: 'q', to: 'b', label: 'lineal' },
    ],
    'direction lineal vs radial cambia el layout de acciones.',
  ),

  'feedback/iswc-theme-toggle.json': flow(
    'iswc-theme-toggle: contenedor',
    [
      { id: 'q', label: 'buscar contenedor', shape: 'diamond' },
      { id: 'a', label: '[container-theme]', shape: 'round' },
      { id: 'b', label: '.container-theme', shape: 'round' },
      { id: 'c', label: '.theme-* / data-theme', shape: 'round' },
      { id: 'd', label: '<html>', shape: 'stadium' },
    ],
    [
      { from: 'q', to: 'a', label: '1º' },
      { from: 'a', to: 'b', label: '2º' },
      { from: 'b', to: 'c', label: '3º' },
      { from: 'c', to: 'd', label: 'fallback' },
    ],
    'Cascada de dónde escribe el tema al conmutar.',
  ),

  'layout/iswc-split-panel.json': flow(
    'iswc-split-panel: primary',
    [
      { id: 'q', label: 'orientation=?', shape: 'diamond' },
      { id: 'a', label: 'horizontal', shape: 'round' },
      { id: 'b', label: 'vertical', shape: 'round' },
      { id: 'c', label: 'primary=?', shape: 'diamond' },
      { id: 'd', label: 'start crece', shape: 'stadium' },
      { id: 'e', label: 'end crece', shape: 'stadium' },
    ],
    [
      { from: 'q', to: 'a', label: 'H' },
      { from: 'q', to: 'b', label: 'V' },
      { from: 'a', to: 'c' },
      { from: 'b', to: 'c' },
      { from: 'c', to: 'd', label: 'start' },
      { from: 'c', to: 'e', label: 'end' },
    ],
    'orientation + primary definen qué panel absorbe el resize.',
  ),

  'actions/iswc-context-menu.json': flow(
    'iswc-context-menu: scroll',
    [
      { id: 'q', label: 'scroll-lock?', shape: 'diamond' },
      { id: 'a', label: 'congela documento', shape: 'stadium' },
      { id: 'b', label: 'scroll → cierra', shape: 'stadium' },
    ],
    [
      { from: 'q', to: 'a', label: 'si' },
      { from: 'q', to: 'b', label: 'no' },
    ],
    'Por defecto el scroll cierra el menú; scroll-lock lo evita.',
  ),

  'actions/iswc-fab.json': flow(
    'iswc-fab: position',
    [
      { id: 'q', label: 'position=?', shape: 'diamond' },
      { id: 'a', label: 'inline → en flujo', shape: 'stadium' },
      { id: 'b', label: 'esquina fixed', shape: 'stadium' },
      { id: 'c', label: 'pulse?', shape: 'diamond' },
      { id: 'd', label: 'anillo de atención', shape: 'round' },
    ],
    [
      { from: 'q', to: 'a', label: 'inline' },
      { from: 'q', to: 'b', label: 'corner' },
      { from: 'a', to: 'c' },
      { from: 'b', to: 'c' },
      { from: 'c', to: 'd', label: 'si' },
    ],
    'position fija vs inline; pulse es atención opcional.',
  ),

  'navigation/iswc-carousel.json': flow(
    'iswc-carousel: autoplay',
    [
      { id: 'q', label: 'autoplay?', shape: 'diamond' },
      { id: 'a', label: 'timer (+ pause hover)', shape: 'stadium' },
      { id: 'b', label: 'solo manual', shape: 'stadium' },
      { id: 'c', label: 'without-controls?', shape: 'diamond' },
      { id: 'd', label: 'sin flechas', shape: 'round' },
    ],
    [
      { from: 'q', to: 'a', label: 'si' },
      { from: 'q', to: 'b', label: 'no' },
      { from: 'a', to: 'c' },
      { from: 'b', to: 'c' },
      { from: 'c', to: 'd', label: 'si' },
    ],
    'autoplay y flags de chrome (controls/indicators).',
  ),

  'layout/iswc-callout.json': flow(
    'iswc-callout: icono',
    [
      { id: 'q', label: 'slot icon?', shape: 'diamond' },
      { id: 'a', label: 'override slot', shape: 'stadium' },
      { id: 'b', label: 'icon=""?', shape: 'diamond' },
      { id: 'c', label: 'sin icono', shape: 'stadium' },
      { id: 'd', label: 'default por color', shape: 'stadium' },
    ],
    [
      { from: 'q', to: 'a', label: 'si' },
      { from: 'q', to: 'b', label: 'no' },
      { from: 'b', to: 'c', label: 'si' },
      { from: 'b', to: 'd', label: 'no' },
    ],
    'color sugiere icono; slot o icon vacío lo anulan.',
  ),
};

let ok = 0;
let skip = 0;
let miss = 0;

for (const [rel, spec] of Object.entries(FLOWS)) {
  const path = join(previews, rel);
  let raw;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    console.warn('MISS', rel);
    miss += 1;
    continue;
  }
  const data = JSON.parse(raw);
  const intro = data.sections?.find((s) => s.id === 'intro') || data.sections?.[0];
  let demo = intro?.blocks?.find((b) => b.kind === 'demo');
  if (!demo) {
    for (const s of data.sections || []) {
      demo = (s.blocks || []).find((b) => b.kind === 'demo');
      if (demo) break;
    }
  }
  if (!demo) {
    console.warn('NO-DEMO', rel);
    miss += 1;
    continue;
  }
  if (demo.equivFlow) {
    // Refresh animation token if missing
    if (!demo.equivFlow.includes('animation=')) {
      demo.equivFlow = demo.equivFlow.replace(
        '<iswc-flowchart open-on-click>',
        '<iswc-flowchart open-on-click animation="flow">',
      );
      writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
      console.log('PATCH-ANIM', rel);
      ok += 1;
    } else {
      console.log('SKIP', rel);
      skip += 1;
    }
    continue;
  }
  demo.equivNote = spec.note;
  if (!demo.equivHtml) {
    demo.equivHtml = '<!-- ver diagrama de ramas -->';
  }
  demo.equivFlow = spec.html;
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
  console.log('ADD', rel);
  ok += 1;
}

console.log(`\ninject-equiv-flows: +${ok} skip=${skip} miss=${miss}`);
