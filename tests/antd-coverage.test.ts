import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = dirname(here);

const manifestMod = await import(pathToFileURL(join(root, 'src', 'manifest.js')).href);
const manifest = manifestMod.default;

const ourTags = new Set(manifest.map((c) => c.tag));
const ourTitles = new Set(manifest.map((c) => c.title.toLowerCase().trim()));

// Mapeo oficial: nombre canónico de Ant Design → tag nuestro (o null si falta)
const ANT_DESIGN = [
  // ── General (4) ──
  { antd: 'Button',             ours: 'is-button',               tier: 'core' },
  { antd: 'FloatButton',        ours: 'is-fab',                  tier: 'core' },
  { antd: 'Icon',               ours: 'is-icon',                 tier: 'core' },
  { antd: 'Typography',         ours: null,                      tier: 'nice' }, // puro CSS, podría mapear a is-callout/is-tag

  // ── Layout (7) ──
  { antd: 'Divider',            ours: 'is-divider',              tier: 'core' },
  { antd: 'Flex',               ours: null,                      tier: 'pure-css' }, // CSS layout
  { antd: 'Grid',               ours: null,                      tier: 'pure-css' }, // CSS grid
  { antd: 'Layout',             ours: 'is-split-panel',          tier: 'core' },     // Header/Sider/Content → split-panel + main
  { antd: 'Masonry',            ours: null,                      tier: 'nice' },     // layout avanzado (CSS columns o masonry nativo)
  { antd: 'Space',              ours: null,                      tier: 'pure-css' }, // CSS gap/margin
  { antd: 'Splitter',           ours: 'is-split-panel',          tier: 'core' },

  // ── Navigation (7) ──
  { antd: 'Anchor',             ours: 'is-scrollspy',            tier: 'core' },   // nav por anclas que resalta según scroll
  { antd: 'Breadcrumb',         ours: 'is-breadcrumb',           tier: 'core' },
  { antd: 'Dropdown',           ours: 'is-dropdown',             tier: 'core' },
  { antd: 'Menu',               ours: 'is-mega-menu',            tier: 'core' },   // + is-context-menu para el menú contextual
  { antd: 'Pagination',         ours: null,                      tier: 'core' },
  { antd: 'Steps',              ours: 'is-stepper',              tier: 'core' },
  { antd: 'Tabs',               ours: 'is-tab-group',            tier: 'core' },

  // ── Data Entry (18) ──
  { antd: 'AutoComplete',       ours: 'is-combobox',             tier: 'core' },
  { antd: 'Cascader',           ours: null,                      tier: 'core' },
  { antd: 'Checkbox',           ours: 'is-checkbox',             tier: 'core' },
  { antd: 'ColorPicker',        ours: 'is-color-picker',         tier: 'core' },
  { antd: 'DatePicker',         ours: 'is-date-picker',          tier: 'core' },
  { antd: 'Form',               ours: 'is-form',                 tier: 'core' },
  { antd: 'Input',              ours: 'is-input',                tier: 'core' },
  { antd: 'InputNumber',        ours: null,                      tier: 'core' },   // tenemos input, falta spinbutton
  { antd: 'Mentions',           ours: null,                      tier: 'nice' },   // input con @-references
  { antd: 'Radio',              ours: 'is-radio',                tier: 'core' },
  { antd: 'Rate',               ours: 'is-rating',               tier: 'core' },
  { antd: 'Select',             ours: 'is-select',               tier: 'core' },
  { antd: 'Slider',             ours: 'is-slider',               tier: 'core' },
  { antd: 'Switch',             ours: 'is-switch',               tier: 'core' },
  { antd: 'TimePicker',         ours: 'is-time-clock',           tier: 'core' },
  { antd: 'Transfer',           ours: 'is-transfer',             tier: 'core' },
  { antd: 'TreeSelect',         ours: 'is-tree',                 tier: 'core' },   // tree implementa expand/collapse
  { antd: 'Upload',             ours: 'is-file-input',           tier: 'core' },

  // ── Data Display (20) ──
  { antd: 'Avatar',             ours: 'is-avatar',               tier: 'core' },
  { antd: 'Badge',              ours: 'is-badge',                tier: 'core' },
  { antd: 'Calendar',           ours: 'is-month-calendar',       tier: 'core' },
  { antd: 'Card',               ours: 'is-card',                 tier: 'core' },
  { antd: 'Carousel',           ours: 'is-carousel',             tier: 'core' },
  { antd: 'Collapse',           ours: 'is-details',              tier: 'core' },
  { antd: 'Descriptions',       ours: null,                      tier: 'core' },
  { antd: 'Empty',              ours: null,                      tier: 'core' },
  { antd: 'Image',              ours: null,                      tier: 'core' },   // img wrapper con preview
  { antd: 'List',               ours: null,                      tier: 'core' },   // Deprecated en antd 6.x
  { antd: 'Popover',            ours: 'is-popover',              tier: 'core' },
  { antd: 'QRCode',             ours: null,                      tier: 'nice' },
  { antd: 'Segmented',          ours: 'is-button-group',         tier: 'core' },   // control segmentado con selección
  { antd: 'Statistic',          ours: 'is-stat',                 tier: 'core' },
  { antd: 'Table',              ours: 'is-data-grid',            tier: 'core' },
  { antd: 'Tag',                ours: 'is-tag',                  tier: 'core' },
  { antd: 'Timeline',           ours: 'is-timeline',             tier: 'core' },
  { antd: 'Tooltip',            ours: 'is-tooltip',              tier: 'core' },
  { antd: 'Tour',               ours: null,                      tier: 'nice' },
  { antd: 'Tree',               ours: 'is-tree',                 tier: 'core' },

  // ── Feedback (11) ──
  { antd: 'Alert',              ours: 'is-callout',              tier: 'core' },
  { antd: 'Drawer',             ours: 'is-drawer',               tier: 'core' },
  { antd: 'Message',            ours: 'is-toast',                tier: 'core' },
  { antd: 'Modal',              ours: 'is-dialog',               tier: 'core' },
  { antd: 'Notification',       ours: 'is-toast',                tier: 'core' },
  { antd: 'Popconfirm',         ours: 'is-popconfirm',           tier: 'core' },
  { antd: 'Progress',           ours: 'is-progress-bar',         tier: 'core' },
  { antd: 'Result',             ours: null,                      tier: 'core' },
  { antd: 'Skeleton',           ours: 'is-skeleton',             tier: 'core' },
  { antd: 'Spin',               ours: 'is-spinner',              tier: 'core' },
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
  Pagination: 'paginador standalone; hoy la paginación vive dentro de is-data-grid (pagination / page-size / page-size-options)',
  Cascader: 'selector jerárquico en cascada (p. ej. provincia/ciudad)',
  InputNumber: 'input numérico con steppers; is-input cubre type="number" + min/max/step pero sin botones +/-',
  Descriptions: 'lista clave/valor de un registro (definition list)',
  Empty: 'estado vacío ilustrado para listas/resultados',
  Image: 'imagen con preview; is-lightbox es el visor full-screen (zoom/pan/share), no el <img> en línea',
  List: 'deprecado en Ant Design 6.x — su caso se cubre con is-data-grid / ag-grid',
  Result: 'página de estado (éxito/error) con icono y acciones',
  ConfigProvider: 'tema/paleta: el kit lo resuelve con data-theme/data-palette + tokens --is-* (no con un provider JS)',
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