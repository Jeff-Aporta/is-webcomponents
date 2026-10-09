# Auditoría de `:state()` custom states — iswc-root (Phase G1)

> **Fecha:** 2026 (sesión de auditoría).
> **Alcance:** `src/components/**/*.ts` — todos los componentes que declaran
> custom states vía `setCustomState()`, `#setState()` interno, o
> `internals?.states?.add()`.
> **Comparación:** source (`.ts`) ↔ cabecera JSDoc "Custom states:" ↔ `<comp>.md`.
> **Cero código modificado** — solo lectura + análisis.

---

## 0. Resumen ejecutivo

### 0.1 Métricas

| Métrica | Valor |
|---|---|
| Componentes que declaran (o reclaman declarar) custom states | **22** |
| Componentes con `setCustomState(...)` o equivalente | **17** |
| Componentes con cabecera JSDoc `Custom states:` | **13** |
| Componentes con sección "Custom states" en su `.md` | **21** (3 dicen "No expone") |
| **Issues de gap** (declarado pero no documentado, o documentado pero no declarado) | **7** |
| Total de custom states únicos declarados en source | **27** |

### 0.2 Convenciones detectadas

- **NO** se usa el patrón `static states = ...` propio (e.g. Lit).
- El repo usa `setCustomState(this.#internals, '<name>', on)` importado de
  `_shared/form-associated.js` (helper que envuelve `internals.states.add/delete`).
- Varios componentes exponen un `#setState(name, on)` interno equivalente
  (combobox, file-input, date-field-element, copy-button, inline-edit).
- `popover.ts` usa directamente `this.internals?.states?.add?.('open')` con
  `try/catch` (sin pasar por el helper).
- Algunos componentes JSDoc declaran un custom state pero **nunca lo setean**
  (drift de documentación): `actions/context-menu.ts` (`open`, `closed`),
  `layout/dock.ts` (`hovering`).
- Varios componentes setean states sin JSDoc "Custom states:" en cabecera
  (code.ts, select.ts, color-picker.ts, combobox.ts, masked-input.ts, popover.ts,
  date-field-element.ts, time-field wrappers).

### 0.3 Tabla global (gap analysis)

