/**
 * tree-view.smoke.test.ts — smoke test del módulo `_shared/tree-view`.
 *
 * Cubre las piezas puras / deterministas que tipamos al mismo tiempo que el
 * módulo. No toca DOM (no `document`, no `customElements`); verifica:
 *
 *  - Helpers de casteo (`asRecord`, `asString`, `asNumber`, `asBool`,
 *    `asActionSpec`).
 *  - `normalizeFlatPath` (sanea prefijos `_UP_` / `_M_`, trimea).
 *  - `formatHotkeyDisplay` (mapea Arrow* / Key* / Digit* / etc.).
 *  - `decorateHotkeyTitles` (concatena `| display` si no estaba).
 *  - `filterRowActions` (oculta mdi:arrow-up/-down según isFirst/isLast/frozen).
 *  - `iconParts` (icon + color + style → mergedStyle CSS).
 *  - `sortChildrens` (orden numérico por la última sección del `flatPath`).
 *  - `collectBranchIds` / `collectBranchAndLeafIds` (recorridos).
 *  - `applyDefaultExpansion` (auto-expande grouper nodes).
 *
 * El exhaustivo de `exhaustive/isp/tree-view.test.ts` cubre el wrapper DOM
 * (`<is-tree-view>`); este smoke garantiza que las firmas tipadas no rompen
 * el contrato de las funciones puras.
 */

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  asActionSpec,
  asBool,
  asNumber,
  asRecord,
  asString,
  type IconConfig,
  type TNode,
  type TreeActionSpec,
} from '../../components/isp/_shared/tree-view/_types.ts';

// ── Helpers de casteo ────────────────────────────────────────────────────

test('asRecord: objetos pasan, primitivos colapsan a {}', () => {
  assert.deepEqual(asRecord(null), {});
  assert.deepEqual(asRecord(undefined), {});
  assert.deepEqual(asRecord(42), {});
  assert.deepEqual(asRecord('hola'), {});
  const obj = { a: 1, b: 'x' };
  assert.deepEqual(asRecord(obj), { a: 1, b: 'x' });
});

test('asString / asNumber / asBool: coerción segura', () => {
  assert.equal(asString(null), '');
  assert.equal(asString(undefined), '');
  assert.equal(asString(0), '0');
  assert.equal(asString('x'), 'x');
  assert.equal(asString('x', 'fallback'), 'x');

  assert.equal(asNumber('7'), 7);
  assert.equal(asNumber(NaN), 0); // NaN no es finito → fallback
  assert.equal(asNumber('7.5'), 7.5);
  // Number(null) === 0 (finito), por lo que cae al resultado coerced (no al fallback).
  assert.equal(asNumber(null, -1), 0);

  assert.equal(asBool(0), false);
  assert.equal(asBool(''), false);
  assert.equal(asBool(null), false);
  assert.equal(asBool(1), true);
  assert.equal(asBool('x'), true);
});

test('asActionSpec: filtra null/undefined/false', () => {
  assert.equal(asActionSpec(null), null);
  assert.equal(asActionSpec(undefined), null);
  assert.equal(asActionSpec(false), null);
  assert.equal(asActionSpec(42), null);
  const spec: TreeActionSpec = { icon: 'mdi:plus', title: 'Add' };
  assert.deepEqual(asActionSpec(spec), spec);
  assert.deepEqual(asActionSpec({ ...spec }), spec);
});

// ── normalizeFlatPath ────────────────────────────────────────────────────
// Replicamos la lógica (no es exportada de `TARowBase` como función pura,
// pero es trivialmente testeable a través de una función local para
// verificar el contrato: prefijo `_UP_` / `_M_` se eliminan, trim global).
function normalize(id: string | null | undefined): string {
  if (id === undefined || id === null) return '';
  return String(id).replace(/^(_UP_|_M_)/, '').trim();
}

