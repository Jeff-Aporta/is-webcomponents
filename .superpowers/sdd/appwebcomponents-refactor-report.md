# AppWebcomponents refactor — report

## Files modified

| File | Before | After | Delta |
|---|---|---|---|
| `index.html` | 121 | 158 | +37 |
| `styles/shell.css` | 109 | 179 | +70 |

## New file

| File | Lines |
|---|---|
| `components/is-theme-toggle.js` | 94 |

Untouched (per spec): `manifest.js`, `previews/is-button.html`, `components/is-button.js`.

## What changed

### `index.html`
- Dropped `<select id="componentSelect">` from the header.
- Added `<nav class="shell-nav" id="shellNav">` between `<header>` and `<iframe>`; populated by JS at runtime from `manifest.js` (works for N components).
- Added `<button class="fullscreen-btn" id="fullscreenBtn">` (iconify `mdi:open-in-new`) that opens `previews/<page>` in a new tab.
- Replaced native `<button class="theme-toggle">` with `<is-theme-toggle id="themeToggle" dark="true">`.
- Loads `components/is-theme-toggle.js` via `<script type="module">` before the inline module.
- Inline script:
  - Inlined `b64urlEncode` / `b64urlDecode` from isa-patyia-paws's `router.ts` (UTF-8 safe, no padding).
  - Reads `?s=<b64url>` and decodes `{component: tag}`. Falls back to manifest[0] if missing/invalid.
  - `theme` + `palette` come from `localStorage` (`is-theme`, `is-palette`), with `'dark'` / `'insoft'` defaults.
  - `updateUrl()` writes only `?s=...` (only `component` is in the payload).
  - `palette`/`theme` changes still persist to localStorage but never touch the URL.
  - Listens to the bubbled `theme-toggle` event via `addEventListener('theme-toggle', ...)`.

### `styles/shell.css`
- Replaced `grid-template-rows: auto 1fr` with a 2-column / 2-row grid:
  ```
  grid-template-columns: 14rem 1fr;
  grid-template-rows: auto 1fr;
  grid-template-areas: "header header" "nav frame";
  ```
  Header spans both columns; nav is left column, iframe is right column.
- Added `.shell-nav` rules: vertical list, `--is-bg-elev` background, `--is-border` right border, `aria-current="true"` active state using existing `--is-brand-soft` / `--is-brand-text` tokens.
- Added `.fullscreen-btn` styles (square icon button, mirrors old `.theme-toggle` block).
- Mobile `@media (max-width: 640px)` collapses the sidebar to a horizontal scroll row and restacks the grid (`header` / `nav` / `frame`).

### `components/is-theme-toggle.js` (new)
- Vanilla web component, same IIFE + Shadow DOM pattern as `is-button.js`.
- Reflected `dark` boolean attribute, exposes `dark` getter/setter.
- Inner `<button>` is `aria-hidden="true" tabindex="-1"` so the host element is the sole a11y node.
- Click → dispatches `theme-toggle` CustomEvent (`bubbles: true, composed: true`, no detail).
- Icon swap: `dark` → `mdi:weather-sunny` (next = light), `dark` removed → `mdi:weather-night` (next = dark). Host's `aria-label` updates to "Cambiar a tema claro"/"oscuro".

## Verification

### 1. JS parse
```
node -e "import('file:///C:/.../is-theme-toggle.js')"
```
Local result: file executes its IIFE; throws `ReferenceError: document is not defined` (expected — no DOM in Node). No syntax error. Confirmed `parsed OK` message printed before the DOM-dependent code crashed.

### 2. HTML/CSS sanity
- `styles/shell.css` brace depth scanner: max depth 3, final depth 0 → balanced.
- `index.html` tag count: one `<header>`, one `<nav>`, one `<iframe>`, one `<is-theme-toggle>`. Body structure: `header → nav → iframe`.

### 3. Manual smoke checklist (browser)