| Componente | States declarados en source | States en JSDoc | States en `.md` | Gap |
|---|---|---|---|---|
| `actions/button.ts` | `disabled`, `loading`, `link`, `icon-button` | `disabled`, `loading`, `link`, `icon-button` | `icon-button`, `loading`, `disabled`, `link` | OK |
| `actions/copy-button.ts` | `disabled`, `success`, `error` | `success`, `error` | `success`, `error` | **MISSING in JSDoc & md**: `disabled` |
| `actions/context-menu.ts` | (none — usa `setAttribute('open','')`) | `open`, `closed` | "No expone." | **STALE JSDoc**: declara states que no se setean |
| `code/code.ts` | `blank`, `inline`, `disabled`, `readonly` | (no JSDoc) | `blank`, `disabled`, `readonly` | **MISSING in md**: `inline` |
| `forms/checkbox.ts` | `checked`, `indeterminate`, `disabled`, `readonly`, `error` | `checked`, `indeterminate`, `disabled`, `readonly`, `error` | `checked`, `indeterminate`, `disabled`, `readonly`, `error` | OK |
| `forms/color-picker.ts` | `open`, `disabled` | (no JSDoc) | `open`, `disabled` | OK |
| `forms/combobox.ts` | `disabled`, `open` (vía `#setState`) | (no JSDoc) | `open`, `disabled` | OK |
| `forms/file-input.ts` | `blank`, `dragging`, `disabled` (vía `#setState`) | `blank`, `dragging` | `dragging`, `disabled`, `blank` | **MISSING in JSDoc**: `disabled` |
| `forms/inline-edit.ts` | `idle`, `editing`, `saved`, `cancelled`, `blank` | `idle`, `editing`, `saved`, `cancelled` | `idle`, `editing`, `saved`, `cancelled`, `blank` | **MISSING in JSDoc**: `blank` |
| `forms/input.ts` | `blank`, `disabled`, `readonly`, `focused`, `invalid`, `password-visible` | `blank`, `disabled`, `readonly`, `focused`, `invalid`, `password-visible` | `invalid`, `disabled`, `readonly`, `blank`, `focused`, `password-visible` | OK |
| `forms/masked-input.ts` | `invalid`, `complete` | (no JSDoc) | `complete`, `invalid` | OK |
| `forms/radio.ts` | `placement-end`, `placement-start`, `placement-top`, `placement-bottom`, `readonly`, `error` (placement-end nunca se activa) | `placement-*`, `readonly`, `error` | `error`, `placement-start`, `placement-top`, `placement-bottom`, `readonly` | OK (placement-end omitido en source y md, comportamiento intencionado) |
| `forms/radio-group.ts` | `disabled`, `readonly`, `error`, `blank` | `disabled`, `readonly`, `error`, `blank` | `error`, `disabled`, `readonly`, `blank` | OK |
| `forms/rating.ts` | `disabled`, `readonly`, `blank` | `blank`, `disabled`, `readonly` | `readonly`, `disabled`, `blank` | OK |
| `forms/select.ts` | `blank`, `error`, `disabled`, `open` | (no JSDoc) | `open`, `blank`, `error`, `disabled` | OK |
| `forms/slider.ts` | `disabled`, `readonly`, `dragging`, `focused` | `disabled`, `readonly`, `dragging`, `focused` | `dragging`, `focused`, `disabled`, `readonly` | OK |
| `forms/switch.ts` | `checked`, `disabled`, `readonly`, `error` | `checked`, `disabled`, `readonly`, `error` | `checked`, `disabled`, `readonly`, `error` | OK |
| `forms/textarea.ts` | `blank`, `disabled`, `readonly`, `focused`, `invalid` | `blank`, `disabled`, `readonly`, `focused`, `invalid` | `invalid`, `disabled`, `readonly`, `blank`, `focused` | OK |
| `helpers/popover.ts` | `open` (vía `internals.states.add`) | (no JSDoc) | "No expone." | **MISSING in md**: `open` |
| `layout/dock.ts` | (none) | `hovering` | "No expone custom states." | **STALE JSDoc**: declara state que no se setea |
| `_shared/date-field-element.ts` (factory) | `disabled`, `invalid` (vía `#setState`) | (no JSDoc — factory) | N/A (factory) | **MISSING in wrapper mds** (date-field.md, date-time-field.md, time-field.md): todos dicen "No expone." — la factory sí setea `disabled` e `invalid` |

### 0.4 Resumen de issues

| # | Issue | Severidad | Archivos afectados |
|---|---|---|---|
| 1 | `disabled` se setea pero no aparece en JSDoc ni en `.md` | Media | `actions/copy-button.ts`, `forms/file-input.ts` |
| 2 | JSDoc declara `inline` state, no documentado en `.md` | Media | `code/code.ts` |
| 3 | JSDoc declara `open, closed` que nunca se setean (drift) | Baja | `actions/context-menu.ts` |
| 4 | JSDoc declara `hovering` que nunca se setea (drift) | Baja | `layout/dock.ts` |
| 5 | `open` se setea pero no aparece en `.md` | Media | `helpers/popover.ts` |
| 6 | `disabled`, `invalid` se setean vía factory pero wrappers dicen "No expone." | Alta | `forms/date-field.md`, `forms/date-time-field.md`, `forms/time-field.md` |
| 7 | `inline-edit.ts` JSDoc omite `blank` (ya cubierto por `.md`) | Baja | `forms/inline-edit.ts` (JSDoc) |

**Total: 7 issues** (3 altos/medios, 4 bajos/documentación pura).

---

