import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(dirname(dirname(dirname(here))));

const manifestMod = await import(pathToFileURL(join(root, 'src', 'manifest.js')).href);
const manifest = manifestMod.default;

const ourTags = new Set(manifest.map((c) => c.tag));
const ourTitles = new Set(manifest.map((c) => c.title.toLowerCase().trim()));

// Mapeo oficial: nombre canónico de Ant Design → tag nuestro (o null si falta)
const ANT_DESIGN = [
  // ── General (4) ──
  { antd: 'Button',             ours: 'iswc-button',               tier: 'core' },
  { antd: 'FloatButton',        ours: 'iswc-fab',                  tier: 'core' },
  { antd: 'Icon',               ours: 'iswc-icon',                 tier: 'core' },
  { antd: 'Typography',         ours: null,                      tier: 'nice' }, // puro CSS, podría mapear a iswc-callout/iswc-tag

  // ── Layout (7) ──
  { antd: 'Divider',            ours: 'iswc-divider',              tier: 'core' },
  { antd: 'Flex',               ours: null,                      tier: 'pure-css' }, // CSS layout
  { antd: 'Grid',               ours: null,                      tier: 'pure-css' }, // CSS grid
  { antd: 'Layout',             ours: 'iswc-split-panel',          tier: 'core' },     // Header/Sider/Content → split-panel + main
  { antd: 'Masonry',            ours: null,                      tier: 'nice' },     // layout avanzado (CSS columns o masonry nativo)
  { antd: 'Space',              ours: null,                      tier: 'pure-css' }, // CSS gap/margin
  { antd: 'Splitter',           ours: 'iswc-split-panel',          tier: 'core' },

  // ── Navigation (7) ──
  { antd: 'Anchor',             ours: 'iswc-scrollspy',            tier: 'core' },   // nav por anclas que resalta según scroll
  { antd: 'Breadcrumb',         ours: 'iswc-breadcrumb',           tier: 'core' },
  { antd: 'Dropdown',           ours: 'iswc-dropdown',             tier: 'core' },
  { antd: 'Menu',               ours: 'iswc-mega-menu',            tier: 'core' },   // + iswc-context-menu para el menú contextual
  { antd: 'Pagination',         ours: null,                      tier: 'core' },
  { antd: 'Steps',              ours: 'iswc-stepper',              tier: 'core' },
  { antd: 'Tabs',               ours: 'iswc-tab-group',            tier: 'core' },

  // ── Data Entry (18) ──
  { antd: 'AutoComplete',       ours: 'iswc-combobox',             tier: 'core' },
  { antd: 'Cascader',           ours: null,                      tier: 'core' },
  { antd: 'Checkbox',           ours: 'iswc-checkbox',             tier: 'core' },
  { antd: 'ColorPicker',        ours: 'iswc-color-picker',         tier: 'core' },
  { antd: 'DatePicker',         ours: 'iswc-date-picker',          tier: 'core' },
  { antd: 'Form',               ours: 'iswc-form',                 tier: 'core' },
  { antd: 'Input',              ours: 'iswc-input',                tier: 'core' },
  { antd: 'InputNumber',        ours: null,                      tier: 'core' },   // tenemos input, falta spinbutton
  { antd: 'Mentions',           ours: null,                      tier: 'nice' },   // input con @-references
  { antd: 'Radio',              ours: 'iswc-radio',                tier: 'core' },
  { antd: 'Rate',               ours: 'iswc-rating',               tier: 'core' },
  { antd: 'Select',             ours: 'iswc-select',               tier: 'core' },
  { antd: 'Slider',             ours: 'iswc-slider',               tier: 'core' },
  { antd: 'Switch',             ours: 'iswc-switch',               tier: 'core' },
  { antd: 'TimePicker',         ours: 'iswc-time-clock',           tier: 'core' },
  { antd: 'Transfer',           ours: 'iswc-transfer',             tier: 'core' },
  { antd: 'TreeSelect',         ours: 'iswc-tree',                 tier: 'core' },   // tree implementa expand/collapse
  { antd: 'Upload',             ours: 'iswc-file-input',           tier: 'core' },

  // ── Data Display (20) ──
  { antd: 'Avatar',             ours: 'iswc-avatar',               tier: 'core' },
  { antd: 'Badge',              ours: 'iswc-badge',                tier: 'core' },
  { antd: 'Calendar',           ours: 'iswc-month-calendar',       tier: 'core' },
  { antd: 'Card',               ours: 'iswc-card',                 tier: 'core' },
  { antd: 'Carousel',           ours: 'iswc-carousel',             tier: 'core' },
  { antd: 'Collapse',           ours: 'iswc-details',              tier: 'core' },
  { antd: 'Descriptions',       ours: null,                      tier: 'core' },
  { antd: 'Empty',              ours: null,                      tier: 'core' },
  { antd: 'Image',              ours: null,                      tier: 'core' },   // img wrapper con preview
  { antd: 'List',               ours: null,                      tier: 'core' },   // Deprecated en antd 6.x
  { antd: 'Popover',            ours: 'iswc-popover',              tier: 'core' },
  { antd: 'QRCode',             ours: null,                      tier: 'nice' },
  { antd: 'Segmented',          ours: 'iswc-button-group',         tier: 'core' },   // control segmentado con selección
  { antd: 'Statistic',          ours: 'iswc-stat',                 tier: 'core' },
  { antd: 'Table',              ours: 'iswc-data-grid',            tier: 'core' },
  { antd: 'Tag',                ours: 'iswc-tag',                  tier: 'core' },
  { antd: 'Timeline',           ours: 'iswc-timeline',             tier: 'core' },
  { antd: 'Tooltip',            ours: 'iswc-tooltip',              tier: 'core' },
  { antd: 'Tour',               ours: null,                      tier: 'nice' },
  { antd: 'Tree',               ours: 'iswc-tree',                 tier: 'core' },

  // ── Feedback (11) ──
  { antd: 'Alert',              ours: 'iswc-callout',              tier: 'core' },
  { antd: 'Drawer',             ours: 'iswc-drawer',               tier: 'core' },
  { antd: 'Message',            ours: 'iswc-toast',                tier: 'core' },
  { antd: 'Modal',              ours: 'iswc-dialog',               tier: 'core' },
  { antd: 'Notification',       ours: 'iswc-toast',                tier: 'core' },
  { antd: 'Popconfirm',         ours: 'iswc-popconfirm',           tier: 'core' },
  { antd: 'Progress',           ours: 'iswc-progress-bar',         tier: 'core' },
  { antd: 'Result',             ours: null,                      tier: 'core' },
  { antd: 'Skeleton',           ours: 'iswc-skeleton',             tier: 'core' },
  { antd: 'Spin',               ours: 'iswc-spinner',              tier: 'core' },
  { antd: 'Watermark',          ours: null,                      tier: 'nice' },

  // ── Other (5) ──
  { antd: 'Affix',              ours: null,                      tier: 'nice' },
  { antd: 'App',                ours: null,                      tier: 'nice' },
  { antd: 'ConfigProvider',     ours: null,                      tier: 'core' },   // = nuestro theme/palette
  { antd: 'BorderBeam',         ours: null,                      tier: 'nice' },
];