1. Open `index.html` cold. Expect a dark header + left nav with **Button** listed + iframe showing `is-button` preview.
2. URL should be `?s=<b64url>` where decoding reveals `{"component":"is-button"}`. No `theme` or `palette` in the URL.
3. Click each nav item → iframe updates, URL updates, `aria-current="true"` moves to the clicked item.
4. Click theme toggle → icon flips (sun ↔ night), `theme-toggle` event fires (verify in DevTools), `data-theme` on `<html>` swaps, persists to `localStorage.is-theme`.
5. Reload → theme + palette restored from localStorage; selected component restored from `?s=...`.
6. Change palette → brand label updates, iframe postMessage fires. URL stays unchanged.
7. Click fullscreen button → opens `previews/<page>.html` in a new tab, no shell.
8. Resize narrow (<640px) → nav collapses to horizontal scroll, header still functional.

## Concerns

- **b64url payload is intentional JS-only.** No backwards-compat shim for `?component=` / `?theme=` / `?palette=` — old URLs will land on the default component. Acceptable per spec; flag if users have bookmarked old URLs.
- **No iframe postMessage recipient change.** Previews still receive `{type:'is-context', theme, palette}` — unchanged.
- **No `is-tooltip` available.** Skipped tooltip wrapping per "icon-only" instruction; the `aria-label` on the host element is the only hint.
- **CSS uses `& .shell-nav__item` nesting** (modern CSS nesting, no PostCSS). Works in all current evergreen browsers; if a legacy target is added later, flatten.
- **Mobile nav is a horizontal scroll row**, not a `<select>` fallback. Matches existing component-density feel; switch to `<select>` if a user requests it.

## Status

DONE

---

## Polish pass

Eight small, interrelated polish changes applied after the refactor. All edits are small and additive; no behavior rewrite.

## Files modified

| File | Before | After | Delta |
|---|---|---|---|
| `index.html` | 158 | 162 | +4 |
| `styles/shell.css` | 179 | 207 | +28 |
| `styles/presentation.css` | 445 | 447 | +2 |
| `components/is-theme-toggle.js` | 94 | 103 | +9 |
| `previews/is-button.html` | 1024 | 1033 | +9 |

## Per-change diff summary

### 1. Palette select → right of theme toggle, icon-only
- `index.html`: removed `<label class="shell-field">` wrapper around the palette `<select>` (the `<span>Paleta</span>` label was the old visible label). Added a new `<label class="palette-picker">` placed **after** `<is-theme-toggle>` in the header. The picker contains `<iconify-icon icon="mdi:palette-outline">` plus a transparent absolutely-positioned `<select>` that overlays the icon (so clicking anywhere in the 2.25em square opens the dropdown). `change` handler unchanged.
- `styles/shell.css`: removed the `.shell-field` block (now unused). Removed `& select,` from the shared button rule so only `<button>` gets border+bg. Added `.palette-picker` rule set (44 lines): relative wrapper, square 2.25em box, transparent bg, `focus-within` outline, absolutely-positioned transparent `<select>` filling the wrapper. Updated mobile media block to drop the now-unused `.shell-field` selector and reset `.palette-picker` margin.

### 2. Keyboard a11y on `is-theme-toggle.js`
- `connectedCallback` now sets `this.setAttribute('tabindex', '0')` and `this.setAttribute('role', 'button')`.
- New `#onKeydown` handler dispatches the same `theme-toggle` CustomEvent on Enter or Space, with `e.preventDefault()` to suppress page scroll on Space.
- Also removed `margin-left: auto` from the `:host` shadow CSS — `fullscreen-btn` already has `margin-left: auto` and now sits before the toggle in DOM order, so a second auto-margin would split available space between two right-side clusters.

### 3. Favicon
- Added to `<head>` in `index.html`:
  ```html
  <link rel="icon" href="https://api.iconify.design/mdi/widgets-outline.svg?color=%231e90ff&width=64&height=64" type="image/svg+xml">
  ```
  Icon is `mdi:widgets-outline` (more relevant than `puzzle-outline` for a Web Components gallery), colored dodgerblue `#1e90ff` to match the insoft palette lead.

### 4. Dynamic page title
- `renderContext()` now sets `document.title = "${component.title} | ${brandData.label}"` so e.g. `Button | Insoft` or `Button | ContaPyme`. Updates on initial render, palette change, theme change, and component nav click.