## 1. Detalle por componente

### 1.1 `actions/button.ts`

- **Source** (`setCustomState` calls): `disabled` (L429), `icon-button` (L463),
  `link` (L463), `loading` (L468).
- **JSDoc header** (L60 + L80-82): "Custom States: :state(loading) :state(disabled) :state(link) :state(icon-button)".
- **`<comp>.md`** (L121-128): lista 4 estados: `:state(icon-button)`, `:state(loading)`, `:state(disabled)`, `:state(link)`.
- **Aplicación:**
  - `disabled` — activo cuando el atributo `disabled` está presente (host disabled).
  - `loading` — activo cuando `loading` está presente (spinner visible).
  - `link` — activo cuando el atributo `href` está presente (renderiza como `<a>`).
  - `icon-button` — activo cuando el slot default está vacío (solo icono).
- **Gap:** ninguno.

### 1.2 `actions/copy-button.ts`

- **Source** (L220, L240, L241): `disabled`, `success`, `error`.
- **JSDoc header** (L40): "Custom states: :state(success) :state(error)".
- **`<comp>.md`** (L102-107): lista 2 estados: `:state(success)`, `:state(error)`.
- **Aplicación:**
  - `success` — activo durante `feedback-duration` ms tras copia exitosa.
  - `error` — activo durante `feedback-duration` ms si falla la copia.
  - `disabled` — activo cuando el atributo `disabled` está presente.
- **Gap:** **`disabled` se setea en source pero no aparece en JSDoc ni en `.md`.**
  Consumidores externos que lean solo el `.md` no sabrán que existe.

### 1.3 `actions/context-menu.ts`

- **Source**: NO tiene llamadas a `setCustomState` ni a
  `internals.states.add`. Usa `this.setAttribute('open', '')` para reflejar
  el estado como atributo host (NO como custom state).
- **JSDoc header** (L29): "Custom states: open, closed".
- **`<comp>.md`** (L98-100): "No expone." (Correcto en cuanto a la realidad
  del código).
- **Aplicación:**
  - El menú refleja su estado con el atributo `open` en el host, accesible
    con `[open]` y `aria-expanded`. No se usa `:state(open)` ni `:state(closed)`.
- **Gap:** **El JSDoc miente: dice que expone `open` y `closed` como custom
  states pero el código no los implementa.** El `.md` está alineado con el
  código. La JSDoc debería eliminarse o reemplazarse por
  "Estado abierto: atributo `open` en host."

### 1.4 `code/code.ts`

- **Source** (L513, L655, L798, L825, L870, L874, L875): `blank`, `inline`, `disabled`, `readonly`.
- **JSDoc header**: **NO** tiene línea "Custom states:" en su JSDoc principal.
- **`<comp>.md`** (L133-139): lista 3 estados: `blank`, `disabled`, `readonly`.
- **Aplicación:**
  - `blank` — buffer vacío (`:state(blank)` activo cuando no hay texto).
  - `inline` — modo de inserción inline en el flujo de texto (vs `block`).
  - `disabled` — editor deshabilitado, sin caret.
  - `readonly` — solo lectura, sin caret pero permite selección/copia.
- **Gap:** **`inline` se setea en source pero no aparece en `.md`.**

### 1.5 `forms/checkbox.ts`

- **Source** (L233-237): `checked`, `indeterminate`, `disabled`, `readonly`, `error`.
- **JSDoc header** (L28): "Custom states: checked, indeterminate, disabled, readonly, error".
- **`<comp>.md`** (L122-130): 5 estados coincidentes.
- **Aplicación:**
  - `checked` — `checked && !mixed`.
  - `indeterminate` — `mixed` (atributo `indeterminate`).
  - `disabled` — atributo `disabled` o `formDisabledCallback`.
  - `readonly` — atributo `readonly`.
  - `error` — atributo `error` (error-text presente).
- **Gap:** ninguno.