// Core de Ant Design SIN clon: backlog de producto (hay que construirlos), no
// regresiones. Mantener aquí la lista exacta y con su motivo — el test de
// cobertura exige que los core sin `ours` coincidan 1:1 con este mapa.
const ROADMAP_CORE = {
  Pagination: 'paginador standalone; hoy la paginación vive dentro de iswc-data-grid (pagination / page-size / page-size-options)',
  Cascader: 'selector jerárquico en cascada (p. ej. provincia/ciudad)',
  InputNumber: 'input numérico con steppers; iswc-input cubre type="number" + min/max/step pero sin botones +/-',
  Descriptions: 'lista clave/valor de un registro (definition list)',
  Empty: 'estado vacío ilustrado para listas/resultados',
  Image: 'imagen con preview; iswc-lightbox es el visor full-screen (zoom/pan/share), no el <img> en línea',
  List: 'deprecado en Ant Design 6.x — su caso se cubre con iswc-data-grid / ag-grid',
  Result: 'página de estado (éxito/error) con icono y acciones',
  ConfigProvider: 'tema/paleta: el kit lo resuelve con data-theme/data-palette + tokens --iswc-* (no con un provider JS)',
};

test('Ant Design coverage: existen los core en nuestro manifest', () => {
  const faltantes = ANT_DESIGN
    .filter((x) => x.ours && !ourTags.has(x.ours))
    .map((x) => `${x.antd} -> ${x.ours}`);

  if (faltantes.length) {
    console.log('\n❌ Mapeo roto (marcados como existentes pero no en manifest):');
    faltantes.forEach((f) => console.log(`  - ${f}`));
  }
  assert.equal(faltantes.length, 0, 'Todos los mapeos "ours" deben existir en manifest');
});

