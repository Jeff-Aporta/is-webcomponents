/**
 * preview-controls-tabs.test.ts — Guardián del contrato W20.
 *
 * Phase W20 (2026-10-03-zod-migration): el panel de controles (<iswc-preview-controls>)
 * tiene 2 tabs:
 *
 *   - "Attrs" (default): la grilla de inputs/selects/switches del spec.
 *   - "Code"           : la anatomía del componente target (Shadow DOM
 *                        template), read-only, en un <pre class="code"> que
 *                        `scripts/highlight-pre.js` puede pintar.
 *
 * El panel debe detectar la anatomía automáticamente:
 *   1) `ctor.__TEMPLATE` si el CE lo expone.
 *   2) Si no, instancia un hidden <{tag}> y lee su `shadowRoot.innerHTML`.
 *
 * Si reescribes el panel y:
 *   - pierdes las tabs `.tab--attrs` / `.tab--code`,
 *   - cambias el contrato del pre `data-role="anatomy"`,
 *   - rompes la detección automática (la keyword `__TEMPLATE` o el fallback
 *     de `shadowRoot.innerHTML` desaparecen),
 *   - olvidas pasar el `tag` desde el playground/controles,
 * el guardián falla con un mensaje claro.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '../../../..');

const CTRL_TS = join(root, 'src/components/layout/preview-controls.ts');
const PG_TS = join(root, 'src/components/preview/playground.ts');
const CTLS_TS = join(root, 'src/utils/system/controles.ts');

const ctrlTs = readFileSync(CTRL_TS, 'utf8');
const pgTs = readFileSync(PG_TS, 'utf8');
const ctlsTs = readFileSync(CTLS_TS, 'utf8');

test('W20: fuente preview-controls.ts existe', () => {
  assert.ok(existsSync(CTRL_TS), 'falta src/components/layout/preview-controls.ts');
});

test('W20: el panel declara la nav de tabs con data-tab="attrs" y data-tab="code"', () => {
  // Atributo HTML en el template (data-tab="attrs"/"code" → el test del
  // selector tambien valida que se usan en los listeners de click).
  assert.match(
    ctrlTs,
    /data-tab="attrs"/,
    'preview-controls.ts debe declarar el botón de tab con data-tab="attrs"',
  );
  assert.match(
    ctrlTs,
    /data-tab="code"/,
    'preview-controls.ts debe declarar el botón de tab con data-tab="code"',
  );
  // El bloque .tabs con role="tablist" es lo que el test E2E valida
  // (`role="tablist"` + `aria-selected`).
  assert.match(
    ctrlTs,
    /role="tablist"/,
    'preview-controls.ts debe declarar el nav con role="tablist"',
  );
});

test('W20: el panel cablea click en ambas pestañas', () => {
  assert.match(
    ctrlTs,
    /tabAttrs[\s\S]*?addEventListener\(['"]click['"]/,
    'preview-controls.ts debe cablear click en el tab Attrs',
  );
  assert.match(
    ctrlTs,
    /tabCode[\s\S]*?addEventListener\(['"]click['"]/,
    'preview-controls.ts debe cablear click en el tab Code',
  );
  // Y actualiza aria-selected en ambos sentidos.
  assert.match(
    ctrlTs,
    /aria-selected/,
    'preview-controls.ts debe alternar aria-selected al cambiar de tab',
  );
});

test('W20: el tab Code contiene el <pre data-role="anatomy"> read-only', () => {
  assert.match(
    ctrlTs,
    /data-role="anatomy"/,
    'preview-controls.ts debe declarar el <pre> con data-role="anatomy" para el Shadow DOM',
  );
  // El pre no es un control editable: ningún listener 'input' añadido.
  // La forma mas estable: ningún addEventListener sobre el pre.
  // (Verificacion flexible: el pre lleva class="code" y un atributo que lo
  //  marca como read-only visual, p.ej. spellcheck="false" o readonly via CSS.)
  assert.match(
    ctrlTs,
    /class="[^"]*\bcode\b[^"]*"/,
    'el pre de anatomia debe llevar la clase "code" para que highlight-pre.js lo pinte',
  );
  assert.match(
    ctrlTs,
    /spellcheck="false"/,
    'el pre de anatomia debe declararse spellcheck="false" (read-only visual)',
  );
});

test('W20: la detección de anatomía usa __TEMPLATE y el fallback de shadowRoot.innerHTML', () => {
  // 1) Camino feliz: __TEMPLATE estático.
  assert.match(
    ctrlTs,
    /__TEMPLATE/,
    'preview-controls.ts debe intentar leer ctor.__TEMPLATE primero',
  );
  // 2) Fallback: instancia un hidden element y lee su shadowRoot.innerHTML.
  assert.match(
    ctrlTs,
    /shadowRoot/,
    'preview-controls.ts debe usar shadowRoot (instancia hidden) como fallback',
  );
  assert.match(
    ctrlTs,
    /createElement\(\s*tag\s*\)|createElement\(\s*['"]\{tag\}['"]\s*\)|document\.createElement\(\s*['"]iswc-/,
    'preview-controls.ts debe crear un elemento con document.createElement (probing)',
  );
  // 3) El panel expone un getter `anatomy` para tests / consumidores.
  assert.match(
    ctrlTs,
    /get\s+anatomy\(\)/,
    'preview-controls.ts debe exponer un getter `anatomy` con la string detectada',
  );
});

test('W20: el atributo `tag` es observado y se refresca la anatomía al cambiar', () => {
  assert.match(
    ctrlTs,
    /observedAttributes[\s\S]*?['"]label['"][\s\S]*?['"]tag['"]|observedAttributes[\s\S]*?['"]tag['"][\s\S]*?['"]label['"]/,
    'observedAttributes debe incluir "label" y "tag"',
  );
  // El setter del atributo refresca la anatomía.
  assert.match(
    ctrlTs,
    /attributeChangedCallback[\s\S]*?['"]tag['"][\s\S]*?#refreshAnatomy|#refreshAnatomy/,
    'cambiar `tag` debe refrescar la anatomía (refreshAnatomy)',
  );
});

test('W20: el playground pasa el `tag` al panel', () => {
  // En #mountPanel, después de obtener el host, escribe el atributo tag.
  assert.match(
    pgTs,
    /#mountPanel[\s\S]*?#panel\.setAttribute\(\s*['"]tag['"]/,
    'playground.ts debe llamar a panel.setAttribute("tag", host.localName)',
  );
});

test('W20: el montarPanel de controles también pasa el `tag` al panel', () => {
  assert.match(
    ctlsTs,
    /panel\.setAttribute\(\s*['"]tag['"]/,
    'controles.ts (montarPanel) debe pasar el tag del host al panel',
  );
});