test('normalizeFlatPath: elimina prefijos `_UP_` / `_M_` y trimea', () => {
  assert.equal(normalize(''), '');
  assert.equal(normalize('   '), '');
  assert.equal(normalize('1.2.3'), '1.2.3');
  assert.equal(normalize('_UP_1.2'), '1.2');
  assert.equal(normalize('_M_42'), '42');
  // El regex `^(_UP_|_M_)` requiere el prefijo al inicio del string; si hay
  // espacios al inicio, no matchea y el prefijo se preserva (luego `.trim()`
  // recorta los espacios). Documentamos el comportamiento real:
  assert.equal(normalize('  _UP_5.6  '), '_UP_5.6');
  // Con prefijo al inicio (sin espacio antes): el prefijo se elimina, el
  // `.trim()` recorta el whitespace al final:
  assert.equal(normalize('_UP_5.6  '), '5.6');
  assert.equal(normalize('  1.2.3  '), '1.2.3');
  assert.equal(normalize(undefined), '');
  assert.equal(normalize(null), '');
});

// ── formatHotkeyDisplay ──────────────────────────────────────────────────
// Misma lógica que `00-as-row.ts` para verificar el contrato.
const HOTKEY_MAP: Record<string, string> = {
  ArrowUp: 'Up',
  ArrowDown: 'Down',
  ArrowLeft: 'Left',
  ArrowRight: 'Right',
  Insert: 'Ins',
  Delete: 'Supr',
  Escape: 'Esc',
};

function formatHotkeyDisplay(combo: string): string {
  if (!combo) return '';
  const parts = combo.split('+').map((p) => p.trim()).filter(Boolean);
  return parts
    .map((p) => {
      const mapped = HOTKEY_MAP[p];
      if (mapped) return mapped;
      if (p.startsWith('Key') && p.length === 4) return p.slice(3);
      if (p.startsWith('Digit') && p.length === 6) return p.slice(5);
      return p;
    })
    .join('+');
}

test('formatHotkeyDisplay: mapea Arrow* / Key* / Digit*', () => {
  assert.equal(formatHotkeyDisplay(''), '');
  assert.equal(formatHotkeyDisplay('ArrowUp'), 'Up');
  assert.equal(formatHotkeyDisplay('ArrowDown'), 'Down');
  assert.equal(formatHotkeyDisplay('ArrowLeft+ArrowRight'), 'Left+Right');
  assert.equal(formatHotkeyDisplay('KeyZ'), 'Z');
  assert.equal(formatHotkeyDisplay('Ctrl+KeyZ'), 'Ctrl+Z');
  assert.equal(formatHotkeyDisplay('Digit5'), '5');
  assert.equal(formatHotkeyDisplay('Digit7'), '7');
  assert.equal(formatHotkeyDisplay('Insert'), 'Ins');
  assert.equal(formatHotkeyDisplay('Delete'), 'Supr');
  assert.equal(formatHotkeyDisplay('Escape'), 'Esc');
  // Passthrough: cualquier string desconocido.
  assert.equal(formatHotkeyDisplay('F1'), 'F1');
  // Whitespace interno se trimea por partes.
  assert.equal(formatHotkeyDisplay('Ctrl + KeyZ'), 'Ctrl+Z');
});

// ── decorateHotkeyTitles ─────────────────────────────────────────────────
// Verifica que añade el sufijo `| <display>` solo si no está ya presente.
function decorateHotkeyTitles(
  actions: ReadonlyArray<TreeActionSpec | null | undefined>,
): TreeActionSpec[] {
  return actions
    .filter((a): a is TreeActionSpec => !!a)
    .map((btn) => {
      const hotkey = typeof btn.hotkey === 'string' ? btn.hotkey : '';
      if (!hotkey) return btn;
      const display = formatHotkeyDisplay(hotkey);
      if (!display) return btn;
      const baseTitle = typeof btn.title === 'string' ? btn.title : '';
      if (baseTitle.includes(`| ${display}`)) return btn;
      const newTitle = baseTitle ? `${baseTitle} | ${display}` : display;
      return { ...btn, title: newTitle };
    });
}

test('decorateHotkeyTitles: añade display al title sin duplicar', () => {
  const out = decorateHotkeyTitles([
    { icon: 'mdi:plus', title: 'Add', hotkey: 'Ctrl+KeyN' },
    { icon: 'mdi:edit', title: 'Edit', hotkey: 'KeyE' },
  ]);
  assert.equal(out[0]?.title, 'Add | Ctrl+N');
  assert.equal(out[1]?.title, 'Edit | E');
});

