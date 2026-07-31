/**
 * Verifica que el motor de layout migrado produzca EXACTAMENTE la misma
 * geometría que el original de jagudeloe (bundle compilado en dist/).
 *
 * Si el original no está disponible, el check se salta con aviso (no falla):
 * es una comprobación cruzada entre proyectos, no una dependencia.
 */
import assert from 'node:assert';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const ORIG = 'C:/ContaPyme/Personal/apps/jagudeloe/frontend/dist/js/core/tk-sequence.js';

const mine = await import('./sequence-spec.js');

if (!existsSync(ORIG)) {
  console.log('sequence parity: SKIP (original dist no encontrado)');
  process.exit(0);
}
const orig = await import(pathToFileURL(ORIG).href);

/** Compara en profundidad y reporta la primera ruta divergente. */
function diff(a, b, path = '') {
  if (a === b) return null;
  if (typeof a === 'number' && typeof b === 'number') {
    return Math.abs(a - b) < 1e-9 ? null : `${path}: ${a} !== ${b}`;
  }
  if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') {
    return `${path}: ${JSON.stringify(a)} !== ${JSON.stringify(b)}`;
  }
  if (Array.isArray(a) !== Array.isArray(b)) return `${path}: array/objeto`;
  if (Array.isArray(a) && a.length !== b.length) return `${path}.length: ${a.length} !== ${b.length}`;
  const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of keys) {
    const d = diff(a[k], b[k], path ? `${path}.${k}` : k);
    if (d) return d;
  }
  return null;
}

let checks = 0;
function compareLayout(name, specMine, specOrig) {
  const lm = mine.computeSequenceLayout(specMine);
  const lo = orig.computeSequenceLayout(specOrig);
  const d = diff(lm, lo);
  assert.strictEqual(d, null, `layout distinto en ${name} → ${d}`);
  checks++;
}

// 1. Preset TK-1437191 (el diagrama a migrar).
compareLayout('tk1437191', mine.tk1437191SequenceSpec(), orig.tk1437191SequenceSpec());

// 2. Preset TK-1431662 (ejercita alt/branches, preamble y epilogue).
compareLayout('tk1431662', mine.tk1431662SequenceSpec(), orig.tk1431662SequenceSpec());

// 3. Payload inline mínimo — el camino que usará cualquier diagrama nuevo.
const inline = {
  sequence: {
    title: 'Prueba',
    subtitle: 'payload inline',
    actors: [
      { id: 'U', label: '{{iconify: {icon: "mdi:account", hue: 239}}} Usuario', kind: 'actor' },
      { id: 'S', label: 'Servicio' },
    ],
    groups: [{ id: 'g1', name: 'Grupo uno', hue: 199 }],
    messages: [
      { id: 'a', from: 'U', to: 'S', label: 'pide algo', group: 'g1', step: 1, log: 'log a' },
      { id: 'b', from: 'S', to: 'S', label: 'procesa', kind: 'self', step: 2 },
      { id: 'c', from: 'S', to: 'U', label: 'responde', kind: 'async', step: 3 },
    ],
  },
};
compareLayout('inline', mine.resolveSequenceSpec(inline), orig.resolveSequenceSpec(inline));

// 4. Ocultar un grupo debe re-diseñar igual en ambos.
const hidden = new Set(['grp-calif']);
const pm = mine.sequencePayloadHideGroups({ preset: 'tk1437191' }, hidden);
const po = orig.sequencePayloadHideGroups({ preset: 'tk1437191' }, hidden);
assert.strictEqual(diff(pm, po), null, 'sequencePayloadHideGroups difiere');
compareLayout('tk1437191 sin grp-calif', mine.resolveSequenceSpec(pm), orig.resolveSequenceSpec(po));

// 5. Serialización a JSON (lo que muestra el editor de código del visor).
assert.strictEqual(
  diff(
    mine.expandSequencePayloadForJson({ preset: 'tk1437191' }),
    orig.expandSequencePayloadForJson({ preset: 'tk1437191' }),
  ),
  null,
  'expandSequencePayloadForJson difiere',
);