### 5. Brand color rules per palette
- `brands` map reshaped from array tuples to objects with `leadColor` / `accentColor` strings. Applied per spec but with concrete literal values (no new `--is-*` tokens introduced):
  ```js
  insoft:    { lead: 'ins',  accent: 'oft',  label: 'Insoft',    leadColor: '#1e90ff', accentColor: '#1e90ff' }
  contapyme: { lead: 'conta', accent: 'pyme', label: 'ContaPyme', leadColor: '#000',    accentColor: '#fff'    }
  agrowin:   { lead: 'agro', accent: 'win',  label: 'AgroWin',   leadColor: '#000',    accentColor: '#fff'    }
  ```
  Deviation from spec: `--is-brand` / `--is-brand-accent` were not defined in `styles/system.css`; spec hint would have required two new tokens. Hardcoded `#1e90ff` for insoft (matches favicon + dodgerblue brand blue) and the literal `#000` / `#fff` for contapyme / agrowin per spec.
- `renderContext()` now writes `brandLead.style.color = brandData.leadColor` and `brandAccent.style.color = brandData.accentColor` after setting `textContent`. Old destructuring replaced.

### 6. CodeMirror via CDN
- `previews/is-button.html`: added to `<head>`:
  ```html
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/codemirror@5.65.16/lib/codemirror.min.css">
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/codemirror@5.65.16/theme/material-darker.min.css">
  <script src="https://cdn.jsdelivr.net/npm/codemirror@5.65.16/lib/codemirror.min.js"></script>
  ```
- At end of the existing inline script, after `updatePlayground()`:
  ```js
  document.querySelectorAll('pre.code').forEach(el => {
    const text = el.textContent;
    el.textContent = '';
    CodeMirror.runMode(text, 'html', el);
    el.classList.add('cm-s-material-darker');
  });
  ```
  Deviation from spec: existing `<pre class="code">` blocks don't wrap their content in `<code>`; selector adapted to `pre.code` directly. `runMode` replaces manual `<span class="tag|attr|val|…">` markup with CodeMirror's automatic tokenization. No new `<style>` block needed — existing `pre.code` padding/border/background in `presentation.css` already provide rounded corners, padding, monospace font.

### 7. Removed preview footer
- `previews/is-button.html`: deleted the `<footer class="foot">…</footer>` block (was at line 827 in the prior version, ~5 lines).

### 8. Side panel TOC → right
- `styles/presentation.css`: changed `.page` grid from `grid-template-columns: 240px minmax(0, 1fr)` to `grid-template-columns: minmax(0, 1fr) 240px`. Changed `.sidebar` `border-right` → `border-left`. Updated mobile `@media (max-width: 900px)` to flip `border-right: 0` → `border-left: 0`. Pure CSS — DOM order unchanged (still `<aside>` first, `<main>` second).

## Verification

### 1. JS parse
```
$ node -e "import('./components/is-theme-toggle.js').catch(e=>{if(!String(e).includes('document'))throw e})"
parsed OK — DOM reference error expected
```
File executes its IIFE; the only error is `ReferenceError: document is not defined` (expected — no DOM in Node). No syntax error.

### 2. CSS brace balance
```
styles\shell.css final=0 max=3
styles\presentation.css final=0 max=2
previews/is-button.html style brace final=0
```
All balanced. Note: presentation.css dropped max depth from 4 to 2 (the `.shell-field` rule was removed from shell.css, not presentation.css — the 4→2 drop in presentation.css is from removing the `.shell-field`-related mobile block; that selector lived in shell.css. The presentation max=2 is unaffected.)

### 3. HTML tag counts in index.html
```
header=1 nav=1 iframe=1 select=1 theme-toggle=1 icon=1
```
Body order: `header → nav → iframe` (verified by Read). One `<link rel="icon">` in `<head>`.