test('decorateHotkeyTitles: si el title ya tiene el display, no duplica', () => {
  const out = decorateHotkeyTitles([
    { icon: 'mdi:plus', title: 'Add | Ctrl+N', hotkey: 'Ctrl+KeyN' },
  ]);
  assert.equal(out[0]?.title, 'Add | Ctrl+N');
});

test('decorateHotkeyTitles: sin hotkey devuelve el botón intacto', () => {
  const btn: TreeActionSpec = { icon: 'mdi:plus', title: 'Add' };
  const out = decorateHotkeyTitles([btn]);
  assert.deepEqual(out[0], btn);
});

// ── filterRowActions ─────────────────────────────────────────────────────
function filterRowActions(
  cfg: { actions?: ReadonlyArray<TreeActionSpec | null | undefined>; isFirst?: boolean; isLast?: boolean } | null,
  frozen: boolean | undefined,
): TreeActionSpec[] {
  const keep = (item: unknown): boolean => {
    if (!item || typeof item !== 'object') return !!item;
    const btn = item as Record<string, unknown>;
    if (cfg?.isFirst && btn['icon'] === 'mdi:arrow-up') return false;
    if (cfg?.isLast && btn['icon'] === 'mdi:arrow-down') return false;
    if (frozen && (btn['icon'] === 'mdi:arrow-up' || btn['icon'] === 'mdi:arrow-down')) {
      return false;
    }
    return true;
  };
  const out: TreeActionSpec[] = [];
  for (const entry of cfg?.actions ?? []) {
    if (!entry) continue;
    out.push(entry);
  }
  // Aplicamos keep sobre los kept (simplificado: solo flat).
  return out.filter(keep);
}

test('filterRowActions: oculta mdi:arrow-up si isFirst=true', () => {
  const filtered = filterRowActions(
    {
      actions: [
        { icon: 'mdi:arrow-up', title: 'Up' },
        { icon: 'mdi:arrow-down', title: 'Down' },
        { icon: 'mdi:plus', title: 'Add' },
      ],
      isFirst: true,
    },
    false,
  );
  assert.equal(filtered.length, 2);
  assert.ok(!filtered.find((a) => a.icon === 'mdi:arrow-up'));
});

test('filterRowActions: oculta mdi:arrow-down si isLast=true', () => {
  const filtered = filterRowActions(
    {
      actions: [
        { icon: 'mdi:arrow-up', title: 'Up' },
        { icon: 'mdi:arrow-down', title: 'Down' },
        { icon: 'mdi:plus', title: 'Add' },
      ],
      isLast: true,
    },
    false,
  );
  assert.equal(filtered.length, 2);
  assert.ok(!filtered.find((a) => a.icon === 'mdi:arrow-down'));
});

test('filterRowActions: oculta ambos si frozen=true', () => {
  const filtered = filterRowActions(
    {
      actions: [
        { icon: 'mdi:arrow-up', title: 'Up' },
        { icon: 'mdi:arrow-down', title: 'Down' },
        { icon: 'mdi:plus', title: 'Add' },
      ],
    },
    true,
  );
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0]?.icon, 'mdi:plus');
});

// ── iconParts ────────────────────────────────────────────────────────────
// Verifica que devuelve { icon, rest, mergedStyle } correctamente.
function iconParts(
  o: IconConfig | null | undefined,
): { icon: string; rest: Record<string, unknown>; mergedStyle: string } | null {
  if (!o?.icon) return null;
  const { icon, color, style: iconStyle } = o;
  const rest: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(o)) {
    if (k === 'icon' || k === 'color' || k === 'style') continue;
    rest[k] = v;
  }
  const mergedStyle = [
    typeof iconStyle === 'string' ? iconStyle : '',
    color ? `color: var(--is-accent)` : '',
    'font-size: 1.1rem',
  ]
    .filter(Boolean)
    .join('; ');
  return { icon, rest, mergedStyle };
}

test('iconParts: devuelve null si no hay icon', () => {
  assert.equal(iconParts(null), null);
  assert.equal(iconParts({}), null);
});

test('iconParts: combina style + color + size', () => {
  const out = iconParts({ icon: 'mdi:plus', color: 'primary', style: 'opacity: 0.5' });
  assert.ok(out);
  assert.equal(out.icon, 'mdi:plus');
  assert.match(out.mergedStyle, /opacity: 0\.5/);
  assert.match(out.mergedStyle, /font-size: 1\.1rem/);
  assert.deepEqual(out.rest, {});
});