### 1.6 `forms/color-picker.ts`

- **Source** (L231, L246, L301): `open`, `disabled`.
- **JSDoc header**: **NO** tiene línea "Custom states:".
- **`<comp>.md`** (L115-120): 2 estados: `:state(open)`, `:state(disabled)`.
- **Aplicación:**
  - `open` — panel `<dialog>` abierto.
  - `disabled` — atributo `disabled` o `formDisabledCallback`.
- **Gap:** ninguno (`.md` cubre los dos estados; JSDoc podría añadir la línea
  para uniformidad, pero no es gap funcional).

### 1.7 `forms/combobox.ts`

- **Source** (`#setState` interno, L193-198; calls en L233, L254): `disabled`, `open`.
- **JSDoc header**: **NO** tiene línea "Custom states:".
- **`<comp>.md`** (L110-115): 2 estados: `:state(open)`, `:state(disabled)`.
- **Aplicación:**
  - `disabled` — atributo `disabled` o `formDisabledCallback`.
  - `open` — listbox `<dialog>` abierto.
- **Gap:** ninguno (mismo patrón que color-picker).

### 1.8 `forms/file-input.ts`

- **Source** (`#setState` interno L150-157; calls en L110, L128, L195, L225, L231, L237, L243, L270, L331): `blank`, `dragging`, `disabled`.
- **JSDoc header** (L21): "Custom states: blank, dragging  (:state / data-state-*)".
- **`<comp>.md`** (L104-110): 3 estados: `:state(dragging)`, `:state(disabled)`, `:state(blank)`.
- **Aplicación:**
  - `blank` — sin archivos seleccionados.
  - `dragging` — hay un drag en curso sobre la dropzone.
  - `disabled` — atributo `disabled` o `formDisabledCallback`.
- **Gap:** **`disabled` se setea en source pero no aparece en JSDoc.** El `.md`
  sí lo documenta. La cabecera JSDoc está desactualizada con respecto al `.md`.

### 1.9 `forms/inline-edit.ts`

- **Source** (`STATES` array L39, calls en L98, L109, L117, L152, L214, L218-225): `idle`, `editing`, `saved`, `cancelled`, `blank`.
- **JSDoc header** (L28): "Custom states: idle, editing, saved, cancelled".
- **`<comp>.md`** (L105-113): 5 estados: `:state(idle)`, `:state(editing)`, `:state(saved)`, `:state(cancelled)`, `:state(blank)`.
- **Aplicación:**
  - `idle` — modo lectura (estado por defecto).
  - `editing` — editor activo.
  - `saved` — 280 ms tras guardar; revierte a `idle`.
  - `cancelled` — 280 ms tras cancelar; revierte a `idle`.
  - `blank` — `value` está vacío (se sincroniza en input event).
- **Gap:** **`blank` se setea en source y se documenta en `.md`, pero la JSDoc
  cabecera lo omite.** Estados excluyentes: `editing/saved/cancelled/idle` se
  limpian mutuamente (ver L218-225).

### 1.10 `forms/input.ts`

- **Source** (L455, L456, L467, L499, L549, L552, L574): `disabled`, `readonly`, `blank`, `invalid`, `focused`, `password-visible`.
- **JSDoc header** (L35): "Custom states: blank, disabled, readonly, focused, invalid, password-visible".
- **`<comp>.md`** (L165-174): 6 estados coincidentes.
- **Aplicación:**
  - `disabled` — atributo `disabled` o `formDisabledCallback`.
  - `readonly` — atributo `readonly`.
  - `blank` — `value === ''`.
  - `invalid` — el control falla validación (internals.validationMessage).
  - `focused` — input interno tiene foco (en/desde blur listeners).
  - `password-visible` — el ojo del toggle-password está activo (input type="password" visible).
- **Gap:** ninguno.

### 1.11 `forms/masked-input.ts`