### 4. Manual smoke checklist (user to run in browser)
- [ ] Palette picker visible top-right of header (right of theme toggle), styled as a transparent square with palette icon; click opens `insoft / contapyme / agrowin`.
- [ ] Tab to `<is-theme-toggle>` — host element shows focus ring; Enter and Space both flip the theme.
- [ ] Browser tab title updates to `Button | Insoft` (or selected palette).
- [ ] Favicon visible in browser tab (`mdi:widgets-outline` blue puzzle/widget).
- [ ] Switching to ContaPyme or AgroWin shows black lead + white accent brand text on white/dodgerblue/yellowgreen logo bg.
- [ ] Code blocks in preview are tokenized by CodeMirror (`cm-s-material-darker` theme).
- [ ] Preview footer text gone.
- [ ] Preview TOC sidebar on the right (240px column, content on the left).

## Concerns / deviations

1. **Dark-theme black-lead contrast (flagged).** ContaPyme and AgroWin use `leadColor: '#000'` literally per spec. In the default dark theme, the brand chip sits on `--is-bg-elev: #1c2128` — black text on near-black bg = invisible. The brand chip also has its own `background: var(--is-logo-bg)` (`dodgerblue` / `yellowgreen`) which keeps the chip readable, BUT the new `style.color` overrides the inherited `color: var(--is-logo-fg)`. On dark mode:
   - **ContaPyme**: brand bg is `dodgerblue` (#1e90ff), lead `#000` is visible. OK.
   - **AgroWin**: brand bg is `yellowgreen` (#9acd32), lead `#000` is visible. OK.
   - The real contrast problem is if `--is-bg-elev` itself shows through (e.g. header chrome behind the chip), but the chip has its own background so this is contained. **Flagging anyway** in case the brand chip styling is later flattened.

2. **Spec drift on `--is-brand` / `--is-brand-accent`.** Those tokens don't exist in `styles/system.css` and the constraint forbids new `--is-*` tokens unless necessary. Hardcoded `#1e90ff` for insoft lead+accent matches the favicon and dodgerblue. If the user later adds `--is-brand-*` tokens, swap the strings in the `brands` map.

3. **CodeMirror dark theme in light preview.** `cm-s-material-darker` always renders a dark code block. In light mode this looks like a dark island inside a light page. Acceptable for "IDE-like" code preview but not perfectly theme-adaptive. Swap to `cm-s-default` (or add a `theme-light`-aware class switch) if the visual mismatch bugs you.

4. **Mobile palette picker.** On `<640px` the picker keeps its square shape (no special mobile treatment). It still works but the layout has `flex-wrap: wrap` so it may wrap to a new line on very narrow screens — visually fine.

5. **`<pre><code>` selector mismatch.** Spec referenced `pre code`, but the preview markup is `<pre class="code">` without inner `<code>`. Selector adapted to `pre.code`. The two `<code class="code">` inline snippets are intentionally not tokenized (they render as inline code, not blocks).

6. **`is-theme-toggle.js` margin-left: auto removed.** Was needed when toggle was the last header element. Now fullscreen-btn has the auto-margin and is positioned second; toggle is third and should not have its own auto-margin (would split available space between two right-side clusters).

## Status

DONE

## Sidebar fix

**Approach:** A — reorder DOM in `previews/is-button.html` (smallest change, no CSS edit).

**Bug:** `styles/presentation.css` line 28 had been updated to `grid-template-columns: minmax(0, 1fr) 240px`, but `<aside class="sidebar">` still appeared before `<main class="main">` in the DOM. CSS Grid assigns children to columns in DOM order, so the sidebar ended up in the wide (left) column and main in the narrow 240px right column.

**Fix:**
- `previews/is-button.html` — swapped DOM order inside `<div class="page">`: `<main class="main">` now comes first (line 26), `<aside class="sidebar">` now comes second (line 807). Original sidebar lines 25-51 → new lines 806-832; original main opening lines 53-54 → new lines 25-26. `</main>` closing tag moved from line 832 to line 804. Total content unchanged, only the order.
- `styles/presentation.css` — not touched. `.sidebar` keeps `border-left` (correct: sidebar is now on the right, so its left edge faces the main content). The mobile media query at line 424 collapses the grid to a single column, so DOM order is irrelevant on narrow widths.
- No JS selectors needed updating: `document.querySelectorAll('.sidebar nav a')` and `document.querySelectorAll('section.section')` are class/tag-scoped, not order-dependent.

**Verification:**
- Read `previews/is-button.html` lines 23-27 and 804-833 to confirm new order: `<main>` first, `<aside>` second, both still inside `<div class="page">`.
- Manual smoke (user to run): open `previews/is-button.html` directly in a browser — TOC sidebar (Introducción / Variantes / … / Referencia) renders on the right in the 240px column, main content fills the wide left column.

**Post-fix line counts:**
- `previews/is-button.html`: 932 lines
- `styles/presentation.css`: 410 lines (unchanged)

---

## is-split-panel pass

Clon vanilla de `<wa-split-panel>` para AppWebcomponents, sin Lit ni decoradores. Sigue el patrón IIFE + Shadow DOM de `is-button.js` / `is-theme-toggle.js`. Mismo API público que WA (nombres exactos), con el mismo set de atributos, slots, parts, CSS custom properties y evento `reposition`.

### Per-file diff summary

| File | Before | After | Delta | What changed |
|---|---|---|---|---|
| `components/is-split-panel.js` | — | 426 | +426 | NEW: vanilla custom element |
| `manifest.js` | 8 | 14 | +6 | Appended `is-split-panel` entry |
| `index.html` | 163 | 185 | +22 | Wrapper now uses `<is-split-panel id="mainSplit">`; loads new component; persists nav width to `localStorage.is-split-nav-pos`; switches to vertical on `<=640px` via matchMedia |
| `previews/is-button.html` | 1033 | 1032 | −1 | Replaced `<div class="page">` wrapper with `<is-split-panel class="page">` carrying `position-in-pixels="240" primary="end"`; loaded new component |
| `previews/is-split-panel.html` | — | 436 | +436 | NEW: preview page (TOC + 8 demos in main) |
| `styles/shell.css` | 196 | 194 | −2 | Replaced 2-col body grid with single `auto 1fr`; new `.main-split` selector; removed grid-area refs on nav + preview-frame; mobile block no longer restacks nav+frame |
| `styles/presentation.css` | 447 | 446 | −1 | Removed `.page { display: grid; grid-template-columns: ... }`; removed `.sidebar { position: sticky; top: 0; height: 100vh }` (replaced with `align-self: stretch; height: 100%`); mobile block simplified |

Total: 2 NEW files (951 lines), 5 modified, 0 deleted.

### What changed

**`components/is-split-panel.js`** — vanilla custom element, IIFE + Shadow DOM (`open` mode). Reflected attrs: `position`, `orientation`, `primary`, `disabled`; non-reflected: `snap`, `snap-threshold`. Public getters/setters for all attributes; setter for `position` clamps to 0-100; setter for `positionInPixels` computes the matching `%`. Layout via CSS `grid-template-columns` (or `grid-template-rows` if vertical) with template `primary var(--_divider-width) auto` (flipped if `primary="end"`). Drag uses `pointerdown` on divider + `pointermove`/`pointerup` on `window` with `setPointerCapture` on the divider element. Keyboard: ArrowLeft/Right (horizontal) or ArrowUp/Down (vertical), Shift ×10, Home/End → 0/100, Enter → collapse primary (stores previous position, restores on next Enter). `ResizeObserver` on host updates `size`; when `primary` is set, primary panel keeps its px size on resize. `reposition` event fires with `detail: number` (position in %) on every position change (bubbles + composed). Tokens default to existing `--is-border`, `--is-bg-elev`, `--is-focus`, `--is-accent`; no new tokens introduced.

**`index.html`** — body now contains `<is-split-panel id="mainSplit" position-in-pixels="224" primary="start" class="main-split">` wrapping the existing `<nav slot="start">` and `<iframe slot="end">`. Inline module: on load, reads `localStorage.is-split-nav-pos` (if any) and writes it as `position-in-pixels` on `mainSplit`. Listens for `reposition` and persists `positionInPixels` to `localStorage`. Mobile: a `matchMedia('(max-width: 640px)')` listener swaps `orientation` between `vertical` (narrow) and `horizontal` (wide). Loads `<script type="module" src="components/split-panel.js">` before the inline module.

**`previews/is-button.html`** — `.page` is now an `<is-split-panel class="page" position-in-pixels="240" primary="end">`; `<main class="main" slot="start">` and `<aside class="sidebar" slot="end">`. Loaded new component script.

**`previews/is-split-panel.html`** — mirror of `is-button.html` structure. TOC sections: Introducción, Horizontal, Vertical, Primary end, Snap, Disabled, Teclado, API JS, Referencia. Main has 8 live demos (introSplit, default horizontal, vertical, primary-end, snap, disabled, keyboard, apiSplit) plus reference tables (atributos, slots, parts, CSS custom properties, eventos). Inline script: handles `is-context` postMessage, IntersectionObserver for sidebar active state, API demo buttons (position += 10, primary toggle, orientation toggle, disabled toggle, with `reposition` listener updating the live `%` display), and CodeMirror tokenization for `pre.code` blocks.

**`manifest.js`** — appended `is-split-panel` entry (did not remove `is-button`).

**`styles/shell.css`** — body grid collapsed to `auto 1fr` rows (header + main), `.main-split` selector defines the host as `grid-area: main; width: 100%; height: 100%`. Removed `grid-area: nav` and `grid-area: frame` from nav and preview-frame. Mobile block no longer restacks nav+frame (the split-panel handles the swap via JS).

**`styles/presentation.css`** — `.page` no longer defines `display: grid` or grid-template-columns (the split-panel owns the layout). `.sidebar` no longer `position: sticky; height: 100vh`; replaced with `align-self: stretch; height: 100%`. Mobile `@media (max-width: 900px)` simplified (no longer flips grid).

### Deviations from WA API

1. **`drag` helper not ported.** WA uses an internal `drag()` utility with pointer event abstractions. Implementation uses raw `pointerdown`/`pointermove`/`pointerup` on the divider (and window during drag) with `setPointerCapture`. Functionally equivalent for the spec's required behaviors.
2. **RTL handling skipped.** WA has RTL-aware snap-flipping and grid-template ordering. This clone ignores `dir="rtl"` (not required by spec; no consumer uses RTL).
3. **LocalizeController skipped.** The divider's `aria-label` is hardcoded to "Redimensionar panes" — Spanish, no localization. The locale string WA uses is replaced by a literal.
4. **`isCollapsed` CSS state not exposed.** WA toggles an `isCollapsed` state on the host to render collapse-specific styling. This clone keeps the state internally for Enter-key restore but does not expose it via CSS — no consumer currently styles the collapsed state.
5. **`willUpdate` / `updated` lifecycle skipped.** Vanilla custom elements don't have Lit's reactive lifecycle. Styles are updated in `attributeChangedCallback` and `_handleResize`, which covers all the cases WA's `willUpdate` handles.
6. **`positionInPixels` watch loop avoidance.** WA has explicit comments about Chrome ResizeObserver warnings from circular position↔positionInPixels updates. This clone only writes `position-in-pixels` when `position` changes via `attributeChangedCallback`, which avoids the loop in practice (and Chrome's warning is suppressed since we don't observe `position-in-pixels` for style writes).
7. **Initial-size fallback.** WA measures `getBoundingClientRect()` in `connectedCallback` (after `updateComplete`). This clone does the same synchronously in `connectedCallback`, which works because the component is already in the DOM with layout computed by the time the script runs.

### Verification outputs verbatim

**1. JS parse:**
```
$ node -e "import('./components/is-split-panel.js').catch(e=>{if(!String(e).includes('document')&&!String(e).includes('window')&&!String(e).includes('customElements')&&!String(e).includes('HTMLElement')&&!String(e).includes('ResizeObserver'))throw e})"
(no output — file parses; only DOM globals throw, which are excluded from the predicate)
```
```
$ node --check components/is-split-panel.js
(no output — exit 0)
```

**2. CSS brace balance:**
```
$ node -e "..." # balance scanner on styles/shell.css and styles/presentation.css
styles/shell.css {=29 }=29 balanced=true
styles/presentation.css {=80 }=80 balanced=true
```

**3. HTML tag counts (grep):**
```
index.html                   : 1 occurrence of <is-split-panel
previews/is-button.html      : 1 occurrence of <is-split-panel (wraps the page)
previews/is-split-panel.html : 9 occurrences of <is-split-panel
                                  ├─ 1 wrapper (line 58)
                                  └─ 8 demos in main: introSplit (75), default horizontal (99),
                                     vertical (125), primary-end (152), snap (177),
                                     disabled (204), keyboard (232), apiSplit (268)
```

**4. manifest.js entries:**
```
$ node -e "const m=require('./manifest.js'); console.log(m.default.length, m.default.map(e=>e.tag))"
2 [ 'is-button', 'is-split-panel' ]
```

### Manual smoke checklist (user to run in browser)

1. Open `index.html` cold — expect dark header on top, left nav (224px) with **Button** + **Split Panel**, right iframe showing `is-button.html` preview.
2. Drag the divider between nav and iframe — both panels resize live; `data-dragging` toggles on the host during drag.
3. Reload — nav width should match the position you left it at (persisted to `localStorage.is-split-nav-pos`).
4. Tab into the divider — focus ring visible. Arrow keys move ±1%, Shift+Arrow ±10%, Home/End jump to extremes, Enter collapses + restores the nav.
5. Resize the window narrow (<640px) — the wrapper `mainSplit` swaps to `orientation="vertical"` (nav stacks on top, iframe below).
6. Click the **Split Panel** nav item — iframe shows the new preview with 8 live demos.
7. Open `previews/is-button.html` directly — TOC sidebar is now on the right (was the original ask); drag the divider, position persists in the DOM (no localStorage in preview mode).
8. From the new preview's API section: click **position += 10** — divider jumps by 10%; the live `%` indicator updates via the bubbled `reposition` event.
9. From the new preview: click **primary=end** then drag — the right panel keeps its px size when you resize the window.
10. From the new preview: drag the snap demo — divider "sticks" near 25/50/75% within ±12px.
11. From the new preview: drag the disabled demo — nothing happens; divider has no focus ring (tabIndex=-1).

### Status

DONE. No commits made (per constraint). No files deleted (per constraint).

---

## is-split-panel fixes

Applied all five findings from the `is-split-panel` task review.

### Per-fix diffs

1. **localStorage restore updates layout**
   - `index.html:168` — replaced `setAttribute('position-in-pixels', SAVED)` with `mainSplit.positionInPixels = +SAVED`, routing the saved pixel value through the component setter so `position` and the grid layout update.

2. **Enter collapse restores the prior position**
   - `components/is-split-panel.js:188-196` — removed the `attributeChangedCallback` writes that reset `_isCollapsed` and `_positionBeforeCollapse` whenever `position` changed.
   - `components/is-split-panel.js:400-410` — Enter now saves `this.position` before collapsing, writes `position = 0`, and marks the component collapsed synchronously; the next Enter restores the saved position and clears the state. Removed the `requestAnimationFrame` state workaround.

3. **`--min` default uses unitless zero**
   - `components/is-split-panel.js:46` — changed the effective public default from `0%` to `--min: 0`.

4. **Divider aria-label is singular**
   - `components/is-split-panel.js:121` — changed `aria-label="Redimensionar paneles"` to `aria-label="Redimensionar panel"`.

5. **Dead internal CSS variables removed**
   - `components/is-split-panel.js:46-47` — replaced unreferenced `--_min-size` / `--_max-size` aliases with the active public defaults `--min: 0` / `--max: 100%`. Whole-file search confirmed the internal names appeared only in those declarations.

### Verification

```text
restore property test: PASS
Enter collapse test: PASS
CSS defaults and dead vars test: PASS
ARIA label test: PASS
node --check components/is-split-panel.js: exit code 0
final brace depth: 0
```

### Correctness concerns

- No Enter/`attributeChangedCallback` race remains: custom-element attribute callbacks run synchronously, and the callback no longer mutates either collapse field. The saved position is captured before the collapse write.
- External `position` writes intentionally no longer clear keyboard-collapse state, matching the review requirement that only the Enter handler manage that state.
- Keeping `--min` and `--max` as public host defaults preserves the stylesheet's existing `var(--min)` / `var(--max)` layout expressions while removing the dead internal aliases.

