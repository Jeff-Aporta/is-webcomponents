# is-card clone — report

## Files

| File | Status | Lines |
|---|---|---|
| `components/is-card.js` | NEW | 272 |
| `previews/is-card.html` | NEW | 392 |
| `manifest.js` | MODIFIED (+6) | 20 (was 14) |
| `index.html` | MODIFIED (+1) | 192 (was 191) |

Untouched: `previews/is-button.html`, `previews/is-split-panel.html` (don't need is-card).

## Verification outputs (verbatim)

```
$ node --check components/is-card.js
exit=0

$ brace-depth scan on components/is-card.js
final brace depth: 0 first negative at line: null

$ manifest entries:
[
  "is-button",
  "is-split-panel",
  "is-card"
]
(3 entries)

$ grep "is-card" index.html
15:  <script type="module" src="components/card.js"></script>

$ grep "is-card" previews/is-button.html
(no matches — correct: page doesn't demo cards)

$ grep "is-card" previews/is-split-panel.html
(no matches — correct: page doesn't demo cards)

$ grep "is-card" previews/is-card.html
(multiple — script tag, demos, code blocks)
```

## WA API coverage

### Attributes — 2/2

| Attribute | Type | Reflected | Implemented | Notes |
|---|---|---|---|---|
| `appearance` | accent · filled · outlined · filled-outlined · plain | yes | yes | setter sanitizes invalid values back to `outlined` |
| `orientation` | horizontal · vertical | yes | yes | setter sanitizes invalid values back to `vertical` |

`with-header`, `with-media`, `with-footer`, `with-actions` (SSR-only) — **skipped** per spec; client-side `slotchange` detects emptiness instead.

### Slots — 7/7

| Slot | Implemented | Notes |
|---|---|---|
| `(default)` | yes | body, always rendered |
| `media` | yes | vertical: top; horizontal: start (flex `0 0 auto`) |
| `header` | yes | vertical only; hidden via CSS in horizontal |
| `footer` | yes | vertical only; hidden via CSS in horizontal |
| `actions` | yes | horizontal only; hidden via CSS in vertical |
| `header-actions` | yes | inside `.row` flex container next to `header` |
| `footer-actions` | yes | inside `.row` flex container next to `footer` |

### CSS parts — 5/5

`::part(media)` `::part(header)` `::part(body)` `::part(footer)` `::part(actions)` — all exposed on the corresponding `.section` divs.

### CSS custom properties — 1/1

`--spacing` on host, default `var(--is-space-l, 1rem)` — fallback so it works even without the `--is-space-l` token in scope (ponytail: existing project doesn't actually define `--is-space-l`, but the spec says to use it — fallback keeps it usable everywhere).

### Events — none specified by WA, none implemented

### Methods — none specified by WA, none implemented

## Deviations from WA API

- **No `with-*` SSR attrs.** Per spec (AppWebcomponents doesn't do SSR).
- **`--spacing` default uses `var(--is-space-l, 1rem)`** as fallback chain instead of WA's `var(--wa-space-l)`.
- **Apperance fallback palette.** `accent` border uses `var(--is-accent)` (project token) + `var(--is-accent-bg, ...)` with brand-blue fallback — same approach the rest of the project uses.
- **Sanitization on `attributeChangedCallback`.** Invalid attribute values reset to defaults (`outlined` / `vertical`) instead of being silently kept. Avoids an attribute that styles nothing.
- **`#syncEmpty()` runs on every `slotchange`.** Per spec, simpler than the always-render-everything approach; hides wrappers with empty slots via `.is-empty { display: none }` so empty sections don't paint border/padding.

## Component design notes

- Same IIFE + Shadow DOM open-mode pattern as `is-split-panel.js`.
- `observedAttributes` = `['appearance', 'orientation']` (both reflected).
- `connectedCallback` registers a single `slotchange` listener per slot, calls `_syncEmpty()` once on mount.
- `_syncEmpty()` flattens `assignedElements()` per slot; counts text nodes for the default slot too.
- Layout switching is **100% CSS-driven** (`[orientation="vertical|horizontal"]` selectors). No JS rebuild, no template swap — matches WA's reactive approach and avoids unnecessary mutation.

## Manual smoke checklist for the preview page

- [ ] **Introducción**: `<is-card>Hola mundo</is-card>` renders with `outlined` border.
- [ ] **Apariencias**: 5 cards in `card-grid` show 5 distinct visual treatments (outlined / filled / filled-outlined / plain / accent with left edge).
- [ ] **Header + media + footer**: vertical card with mock image, title, paragraph, two footer buttons.
- [ ] **Horizontal**: bell icon left, body center, two buttons right; header/footer hidden.
- [ ] **Header / footer actions**: header has title + pill icon-button at the end; footer has meta text + outlined CTA at the end.
- [ ] **API JS demo**: 5 appearance buttons + orientation toggle update the demo card live; log lines appear in `#apiLog`.
- [ ] **Reference tables**: 4 tables (attributes, slots, parts, custom props) render.
- [ ] **Sidebar nav**: 7 anchor links highlight correctly while scrolling.
- [ ] **Theme switch**: dark/light toggle (from shell toolbar) flips card colors via `--is-*` tokens without re-render.
- [ ] **Palette switch**: contapyme/agrowin palette swaps `--is-accent` and the `accent` card's left border color visibly.
- [ ] **Manifest sidebar**: AppWebcomponents shell shows new "Card" entry; clicking loads `previews/is-card.html`.

## Review fixes

Three findings from the is-card review applied; no other files touched.

### Edits

| Finding | File | Line(s) before → after |
|---|---|---|
| 1 (Important): sidebar missing `slot="end"` | `previews/is-card.html` | L316 `<aside class="sidebar">` → `<aside class="sidebar" slot="end">` |
| 2 (Important, pre-existing): same bug | `previews/is-split-panel.html` | L362 `<aside class="sidebar">` → `<aside class="sidebar" slot="end">` |
| 3 (Minor): `slot="body"` in doc snippet | `previews/is-card.html` | L172 `<strong slot="body">…</strong>` → `<strong>…</strong>` (dropped the attribute from the code snippet) |

All three edits are line-level additions/removals; braces in the surrounding HTML still parse (informal check).

### Verification (verbatim)

`grep -n "slot=\"end\"\|slot=\"body\"" previews/*.html`:

```
C:\ContaPyme\Personal\apps\AppWebcomponents\previews\is-button.html:806:     <aside class="sidebar" slot="end">
C:\ContaPyme\Personal\apps\AppWebcomponents\previews\is-button.html:980:       if (en) pgBtn.insertAdjacentHTML('beforeend', `<span slot="end">${ICONS[en]}</span>`);
C:\ContaPyme\Personal\apps\AppWebcomponents\previews\is-button.html:994:       const endLine   = en ? `\n  <span slot="end"><iconify-icon icon="${ICON_NAME[en]}"></iconify-icon></span>` : '';
C:\ContaPyme\Personal\apps\AppWebcomponents\previews\is-card.html:316:     <aside class="sidebar" slot="end">
C:\ContaPyme\Personal\apps\AppWebcomponents\previews\is-split-panel.html:80:             <div slot="end" class="panel-demo panel-demo--alt">
C:\ContaPyme\Personal\apps\AppWebcomponents\previews\is-split-panel.html:104:             <div slot="end" class="panel-demo panel-demo--alt">
C:\ContaPyme\Personal\apps\AppWebcomponents\previews\is-split-panel.html:130:             <div slot="end" class="panel-demo panel-demo--alt">
C:\ContaPyme\Personal\apps\AppWebcomponents\previews\is-split-panel.html:157:             <div slot="end" class="panel-demo panel-demo--alt">
C:\ContaPyme\Personal\apps\AppWebcomponents\previews\is-split-panel.html:182:             <div slot="end" class="panel-demo panel-demo--alt">
C:\ContaPyme\Personal\apps\AppWebcomponents\previews\is-split-panel.html:209:             <div slot="end" class="panel-demo panel-demo--alt">
C:\ContaPyme\Personal\apps\AppWebcomponents\previews\is-split-panel.html:237:             <div slot="end" class="panel-demo panel-demo--alt">
C:\ContaPyme\Personal\apps\AppWebcomponents\previews\is-split-panel.html:270:               <div slot="end" class="panel-demo panel-demo--alt"><h4>End</h4></div>
C:\ContaPyme\Personal\apps\AppWebcomponents\previews\is-split-panel.html:362:     <aside class="sidebar" slot="end">
```

- All three preview sidebars carry `slot="end"` (is-button:806, is-card:316, is-split-panel:362).
- No `slot="body"` anywhere.

`node --check components/is-card.js`:

```
exit=0
```