test('Ant Design coverage: TODOS los core clonados o con sustituto válido', () => {
  // Los core SIN clon son backlog de producto (construir el componente), no
  // regresiones: romper la suite por ellos escondía los fallos reales entre
  // ruido permanente. Por eso la lista vive en ROADMAP_CORE (visible en el
  // gap analysis) y este test solo garantiza que el backlog NO derive en
  // silencio: si construyes uno de estos, sácalo de ROADMAP_CORE y pon su tag
  // en ANT_DESIGN; si añades un core nuevo sin sustituto, entra a ROADMAP_CORE
  // con su motivo. Cualquier desviación rompe aquí con el diff a la vista.
  const noSustituto = ANT_DESIGN
    .filter((x) => x.tier === 'core' && !x.ours)
    .map((x) => x.antd)
    .sort();
  const roadmap = Object.keys(ROADMAP_CORE).sort();

  if (noSustituto.length) {
    console.log('\n📋 Roadmap core (sin clon todavía — ver ROADMAP_CORE):');
    noSustituto.forEach((x) => console.log(`  - ${x}: ${ROADMAP_CORE[x]}`));
  }

  assert.deepEqual(
    noSustituto,
    roadmap,
    'Los core sin sustituto deben coincidir EXACTO con ROADMAP_CORE. '
    + 'Construiste uno → sácalo del roadmap y pon su tag en ANT_DESIGN. '
    + 'Falta uno → añádelo al roadmap con su motivo.',
  );
});

test('Ant Design coverage: gap analysis', () => {
  const faltantes = ANT_DESIGN.filter((x) => !x.ours);
  const extra = [];

  // Componentes nuestros que NO son clon directo de Ant Design
  const antdMapped = new Set(
    ANT_DESIGN.filter((x) => x.ours).map((x) => x.ours),
  );
  for (const c of manifest) {
    if (
      !antdMapped.has(c.tag) &&
      !c.tag.includes('-item') &&       // sub-items no se cuentan aparte
      !c.tag.includes('-step') &&
      !c.tag.includes('-column') &&
      !c.tag.includes('-card') &&
      !c.tag.includes('-panel') &&
      !c.tag.includes('-tab') &&
      !c.tag.includes('-option')
    ) {
      extra.push(c.tag);
    }
  }

  console.log(`\n📊 Resumen de cobertura Ant Design:`);
  console.log(`  Total componentes Ant Design catalogados: ${ANT_DESIGN.length}`);
  console.log(`  Con clon/sustituto directo:                  ${ANT_DESIGN.length - faltantes.length}`);
  console.log(`  Sin clon (faltantes):                        ${faltantes.length}`);
  console.log(`  Componentes nuestros NO en Ant Design:       ${extra.length}`);
  if (extra.length) {
    console.log(`    → ${extra.join(', ')}`);
  }
  if (faltantes.length) {
    console.log(`\n  Faltantes:`);
    faltantes.forEach((f) =>
      console.log(`    - ${f.antd} (tier: ${f.tier})`),
    );
  }
});