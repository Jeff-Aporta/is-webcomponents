/**
 * w36-info-button-guardian.test.ts — Guardian del contrato W36.
 *
 * Phase W36 (2026-10-03-zod-migration): el panel de controles
 * (<iswc-preview-controls>) muestra un botón info (icono ⓘ) junto al label
 * de cada .fila. Al hacer click, abre un popover JSDoc-style con la
 * descripción, tipo, default, valores y ejemplo del control. La info llega
 * por el campo opcional `info: { … }` del JSON del playground, o se deriva
 * del propio control cuando no está presente.
 *
 * El guardian verifica:
 *   1. La fuente `preview-controls.ts` declara el tipo `PanelInfo` y lo
 *      expone en `ControlPanel.info`.
 *   2. Cada `.fila` generada por el panel lleva un botón info con
 *      `data-role="info-btn"` y un popover con `data-role="info-popover"`
 *      (oculto por defecto).
 *   3. Click en el botón alterna `aria-expanded` y muestra el popover.
 *   4. El popover muestra la información del control: `description`,
 *      `type`, `default`, `values` y `example` cuando están presentes, y
 *      deriva lo que puede del control cuando no.
 *   5. El campo opcional `info` está documentado en el schema JSON
 *      `controls.schema.json` para que el campo nuevo del playground sea
 *      válido (sin warnear como "no documentado").
 *   6. El type ControlDef de `src/utils/system/controles.ts` acepta
 *      `info?: PanelInfoDef` (espejo del panel).
 *   7. El montarPanel de controles propaga `info` al spec del panel (no
 *      lo filtra con la deserialización del control).
 *
 * Si reescribes el panel y:
 *   - quitas el botón info o el popover JSDoc,
 *   - rompes el contrato del campo `info` del JSON,
 *   - olvidas alternar `aria-expanded` al hacer click,
 * el guardian falla con un mensaje claro.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');

const CTRL_TS = join(root, 'src/components/layout/preview-controls.ts');
const CTRL_SCHEMAS_TS = join(root, 'src/components/layout/preview-controls.schemas.ts');
const CTLS_TS = join(root, 'src/utils/system/controles.ts');
const CTLS_SCHEMAS_TS = join(root, 'src/utils/system/controles.schemas.ts');
const SCHEMA = join(root, 'src/utils/system/controls/controls.schema.json');

const ctrlTs = readFileSync(CTRL_TS, 'utf8');
const ctrlSchemasTs = readFileSync(CTRL_SCHEMAS_TS, 'utf8');
const ctlsTs = readFileSync(CTLS_TS, 'utf8');
const ctlsSchemasTs = readFileSync(CTLS_SCHEMAS_TS, 'utf8');
const schema = JSON.parse(readFileSync(SCHEMA, 'utf8')) as {
  definitions?: { control?: { properties?: Record<string, unknown> } };
};

test('W36: preview-controls.schemas.ts exporta PanelInfo con description/type/default/values/example', () => {
  assert.match(ctrlSchemasTs, /export\s+type\s+PanelInfo\b/, 'debe declarar export type PanelInfo');
  // Zod schema: el campo es `description: z.X().optional()` (sin `?`).
  assert.match(ctrlSchemasTs, /\bdescription\s*:/);
  assert.match(ctrlSchemasTs, /\btype\s*:/);
  assert.match(ctrlSchemasTs, /\bdefault\s*:/);
  assert.match(ctrlSchemasTs, /\bvalues\s*:/);
  assert.match(ctrlSchemasTs, /\bexample\s*:/);
});

test('W36: ControlPanel acepta info?: PanelInfo', () => {
  assert.match(ctrlSchemasTs, /info\s*:\s*PanelInfoSchema/,
    'ControlPanel debe declarar info: PanelInfoSchema (campo opcional)');
});

test('W36: cada .fila genera un botón info junto al label', () => {
  // El botón lleva data-role="info-btn" y un icono mdi:information-outline.
  assert.match(ctrlTs, /data-role\s*=\s*['"]info-btn['"]/,
    '#infoBtn debe usar data-role="info-btn" en el botón');
  assert.match(ctrlTs, /['"]mdi:information-outline['"]/,
    'el botón debe usar el icono mdi:information-outline');
  assert.match(ctrlTs, /Info del atributo/,
    'el botón debe llevar aria-label informativo (template `Info del atributo …`)');
  // El popover lleva data-role="info-popover" + role="dialog".
  assert.match(ctrlTs, /data-role\s*=\s*['"]info-popover['"]/,
    '#infoPopover debe usar data-role="info-popover"');
  assert.match(ctrlTs, /setAttribute\s*\(\s*['"]role['"]\s*,\s*['"]dialog['"]\s*\)/,
    'el popover debe llevar role="dialog"');
});

test('W36: el botón info alterna aria-expanded al hacer click', () => {
  // El listener de click debe llamar a #toggleInfoPopover.
  assert.match(
    ctrlTs,
    /info-btn[\s\S]*?addEventListener\(['"]click['"][\s\S]*?#toggleInfoPopover/,
    'el botón info debe cablear click → #toggleInfoPopover',
  );
  // El popover debe actualizar aria-expanded en el botón al cambiar.
  assert.match(
    ctrlTs,
    /#toggleInfoPopover[\s\S]*?aria-expanded/,
    '#toggleInfoPopover debe alternar aria-expanded del botón',
  );
});

test('W36: el popover se cierra con click fuera y con Escape', () => {
  // Hay un handler de click fuera (capture) y un handler de Escape en document.
  assert.match(ctrlTs, /document\.addEventListener\(['"]click['"]/,
    'el panel debe instalar un listener de click fuera en document');
  assert.match(ctrlTs, /document\.addEventListener\(['"]keydown['"]/,
    'el panel debe instalar un listener de keydown para Escape');
  assert.match(ctrlTs, /ev\.key\s*!==\s*['"]Escape['"]/,
    'el handler de keydown debe ignorar teclas que no son Escape');
});

test('W36: el popover muestra descripción, tipo, default, valores y ejemplo', () => {
  // Renderizado de la lista (dl) del popover:
  assert.match(ctrlTs, /info\.description/);
  assert.match(ctrlTs, /info\.type/);
  assert.match(ctrlTs, /info\.default/);
  assert.match(ctrlTs, /info\.values/);
  assert.match(ctrlTs, /info\.example/);
  // Etiquetas de la lista (en español, como el resto del panel):
  for (const txt of ['Descripción', 'Default', 'Valores', 'Ejemplo']) {
    assert.match(ctrlTs, new RegExp(`['"\`]${txt}['"\`]`),
      `el popover debe etiquetar la fila del dl con "${txt}"`);
  }
});

test('W36: cuando falta info, el popover deriva tipo y default del control', () => {
  // inferControlType + uso en #derivePanelInfo.
  assert.match(ctrlTs, /inferControlType/,
    '#derivePanelInfo debe llamar a inferControlType');
  // Inferir boolean / number / enum / color / string.
  assert.match(ctrlTs, /case\s+['"]boolean['"]/);
  assert.match(ctrlTs, /case\s+['"]select['"]/);
});

test('W36: el botón info lleva un <iswc-icon> con el icono info-outline', () => {
  assert.match(ctrlTs, /createElement\(['"]iswc-icon['"]\)[\s\S]*?information-outline/,
    'el botón debe inyectar un <iswc-icon> con mdi:information-outline');
});

test('W36: controles.schemas.ts (ControlDef) acepta info?: PanelInfoDef', () => {
  assert.match(ctlsSchemasTs, /PanelInfoDef/,
    'controles.schemas.ts debe exportar el tipo PanelInfoDef');
  assert.match(ctlsSchemasTs, /info\s*:\s*PanelInfoDefSchema/,
    'ControlDef debe declarar info: PanelInfoDefSchema');
});

test('W36: controls.schema.json documenta el campo info (sin warnear)', () => {
  const controlProps = schema.definitions?.control?.properties ?? {};
  assert.ok(controlProps.info, 'controls.schema.json debe documentar `info` en el control');
  const info = controlProps.info as {
    type?: string;
    properties?: Record<string, unknown>;
  };
  assert.equal(info.type, 'object');
  assert.ok(info.properties, 'info debe declarar sus propiedades');
  for (const key of ['description', 'type', 'default', 'values', 'example']) {
    assert.ok(
      info.properties[key],
      `info debe documentar la propiedad "${key}"`,
    );
  }
});