// 6. Temas y tooltip.
// Los campos estructurales (texto/grid/chip) deben seguir siendo idénticos al
// original; el tinte del alt-box (altFill/altBorder) es una mejora visual
// deliberada posterior al port (antes era 'transparent' + borde punteado
// gris, ahora lleva un tinte índigo con presencia propia) — se excluye a
// propósito de la comparación byte a byte.
const THEME_VISUAL_FIELDS = new Set(['altFill', 'altBorder']);
function diffThemeStructural(a, b) {
  const filtered = (obj) => Object.fromEntries(Object.entries(obj).filter(([k]) => !THEME_VISUAL_FIELDS.has(k)));
  return diff(filtered(a), filtered(b));
}
assert.strictEqual(diffThemeStructural(mine.sequenceThemeDark(), orig.sequenceThemeDark()), null, 'tema dark difiere en campos estructurales');
assert.strictEqual(diffThemeStructural(mine.sequenceThemeLight(), orig.sequenceThemeLight()), null, 'tema light difiere en campos estructurales');
const m1 = mine.tk1437191SequenceSpec().messages[0];
assert.strictEqual(
  mine.sequenceMessageTooltipText(m1),
  orig.sequenceMessageTooltipText(m1),
  'texto de tooltip difiere',
);

// 7. Etiquetas: iconify inline + markdown deben producir el MISMO HTML, que es
//    lo que define el aspecto del texto en actores, mensajes y chip de tortuga.
const HTML_SRC = 'C:/ContaPyme/Personal/apps/jagudeloe/frontend/dist/js/ui/tkHtml.js';
if (existsSync(HTML_SRC)) {
  const origHtml = await import(pathToFileURL(HTML_SRC).href);
  const myMd = await import('../_shared/tk-inline-md.js');
  const samples = [
    'texto plano',
    '**negrilla** y `código`',
    'POST /api/mensaje · calificar {{thumb-up}}/{{thumb-down}}',
    '{{iconify: {icon: "mdi:account", hue: 239}}} Usuario',
    'La API devuelve **`mensajesOpenAI[]`** con **`fecha_hora`** (desde `meta.ts` del log)',
    '[enlace](https://example.com) y <b>html crudo</b>',
    'sin cierre {{ raro',
  ];
  for (const s of samples) {
    assert.strictEqual(myMd.inlineMdWeb(s), origHtml.inlineMdWeb(s), `inlineMdWeb difiere en: ${s}`);
  }

  const origIcon = await import(pathToFileURL('C:/ContaPyme/Personal/apps/jagudeloe/frontend/dist/js/core/tk-iconify-inline.js').href);
  const myIcon = await import('../_shared/tk-iconify-inline.js');
  for (const s of samples) {
    assert.strictEqual(myIcon.stripIconifyTokensPlain(s), origIcon.stripIconifyTokensPlain(s), `strip difiere: ${s}`);
    assert.strictEqual(myIcon.countIconifyTokens(s), origIcon.countIconifyTokens(s), `count difiere: ${s}`);
    assert.strictEqual(
      JSON.stringify(myIcon.extractLeadingIconifyToken(s)),
      JSON.stringify(origIcon.extractLeadingIconifyToken(s)),
      `extractLeading difiere: ${s}`,
    );
  }
  assert.strictEqual(
    myIcon.iconifyApiUrl('mdi:account', 239, 32),
    origIcon.iconifyApiUrl('mdi:account', 239, 32),
    'iconifyApiUrl difiere',
  );
  console.log('label parity: PASS (inlineMdWeb + iconify sobre 7 muestras)');
} else {
  console.log('label parity: SKIP (original dist no encontrado)');
}

console.log(`sequence parity: PASS (${checks} layouts idénticos + payload/JSON/temas)`);