- **Source** (L85, L170): `invalid`, `complete`.
- **JSDoc header**: **NO** tiene línea "Custom states:".
- **`<comp>.md`** (L117-122): 2 estados: `:state(complete)`, `:state(invalid)`.
- **Aplicación:**
  - `invalid` — atributo `invalid` presente (típicamente cuando `required` y `value` vacío tras blur).
  - `complete` — todos los tokens requeridos del `pattern` están llenos.
- **Gap:** ninguno (mismo patrón que color-picker, combobox).

### 1.12 `forms/radio.ts`

- **Source** (L123-125, con `PLACEMENTS = ['end','start','top','bottom']` en L38): `placement-end` (nunca activo), `placement-start`, `placement-top`, `placement-bottom`, `readonly`, `error`.
- **JSDoc header** (L18): "Custom states: placement-* readonly error (heredados del grupo)".
- **`<comp>.md`** (L105-113): 5 estados: `:state(error)`, `:state(placement-start)`, `:state(placement-top)`, `:state(placement-bottom)`, `:state(readonly)`. **No documenta `placement-end`** (correcto: nunca se activa).
- **Aplicación:**
  - `placement-*` — refleja el `label-placement` del grupo o propio. La lógica `p !== 'end' && p === placement` en L123 hace que `placement-end` (default) NUNCA se active, ya que el state sólo se enciende cuando `p === placement` y `p !== 'end'`. Es comportamiento intencionado para que el estado por defecto no requiera atributo.
  - `readonly` — heredado del grupo.
  - `error` — heredado del grupo.
- **Gap:** ninguno (drift de `placement-end` es intencionado, documentado en source).

### 1.13 `forms/radio-group.ts`

- **Source** (L250-253): `disabled`, `readonly`, `error`, `blank`.
- **JSDoc header** (L27): "Custom states: disabled, readonly, error, blank".
- **`<comp>.md`** (L129-136): 4 estados coincidentes.
- **Aplicación:**
  - `disabled` — atributo `disabled` o `formDisabledCallback`.
  - `readonly` — atributo `readonly`.
  - `error` — atributo `error` (error-text presente).
  - `blank` — `!this.value` (ningún radio seleccionado).
- **Gap:** ninguno.

### 1.14 `forms/rating.ts`

- **Source** (L330, L331, L362): `disabled`, `readonly`, `blank`.
- **JSDoc header** (L32): "Custom states: blank, disabled, readonly".
- **`<comp>.md`** (L130-136): 3 estados coincidentes.
- **Aplicación:**
  - `disabled` — atributo `disabled` o `formDisabledCallback`.
  - `readonly` — atributo `readonly`.
  - `blank` — `this.#value === 0` (sin calificación).
- **Gap:** ninguno.

### 1.15 `forms/select.ts`

- **Source** (L438, L517, L535, L750): `blank`, `error`, `disabled`, `open`.
- **JSDoc header**: **NO** tiene línea "Custom states:".
- **`<comp>.md`** (L143-150): 4 estados: `:state(open)`, `:state(blank)`, `:state(error)`, `:state(disabled)`.
- **Aplicación:**
  - `blank` — `this.#values.length === 0` (sin selección).
  - `error` — atributo `error`.
  - `disabled` — atributo `disabled` o `formDisabledCallback`.
  - `open` — listbox `<dialog>` abierto.
- **Gap:** ninguno (mismo patrón que color-picker, combobox, masked-input).

### 1.16 `forms/slider.ts`

- **Source** (L444, L445, L710, L738, L780, L781): `disabled`, `readonly`, `dragging`, `focused`.
- **JSDoc header** (L36): "Custom states: disabled, readonly, dragging, focused".
- **`<comp>.md`** (L143-150): 4 estados coincidentes.
- **Aplicación:**
  - `disabled` — atributo `disabled` o `formDisabledCallback`.
  - `readonly` — atributo `readonly`.
  - `dragging` — usuario está arrastrando un thumb.
  - `focused` — focus está dentro del slider.
