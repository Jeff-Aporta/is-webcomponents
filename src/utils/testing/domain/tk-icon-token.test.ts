import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  extractLeadingIconToken,
  hasIconJsonSugar,
  iconInlineHtmlWeb,
  resolveIconToken,
  splitIconRuns,
} from '../../../components/_shared/tk-icon-inline.ts';

test('{{"is-icon": {attrs}}} resuelve icono, color y el tag', () => {
  const raw = '{{"is-icon": {icon: mdi:key-variant, color: #e11}}} nombre_de_la_col';
  const lead = extractLeadingIconToken(raw);
  assert.equal(lead?.iconId, 'mdi:key-variant');
  assert.equal(lead?.color, '#e11');
  assert.equal(lead?.rest, 'nombre_de_la_col');
  assert.equal(hasIconJsonSugar(raw), true);
  const tok = resolveIconToken('"is-icon": {icon: mdi:key-variant, color: #e11}');
  assert.equal(tok?.iconId, 'mdi:key-variant');
  const html = iconInlineHtmlWeb(tok!.iconId, { attrs: tok!.attrs, hue: tok!.hue });
  assert.match(html, /^<is-icon\b/);
  assert.match(html, /icon="mdi:key-variant"/);
  assert.match(html, /color="#e11"/);
  assert.match(html, /style="[^"]*color:#e11/);
});

test('el sugar iconify legacy sigue igual', () => {
  const tok = resolveIconToken('iconify: {icon: "mdi:account", hue: 239}');
  assert.equal(tok?.iconId, 'mdi:account');
  assert.equal(tok?.hue, 239);
});

test('una fila parte icono y texto', () => {
  const runs = splitIconRuns('{{is-icon: {icon: "mdi:table", size: 14}}} clientes');
  assert.equal(runs.length, 2);
  assert.equal(runs[0]?.kind, 'icon');
  if (runs[0]?.kind === 'icon') {
    assert.equal(runs[0].token.iconId, 'mdi:table');
    assert.equal(runs[0].token.size, 14);
  }
  assert.equal(runs[1]?.kind, 'text');
});