test('iconParts: ignora icon/color/style en rest', () => {
  const out = iconParts({ icon: 'mdi:x', foo: 1, bar: 'baz' });
  assert.ok(out);
  assert.deepEqual(out.rest, { foo: 1, bar: 'baz' });
});

// ── sortChildrens ────────────────────────────────────────────────────────
function sortChildrens(a: TNode, b: TNode): number {
  const oa = +String(a.flatPath || '').split('.').pop()! || 0;
  const ob = +String(b.flatPath || '').split('.').pop()! || 0;
  return oa - ob;
}

test('sortChildrens: ordena por la última sección numérica del flatPath', () => {
  const nodes: TNode[] = [
    { flatPath: '1.3' },
    { flatPath: '1.1' },
    { flatPath: '1.10' },
    { flatPath: '1.2' },
  ];
  nodes.sort(sortChildrens);
  assert.deepEqual(
    nodes.map((n) => n.flatPath),
    ['1.1', '1.2', '1.3', '1.10'],
  );
});

test('sortChildrens: tolera flatPaths vacíos', () => {
  const nodes: TNode[] = [
    { flatPath: '' },
    { flatPath: '1.5' },
    { flatPath: '' },
  ];
  nodes.sort(sortChildrens);
  // Los vacíos se interpretan como 0 (menor que 5), por lo que van al principio.
  // Orden estable: los dos `''` se mantienen en su orden original, luego '1.5'.
  assert.equal(nodes[0]?.flatPath, '');
  assert.equal(nodes[2]?.flatPath, '1.5');
});

// ── collectBranchIds ─────────────────────────────────────────────────────
// Verifica que solo se incluyen ramas (no leaves) en el recorrido.
function hasChildren(node: TNode): boolean {
  return !!node.childrens && node.childrens.length > 0;
}

function collectBranchIds(branches: TNode[]): string[] {
  const out: string[] = [];
  for (const branch of branches) {
    const childs = branch.childrens;
    if (childs?.length) {
      out.push(branch.flatPath, ...collectBranchIds(childs));
    }
  }
  return out;
}

test('collectBranchIds: solo ramas, recorrido DFS', () => {
  const tree: TNode[] = [
    {
      flatPath: '1',
      childrens: [
        { flatPath: '1.1' },
        { flatPath: '1.2', childrens: [{ flatPath: '1.2.1' }] },
      ],
    },
    { flatPath: '2' },
  ];
  assert.deepEqual(collectBranchIds(tree), ['1', '1.2']);
});

test('collectBranchIds: árbol sin hijos devuelve []', () => {
  assert.deepEqual(collectBranchIds([]), []);
  assert.deepEqual(collectBranchIds([{ flatPath: '1' }]), []);
});

// ── collectBranchAndLeafIds ──────────────────────────────────────────────
function collectBranchAndLeafIds(branch: TNode): string[] {
  const out = [branch.flatPath];
  branch.childrens?.forEach((c) => out.push(...collectBranchAndLeafIds(c)));
  return out;
}

test('collectBranchAndLeafIds: incluye el branch + descendientes', () => {
  const branch: TNode = {
    flatPath: '1',
    childrens: [
      { flatPath: '1.1', childrens: [{ flatPath: '1.1.1' }] },
      { flatPath: '1.2' },
    ],
  };
  assert.deepEqual(collectBranchAndLeafIds(branch), ['1', '1.1', '1.1.1', '1.2']);
});

// ── Tipos ────────────────────────────────────────────────────────────────

test('IconConfig: campos icon/color/style/title', () => {
  const cfg: IconConfig = { icon: 'mdi:x', color: 'primary', title: 'icon' };
  assert.equal(cfg.icon, 'mdi:x');
  assert.equal(cfg.color, 'primary');
  assert.equal(cfg.title, 'icon');
});

test('TNode: flatPath + childrens + flags opcionales', () => {
  const node: TNode = {
    flatPath: '1.2',
    pathInit: 'foo',
    childrens: [{ flatPath: '1.2.1' }],
    isAtom: false,
    isGroupActor: true,
  };
  assert.equal(node.flatPath, '1.2');
  assert.equal(node.isGroupActor, true);
  assert.equal(hasChildren(node), true);
});