- **Gap:** ninguno.

### 1.17 `forms/switch.ts`

- **Source** (L249-252): `checked`, `disabled`, `readonly`, `error`.
- **JSDoc header** (L30): "Custom states: checked, disabled, readonly, error".
- **`<comp>.md`** (L123-130): 4 estados coincidentes.
- **Aplicación:**
  - `checked` — `checked` activo.
  - `disabled` — atributo `disabled` o `formDisabledCallback`.
  - `readonly` — atributo `readonly`.
  - `error` — atributo `error`.
- **Gap:** ninguno.

### 1.18 `forms/textarea.ts`

- **Source** (L314, L315, L320, L349, L405, L408): `disabled`, `readonly`, `blank`, `invalid`, `focused`.
- **JSDoc header** (L24): "Custom states: blank, disabled, readonly, focused, invalid".
- **`<comp>.md`** (L143-151): 5 estados coincidentes.
- **Aplicación:**
  - `disabled` — atributo `disabled` o `formDisabledCallback`.
  - `readonly` — atributo `readonly`.
  - `blank` — `value === ''`.
  - `invalid` — validación falla.
  - `focused` — textarea interno tiene foco.
- **Gap:** ninguno.

### 1.19 `helpers/popover.ts`

- **Source** (L293, L294 vía `internals?.states?.add/delete`): `open`.
- **JSDoc header**: **NO** tiene línea "Custom states:" en la cabecera.
- **`<comp>.md`** (L113-115): "No expone."
- **Aplicación:**
  - `open` — el popover está visible (sincronizado con `aria-expanded` en el ancla).
- **Gap:** **`open` se setea en source pero el `.md` dice "No expone."**
  El `.md` no refleja el contrato real. Cualquier consumidor que dependa del
  `:state(open)` para CSS no lo encontrará documentado.

### 1.20 `layout/dock.ts`

- **Source**: NO tiene llamadas a `setCustomState` ni a `internals.states.add`.
- **JSDoc header** (L21): "Custom states: hovering".
- **`<comp>.md`** (L97-99): "No expone custom states."
- **Aplicación:** N/A — la magnificación se aplica vía CSS variable `--scale`
  en cada item, no como custom state del host.
- **Gap:** **El JSDoc miente: dice que expone `hovering` pero el código no
  implementa tal custom state.** El `.md` está alineado con el código. La JSDoc
  debería eliminarse o sustituirse por una nota sobre `--scale`.

### 1.21 `_shared/date-field-element.ts` (factory) + wrappers

Componente compartido: la factory define el custom element con los states.
Los tres wrappers `date-field.ts`, `date-time-field.ts`, `time-field.ts`
solo llaman `defineDateField({...})`.

- **Source** (`#setState` interno L223-228; calls en L254, L301, L313): `disabled`, `invalid`.
- **JSDoc header**: **NO** (es un factory, no tiene JSDoc de cara al público).
- **`<comp>.md` de wrappers** (date-field.md L71-73, date-time-field.md L71-73,
  time-field.md L71-73): "No expone." (en los tres).
- **Aplicación:**
  - `disabled` — atributo `disabled` o `formDisabledCallback`.
  - `invalid` — el campo falla validación (típicamente required+empty).
- **Gap:** **Los tres wrappers `.md` dicen "No expone" pero la factory SÍ setea
  `disabled` e `invalid`.** Es el gap más severo porque los tres son
  user-facing y el `.md` es la fuente de verdad para LLM. La factory no tiene
  JSDoc propio donde documentar estos states, así que la información debe vivir
  en los `.md` de los wrappers o en la cabecera de la factory.

---

## 2. Patrones a normalizar

1. **8 componentes sin línea `Custom states:` en JSDoc** (code.ts, color-picker.ts,
   combobox.ts, masked-input.ts, select.ts, popover.ts, date-field-element.ts,
   y los wrappers de date/time). El estándar del usuario pide que **TODO**
   componente que declare states tenga la línea. Recomiendo añadir la línea
   (o `No expone.` si es lo correcto) a:
   - `code/code.ts` (4 states: `blank`, `inline`, `disabled`, `readonly`)
   - `forms/color-picker.ts` (2 states: `open`, `disabled`)
   - `forms/combobox.ts` (2 states: `open`, `disabled`)
   - `forms/masked-input.ts` (2 states: `invalid`, `complete`)
   - `forms/select.ts` (4 states: `open`, `blank`, `error`, `disabled`)
   - `helpers/popover.ts` (1 state: `open`)
   - `_shared/date-field-element.ts` (2 states: `disabled`, `invalid`) — o
     documentar en los wrappers.

2. **El JSDoc y el source discrepan en 4 archivos** (button no, copy-button
   `disabled` falta; file-input `disabled` falta; inline-edit `blank` falta;
   context-menu/dock declaran states fantasma).

3. **El `.md` y el source discrepan en 3 archivos** (copy-button `disabled`,
   code.ts `inline`, popover `open`).

4. **Los `.md` de los date/time-field wrappers no reflejan los states de la
   factory** (3 archivos: date-field.md, date-time-field.md, time-field.md).

5. **2 JSDocs con states fantasma** (no implementados): `actions/context-menu.ts`
   dice `open, closed`; `layout/dock.ts` dice `hovering`. Ambos dicen la
   verdad en su `.md` (que es "No expone" / "No expone custom states").

---

## 3. Recomendaciones

1. **Sync source ↔ JSDoc ↔ `.md`** en los 7 issues listados. Específicamente:
   - Añadir `disabled` a JSDoc y `.md` de `actions/copy-button.ts`.
   - Añadir `disabled` a JSDoc de `forms/file-input.ts` (`.md` ya lo tiene).
   - Añadir `inline` a `.md` de `code/code.ts`.
   - Añadir `open` a `.md` de `helpers/popover.ts`.
   - Eliminar JSDoc ficticio de `actions/context-menu.ts` y `layout/dock.ts`
     (o reemplazar por la verdad: atributo `open` / variable CSS `--scale`).
   - Añadir `disabled` y `invalid` a los `.md` de date-field, date-time-field,
     time-field (o a la cabecera de `date-field-element.ts`).

2. **Añadir línea `Custom states:`** a los 8 archivos JSDoc que faltan, para
   uniformidad con el estándar de Phase G1.

3. **Considerar linter/test** que detecte:
   - `setCustomState('X', ...)` en source sin X en cabecera JSDoc.
   - `Custom states: X` en JSDoc sin llamada a `setCustomState('X', ...)`.
   - `setCustomState('X', ...)` en source sin fila en tabla "Custom states" del `.md`.

4. **Decidir fuente de verdad**: ¿JSDoc, `.md`, o un test que las sincronice?
   El estándar del usuario dice "El doc debe documentar TODOS los `:state()` que
   el componente declara en su `static states`" — pero el repo no usa `static
   states`. El test debería comparar el source (setCustomState calls) contra el
   `.md` (que es la fuente de verdad para el LLM que renderiza docs).

---

## 4. Acceptance criteria check

- [x] Tabla Markdown con TODOS los componentes que tienen states (§0.3).
- [x] Para cada uno, lista de states declarados vs documentados (§1).
- [x] Lista de issues (gaps) (§0.4).
- [x] NO commits (audit only).
- [x] NO `Co-authored-by` (no commits).
- [x] NO `git push`.

**Reporte generado:** `C:\ContaPyme\Personal\apps\iswc-root\.audit\states-audit-iswc.md`
**Componentes auditados:** 22 (17 con setCustomState real + 2 con JSDoc ficticio + 3 wrappers de factory)
**Issues encontrados:** 7
