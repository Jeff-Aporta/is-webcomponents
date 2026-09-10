# Auditoría del kit iswc (iswc-audit)

- **Motor**: v1.0.0
- **Inicio**: 2026-09-09T21:03:02.197Z
- **Fin**: 2026-09-09T21:03:02.453Z
- **Duración**: 0.26s
- **Componentes auditados**: 185

## Resumen

| Estado | Cantidad |
|--------|----------|
| ✅ ok | 124 |
| ⚠️ warning | 24 |
| ❌ fail | 37 |

### Hallazgos por severidad

| Severidad | Cantidad |
|-----------|----------|
| 🛑 fatal | 0 |
| 🔴 error | 80 |
| 🟡 warn | 90 |
| 🔵 info | 0 |

## Componentes con hallazgos

### ⚠️ `is-button` — Button `(actions)`

- **Ruta JSON**: `src/components/actions/button.json`
- **Ruta módulo**: `src/components/actions/button.ts`
- **Métricas**:
  - `secciones`: 20
  - `bloques`: 70
  - `demos`: 22
  - `controles`: 18

- 🟡 📝 **json-contenido** — Bloque html contiene <style>; usar el campo `styles` raíz o un behavior en su lugar.
  - 📄 `src/components/actions/button.json`

### ⚠️ `is-check-icon-button` — Check Icon Button `(actions)`

- **Ruta JSON**: `src/components/actions/check-icon-button.json`
- **Ruta módulo**: `src/components/actions/check-icon-button.ts`
- **Métricas**:
  - `secciones`: 7
  - `bloques`: 12
  - `demos`: 5
  - `controles`: 5

- 🟡 🔗 **consistencia** — Control "variant" (prop="attr:variant") en src/components/actions/check-icon-button.json#sections[0].blocks[0].controls[3] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\actions\check-icon-button.ts`
  - 💡 Agregá 'variant' al array devuelto por static get observedAttributes().

### ❌ `is-speech` — Speech `(media)`

- **Ruta JSON**: `src/components/media/speech.json`
- **Ruta módulo**: `src/components/media/speech.ts`
- **Métricas**:
  - `secciones`: 1
  - `bloques`: 3
  - `demos`: 1
  - `controles`: 1

- 🟡 🔗 **consistencia** — Control "lang" (prop="attr:lang") en src/components/media/speech.json#sections[0].blocks[0].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\media\speech.ts`
  - 💡 Agregá 'lang' al array devuelto por static get observedAttributes().
- 🔴 ⚙️ **runtime** — observedAttributes declarado pero sin attributeChangedCallback: los cambios de atributo nunca se procesan. El playground del demo no será reactivo.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\media\speech.ts`

### ❌ `is-media-recorder` — Media Recorder `(media)`

- **Ruta JSON**: `src/components/media/media-recorder.json`
- **Ruta módulo**: `src/components/media/media-recorder.ts`
- **Métricas**:
  - `secciones`: 1
  - `bloques`: 3
  - `demos`: 1
  - `controles`: 1

- 🟡 🔗 **consistencia** — Control "source" (prop="attr:source") en src/components/media/media-recorder.json#sections[0].blocks[0].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\media\media-recorder.ts`
  - 💡 Agregá 'source' al array devuelto por static get observedAttributes().
- 🔴 ⚙️ **runtime** — observedAttributes declarado pero sin attributeChangedCallback: los cambios de atributo nunca se procesan. El playground del demo no será reactivo.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\media\media-recorder.ts`

### ⚠️ `is-theme-toggle` — Theme Toggle `(feedback)`

- **Ruta JSON**: `src/components/feedback/theme-toggle.json`
- **Ruta módulo**: `src/components/feedback/theme-toggle.ts`
- **Métricas**:
  - `secciones`: 3
  - `bloques`: 4
  - `demos`: 2
  - `controles`: 1

- 🟡 🔗 **consistencia** — Control "dark" (prop="attr:dark") en src/components/feedback/theme-toggle.json#sections[0].blocks[0].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\feedback\theme-toggle.ts`
  - 💡 Agregá 'dark' al array devuelto por static get observedAttributes().

### ⚠️ `is-prefs-clear` — Prefs Clear `(feedback)`

- **Ruta JSON**: `src/components/feedback/prefs-clear.json`
- **Ruta módulo**: `src/components/feedback/prefs-clear.ts`
- **Métricas**:
  - `secciones`: 1
  - `bloques`: 1
  - `demos`: 1
  - `controles`: 1

- 🟡 🔗 **consistencia** — Control "reload" (prop="attr:reload") en src/components/feedback/prefs-clear.json#sections[0].blocks[0].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\feedback\prefs-clear.ts`
  - 💡 Agregá 'reload' al array devuelto por static get observedAttributes().

### ⚠️ `is-split-panel` — Panel dividido `(layout)`

- **Ruta JSON**: `src/components/layout/split-panel.json`
- **Ruta módulo**: `src/components/layout/split-panel.ts`
- **Métricas**:
  - `secciones`: 9
  - `bloques`: 28
  - `demos`: 1
  - `controles`: 5

- 🟡 📝 **json-contenido** — Bloque code parece tener un placeholder sin expandir (TODO/FIXME/...).
  - 📄 `src/components/layout/split-panel.json`
  - 🔎 {"code":"<is-split-panel disabled>\n  ...\n</is-split-panel>"}

### ⚠️ `is-demo` — Demo `(layout)`

- **Ruta JSON**: ``
- **Ruta módulo**: `src/components/layout/demo.ts`

- 🟡 📐 **json-schema** — No se encontró JSON de preview para <is-demo>.
  - 💡 Creá un archivo de definición siguiendo el esquema is-preview/v1.

### ❌ `is-ui` — IsUi `(helpers)`

- **Ruta JSON**: `src/components/helpers/ui.json`
- **Ruta módulo**: `src/components/helpers/ui.ts`
- **Métricas**:
  - `secciones`: 5
  - `bloques`: 7
  - `demos`: 3
  - `controles`: 0

- 🟡 📝 **json-contenido** — Bloque demo en sections[0].blocks[0] no contiene ningún <is-*>.
  - 📄 `src/components/helpers/ui.json`
  - 💡 Si el demo no usa ningún is-*, convertilo a bloque `html` (no necesita chrome de demo).
  - 🔎 {"html":"<span class=\"demo-label\">// Disponible tras all.min.js</span>\r\n          <div cl…"}
- 🟡 📝 **json-contenido** — Bloque demo en sections[1].blocks[0] no contiene ningún <is-*>.
  - 📄 `src/components/helpers/ui.json`
  - 💡 Si el demo no usa ningún is-*, convertilo a bloque `html` (no necesita chrome de demo).
  - 🔎 {"html":"<div class=\"ui-stage\" id=\"htmlStage\"></div>"}
- 🟡 📝 **json-contenido** — Bloque demo en sections[2].blocks[0] no contiene ningún <is-*>.
  - 📄 `src/components/helpers/ui.json`
  - 💡 Si el demo no usa ningún is-*, convertilo a bloque `html` (no necesita chrome de demo).
  - 🔎 {"html":"<span class=\"demo-label\">// demo-card registrado en esta página</span>\r\n        …"}
- 🔴 🔗 **consistencia** — Módulo del componente no llama customElements.define('is-ui', …). El JSON declara demos de <is-ui> pero el tag nunca se registra.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\helpers\ui.ts`

### ❌ `is-tree` — Tree `(navigation)`

- **Ruta JSON**: `src/components/navigation/tree.json`
- **Ruta módulo**: `src/components/navigation/tree.ts`
- **Métricas**:
  - `secciones`: 6
  - `bloques`: 12
  - `demos`: 5
  - `controles`: 3

- 🔴 🧩 **json-complejidad** — Demo de <is-tree> no declara <script type="application/json"> con payload.
  - 📄 `src/components/navigation/tree.json`
  - 💡 Pasale la data por JSON al host: <is-tree><script type="application/json">{…}</script></is-tree>.
- 🔴 🧩 **json-complejidad** — Demo de <is-tree> no declara <script type="application/json"> con payload.
  - 📄 `src/components/navigation/tree.json`
  - 💡 Pasale la data por JSON al host: <is-tree><script type="application/json">{…}</script></is-tree>.
- 🔴 🧩 **json-complejidad** — Demo de <is-tree> no declara <script type="application/json"> con payload.
  - 📄 `src/components/navigation/tree.json`
  - 💡 Pasale la data por JSON al host: <is-tree><script type="application/json">{…}</script></is-tree>.
- 🔴 🧩 **json-complejidad** — Demo de <is-tree> no declara <script type="application/json"> con payload.
  - 📄 `src/components/navigation/tree.json`
  - 💡 Pasale la data por JSON al host: <is-tree><script type="application/json">{…}</script></is-tree>.
- 🔴 🧩 **json-complejidad** — Demo de <is-tree> no declara <script type="application/json"> con payload.
  - 📄 `src/components/navigation/tree.json`
  - 💡 Pasale la data por JSON al host: <is-tree><script type="application/json">{…}</script></is-tree>.

### ❌ `is-tree-item` — Tree Item `(navigation)`

- **Ruta JSON**: `src/components/navigation/tree-item.json`
- **Ruta módulo**: `src/components/navigation/tree.ts`
- **Métricas**:
  - `secciones`: 2
  - `bloques`: 3
  - `demos`: 1
  - `controles`: 1

- 🔴 🧩 **json-complejidad** — Demo de <is-tree> no declara <script type="application/json"> con payload.
  - 📄 `src/components/navigation/tree-item.json`
  - 💡 Pasale la data por JSON al host: <is-tree><script type="application/json">{…}</script></is-tree>.

### ❌ `is-date-picker` — Date Picker `(forms)`

- **Ruta JSON**: `src/components/forms/date-picker.json`
- **Ruta módulo**: `src/components/forms/date-picker.ts`
- **Métricas**:
  - `secciones`: 7
  - `bloques`: 9
  - `demos`: 6
  - `controles`: 11

- 🔴 🧩 **json-complejidad** — Demo de <is-date-picker> no declara <script type="application/json"> con payload.
  - 📄 `src/components/forms/date-picker.json`
  - 💡 Pasale la data por JSON al host: <is-date-picker><script type="application/json">{…}</script></is-date-picker>.
- 🔴 🧩 **json-complejidad** — Demo de <is-date-picker> no declara <script type="application/json"> con payload.
  - 📄 `src/components/forms/date-picker.json`
  - 💡 Pasale la data por JSON al host: <is-date-picker><script type="application/json">{…}</script></is-date-picker>.
- 🔴 🧩 **json-complejidad** — Demo de <is-date-picker> no declara <script type="application/json"> con payload.
  - 📄 `src/components/forms/date-picker.json`
  - 💡 Pasale la data por JSON al host: <is-date-picker><script type="application/json">{…}</script></is-date-picker>.
- 🔴 🧩 **json-complejidad** — Demo de <is-date-picker> no declara <script type="application/json"> con payload.
  - 📄 `src/components/forms/date-picker.json`
  - 💡 Pasale la data por JSON al host: <is-date-picker><script type="application/json">{…}</script></is-date-picker>.
- 🔴 🧩 **json-complejidad** — Demo de <is-date-picker> no declara <script type="application/json"> con payload.
  - 📄 `src/components/forms/date-picker.json`
  - 💡 Pasale la data por JSON al host: <is-date-picker><script type="application/json">{…}</script></is-date-picker>.
- 🔴 🧩 **json-complejidad** — Demo de <is-month-calendar> no declara <script type="application/json"> con payload.
  - 📄 `src/components/forms/date-picker.json`
  - 💡 Pasale la data por JSON al host: <is-month-calendar><script type="application/json">{…}</script></is-month-calendar>.
- 🔴 🧩 **json-complejidad** — Demo de <is-year-calendar> no declara <script type="application/json"> con payload.
  - 📄 `src/components/forms/date-picker.json`
  - 💡 Pasale la data por JSON al host: <is-year-calendar><script type="application/json">{…}</script></is-year-calendar>.

### ❌ `is-month-calendar` — Month Calendar `(forms)`

- **Ruta JSON**: `src/components/forms/month-calendar.json`
- **Ruta módulo**: `src/components/forms/month-calendar.ts`
- **Métricas**:
  - `secciones`: 2
  - `bloques`: 3
  - `demos`: 1
  - `controles`: 1

- 🔴 🧩 **json-complejidad** — Demo de <is-month-calendar> no declara <script type="application/json"> con payload.
  - 📄 `src/components/forms/month-calendar.json`
  - 💡 Pasale la data por JSON al host: <is-month-calendar><script type="application/json">{…}</script></is-month-calendar>.

### ❌ `is-year-calendar` — Year Calendar `(forms)`

- **Ruta JSON**: `src/components/forms/year-calendar.json`
- **Ruta módulo**: `src/components/forms/year-calendar.ts`
- **Métricas**:
  - `secciones`: 2
  - `bloques`: 3
  - `demos`: 1
  - `controles`: 1

- 🔴 🧩 **json-complejidad** — Demo de <is-year-calendar> no declara <script type="application/json"> con payload.
  - 📄 `src/components/forms/year-calendar.json`
  - 💡 Pasale la data por JSON al host: <is-year-calendar><script type="application/json">{…}</script></is-year-calendar>.

### ❌ `is-date-field` — Date Field `(forms)`

- **Ruta JSON**: `src/components/forms/date-field.json`
- **Ruta módulo**: `src/components/forms/date-field.ts`
- **Métricas**:
  - `secciones`: 5
  - `bloques`: 6
  - `demos`: 4
  - `controles`: 7

- 🔴 🔗 **consistencia** — Módulo del componente no llama customElements.define('is-date-field', …). El JSON declara demos de <is-date-field> pero el tag nunca se registra.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\date-field.ts`
- 🟡 🔗 **consistencia** — Control "label" (prop="attr:label") en src/components/forms/date-field.json#sections[0].blocks[0].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\date-field.ts`
  - 💡 Agregá 'label' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "value" (prop="attr:value") en src/components/forms/date-field.json#sections[0].blocks[0].controls[1] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\date-field.ts`
  - 💡 Agregá 'value' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "locale" (prop="attr:locale") en src/components/forms/date-field.json#sections[0].blocks[0].controls[2] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\date-field.ts`
  - 💡 Agregá 'locale' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "clearable" (prop="attr:clearable") en src/components/forms/date-field.json#sections[0].blocks[0].controls[3] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\date-field.ts`
  - 💡 Agregá 'clearable' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "required" (prop="attr:required") en src/components/forms/date-field.json#sections[0].blocks[0].controls[4] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\date-field.ts`
  - 💡 Agregá 'required' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "min" (prop="attr:min") en src/components/forms/date-field.json#sections[0].blocks[0].controls[5] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\date-field.ts`
  - 💡 Agregá 'min' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "readonly" (prop="attr:readonly") en src/components/forms/date-field.json#sections[0].blocks[0].controls[6] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\date-field.ts`
  - 💡 Agregá 'readonly' al array devuelto por static get observedAttributes().

### ❌ `is-time-field` — Time Field `(forms)`

- **Ruta JSON**: `src/components/forms/time-field.json`
- **Ruta módulo**: `src/components/forms/time-field.ts`
- **Métricas**:
  - `secciones`: 2
  - `bloques`: 3
  - `demos`: 1
  - `controles`: 1

- 🔴 🔗 **consistencia** — Módulo del componente no llama customElements.define('is-time-field', …). El JSON declara demos de <is-time-field> pero el tag nunca se registra.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\time-field.ts`
- 🟡 🔗 **consistencia** — Control "value" (prop="attr:value") en src/components/forms/time-field.json#sections[0].blocks[0].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\time-field.ts`
  - 💡 Agregá 'value' al array devuelto por static get observedAttributes().

### ❌ `is-date-time-field` — Date Time Field `(forms)`

- **Ruta JSON**: `src/components/forms/date-time-field.json`
- **Ruta módulo**: `src/components/forms/date-time-field.ts`
- **Métricas**:
  - `secciones`: 2
  - `bloques`: 3
  - `demos`: 1
  - `controles`: 1

- 🔴 🔗 **consistencia** — Módulo del componente no llama customElements.define('is-date-time-field', …). El JSON declara demos de <is-date-time-field> pero el tag nunca se registra.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\date-time-field.ts`
- 🟡 🔗 **consistencia** — Control "value" (prop="attr:value") en src/components/forms/date-time-field.json#sections[0].blocks[0].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\date-time-field.ts`
  - 💡 Agregá 'value' al array devuelto por static get observedAttributes().

### ❌ `is-date-input` — Date Input `(forms)`

- **Ruta JSON**: `src/components/forms/date-input.json`
- **Ruta módulo**: `src/components/forms/date-input.ts`
- **Métricas**:
  - `secciones`: 6
  - `bloques`: 7
  - `demos`: 5
  - `controles`: 5

- 🔴 🔗 **consistencia** — Módulo del componente no llama customElements.define('is-date-input', …). El JSON declara demos de <is-date-input> pero el tag nunca se registra.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\date-input.ts`
- 🟡 🔗 **consistencia** — Control "label" (prop="attr:label") en src/components/forms/date-input.json#sections[0].blocks[0].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\date-input.ts`
  - 💡 Agregá 'label' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "value" (prop="attr:value") en src/components/forms/date-input.json#sections[0].blocks[0].controls[1] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\date-input.ts`
  - 💡 Agregá 'value' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "locale" (prop="attr:locale") en src/components/forms/date-input.json#sections[0].blocks[0].controls[2] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\date-input.ts`
  - 💡 Agregá 'locale' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "clearable" (prop="attr:clearable") en src/components/forms/date-input.json#sections[0].blocks[0].controls[3] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\date-input.ts`
  - 💡 Agregá 'clearable' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "action-bar" (prop="attr:action-bar") en src/components/forms/date-input.json#sections[0].blocks[0].controls[4] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\date-input.ts`
  - 💡 Agregá 'action-bar' al array devuelto por static get observedAttributes().

### ❌ `is-time-input` — Time Input `(forms)`

- **Ruta JSON**: `src/components/forms/time-input.json`
- **Ruta módulo**: `src/components/forms/time-input.ts`
- **Métricas**:
  - `secciones`: 2
  - `bloques`: 3
  - `demos`: 1
  - `controles`: 2

- 🔴 🔗 **consistencia** — Módulo del componente no llama customElements.define('is-time-input', …). El JSON declara demos de <is-time-input> pero el tag nunca se registra.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\time-input.ts`
- 🟡 🔗 **consistencia** — Control "label" (prop="attr:label") en src/components/forms/time-input.json#sections[0].blocks[0].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\time-input.ts`
  - 💡 Agregá 'label' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "value" (prop="attr:value") en src/components/forms/time-input.json#sections[0].blocks[0].controls[1] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\time-input.ts`
  - 💡 Agregá 'value' al array devuelto por static get observedAttributes().

### ❌ `is-date-time-input` — Date Time Input `(forms)`

- **Ruta JSON**: `src/components/forms/date-time-input.json`
- **Ruta módulo**: `src/components/forms/date-time-input.ts`
- **Métricas**:
  - `secciones`: 2
  - `bloques`: 3
  - `demos`: 1
  - `controles`: 2

- 🔴 🔗 **consistencia** — Módulo del componente no llama customElements.define('is-date-time-input', …). El JSON declara demos de <is-date-time-input> pero el tag nunca se registra.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\date-time-input.ts`
- 🟡 🔗 **consistencia** — Control "label" (prop="attr:label") en src/components/forms/date-time-input.json#sections[0].blocks[0].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\date-time-input.ts`
  - 💡 Agregá 'label' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "value" (prop="attr:value") en src/components/forms/date-time-input.json#sections[0].blocks[0].controls[1] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\date-time-input.ts`
  - 💡 Agregá 'value' al array devuelto por static get observedAttributes().

### ❌ `is-date-range-input` — Date Range Input `(forms)`

- **Ruta JSON**: `src/components/forms/date-range-input.json`
- **Ruta módulo**: `src/components/forms/date-range-input.ts`
- **Métricas**:
  - `secciones`: 2
  - `bloques`: 3
  - `demos`: 1
  - `controles`: 3

- 🔴 🔗 **consistencia** — Módulo del componente no llama customElements.define('is-date-range-input', …). El JSON declara demos de <is-date-range-input> pero el tag nunca se registra.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\date-range-input.ts`
- 🟡 🔗 **consistencia** — Control "label" (prop="attr:label") en src/components/forms/date-range-input.json#sections[0].blocks[0].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\date-range-input.ts`
  - 💡 Agregá 'label' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "start" (prop="attr:start") en src/components/forms/date-range-input.json#sections[0].blocks[0].controls[1] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\date-range-input.ts`
  - 💡 Agregá 'start' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "end" (prop="attr:end") en src/components/forms/date-range-input.json#sections[0].blocks[0].controls[2] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\forms\date-range-input.ts`
  - 💡 Agregá 'end' al array devuelto por static get observedAttributes().

### ❌ `is-data-grid` — Data Grid `(data)`

- **Ruta JSON**: `src/components/data/data-grid.json`
- **Ruta módulo**: `src/components/data/data-grid.ts`
- **Métricas**:
  - `secciones`: 14
  - `bloques`: 33
  - `demos`: 12
  - `controles`: 0

- 🔴 📐 **json-schema** — sections[0].blocks[2].code: bloque code sin texto.
- 🔴 🧩 **json-complejidad** — Demo de <is-data-grid> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/data-grid.json`
  - 💡 Pasale la data por JSON al host: <is-data-grid><script type="application/json">{…}</script></is-data-grid>.
- 🔴 📝 **json-contenido** — Bloque code en sections[0].blocks[2] está vacío.
  - 📄 `src/components/data/data-grid.json`
- 🔴 🧩 **json-complejidad** — Demo de <is-data-grid> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/data-grid.json`
  - 💡 Pasale la data por JSON al host: <is-data-grid><script type="application/json">{…}</script></is-data-grid>.
- 🔴 🧩 **json-complejidad** — Demo de <is-data-grid> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/data-grid.json`
  - 💡 Pasale la data por JSON al host: <is-data-grid><script type="application/json">{…}</script></is-data-grid>.
- 🔴 🧩 **json-complejidad** — Demo de <is-data-grid> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/data-grid.json`
  - 💡 Pasale la data por JSON al host: <is-data-grid><script type="application/json">{…}</script></is-data-grid>.
- 🔴 🧩 **json-complejidad** — Demo de <is-data-grid> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/data-grid.json`
  - 💡 Pasale la data por JSON al host: <is-data-grid><script type="application/json">{…}</script></is-data-grid>.
- 🔴 🧩 **json-complejidad** — Demo de <is-data-grid> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/data-grid.json`
  - 💡 Pasale la data por JSON al host: <is-data-grid><script type="application/json">{…}</script></is-data-grid>.
- 🔴 🧩 **json-complejidad** — Demo de <is-data-grid> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/data-grid.json`
  - 💡 Pasale la data por JSON al host: <is-data-grid><script type="application/json">{…}</script></is-data-grid>.
- 🔴 🧩 **json-complejidad** — Demo de <is-data-grid> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/data-grid.json`
  - 💡 Pasale la data por JSON al host: <is-data-grid><script type="application/json">{…}</script></is-data-grid>.
- 🔴 🧩 **json-complejidad** — Demo de <is-data-grid> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/data-grid.json`
  - 💡 Pasale la data por JSON al host: <is-data-grid><script type="application/json">{…}</script></is-data-grid>.
- 🔴 🧩 **json-complejidad** — Demo de <is-data-grid> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/data-grid.json`
  - 💡 Pasale la data por JSON al host: <is-data-grid><script type="application/json">{…}</script></is-data-grid>.
- 🔴 🧩 **json-complejidad** — Demo de <is-data-grid> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/data-grid.json`
  - 💡 Pasale la data por JSON al host: <is-data-grid><script type="application/json">{…}</script></is-data-grid>.
- 🔴 🧩 **json-complejidad** — Demo de <is-data-grid> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/data-grid.json`
  - 💡 Pasale la data por JSON al host: <is-data-grid><script type="application/json">{…}</script></is-data-grid>.

### ❌ `is-chart` — Chart `(data-viz)`

- **Ruta JSON**: `src/components/charts/chart.json`
- **Ruta módulo**: `src/components/charts/chart.ts`
- **Métricas**:
  - `secciones`: 7
  - `bloques`: 19
  - `demos`: 2
  - `controles`: 4

- 🔴 🧩 **json-complejidad** — Demo de <is-chart> no declara <script type="application/json"> con payload.
  - 📄 `src/components/charts/chart.json`
  - 💡 Pasale la data por JSON al host: <is-chart><script type="application/json">{…}</script></is-chart>.

### ❌ `is-bar-chart` — Bar Chart `(data-viz)`

- **Ruta JSON**: `src/components/charts/bar-chart.json`
- **Ruta módulo**: `src/components/charts/bar-chart.ts`
- **Métricas**:
  - `secciones`: 1
  - `bloques`: 1
  - `demos`: 1
  - `controles`: 2

- 🔴 🔗 **consistencia** — Módulo del componente no llama customElements.define('is-bar-chart', …). El JSON declara demos de <is-bar-chart> pero el tag nunca se registra.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\bar-chart.ts`
- 🟡 🔗 **consistencia** — Módulo no usa guard idempotente (customElements.get(tag)). Llamar el módulo dos veces rompe.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\bar-chart.ts`
  - 💡 Envolvé customElements.define en `if (!customElements.get(tag)) customElements.define(...)`.
- 🟡 🔗 **consistencia** — Control "open-on-click" (prop="attr:open-on-click") en src/components/charts/bar-chart.json#sections[0].blocks[0].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\bar-chart.ts`
  - 💡 Agregá 'open-on-click' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "stacked" (prop="attr:stacked") en src/components/charts/bar-chart.json#sections[0].blocks[0].controls[1] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\bar-chart.ts`
  - 💡 Agregá 'stacked' al array devuelto por static get observedAttributes().

### ❌ `is-line-chart` — Line Chart `(data-viz)`

- **Ruta JSON**: `src/components/charts/line-chart.json`
- **Ruta módulo**: `src/components/charts/line-chart.ts`
- **Métricas**:
  - `secciones`: 1
  - `bloques`: 1
  - `demos`: 1
  - `controles`: 1

- 🔴 🔗 **consistencia** — Módulo del componente no llama customElements.define('is-line-chart', …). El JSON declara demos de <is-line-chart> pero el tag nunca se registra.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\line-chart.ts`
- 🟡 🔗 **consistencia** — Módulo no usa guard idempotente (customElements.get(tag)). Llamar el módulo dos veces rompe.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\line-chart.ts`
  - 💡 Envolvé customElements.define en `if (!customElements.get(tag)) customElements.define(...)`.
- 🟡 🔗 **consistencia** — Control "open-on-click" (prop="attr:open-on-click") en src/components/charts/line-chart.json#sections[0].blocks[0].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\line-chart.ts`
  - 💡 Agregá 'open-on-click' al array devuelto por static get observedAttributes().

### ❌ `is-pie-chart` — Pie Chart `(data-viz)`

- **Ruta JSON**: `src/components/charts/pie-chart.json`
- **Ruta módulo**: `src/components/charts/pie-chart.ts`
- **Métricas**:
  - `secciones`: 1
  - `bloques`: 1
  - `demos`: 1
  - `controles`: 1

- 🔴 🔗 **consistencia** — Módulo del componente no llama customElements.define('is-pie-chart', …). El JSON declara demos de <is-pie-chart> pero el tag nunca se registra.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\pie-chart.ts`
- 🟡 🔗 **consistencia** — Módulo no usa guard idempotente (customElements.get(tag)). Llamar el módulo dos veces rompe.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\pie-chart.ts`
  - 💡 Envolvé customElements.define en `if (!customElements.get(tag)) customElements.define(...)`.
- 🟡 🔗 **consistencia** — Control "open-on-click" (prop="attr:open-on-click") en src/components/charts/pie-chart.json#sections[0].blocks[0].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\pie-chart.ts`
  - 💡 Agregá 'open-on-click' al array devuelto por static get observedAttributes().

### ❌ `is-doughnut-chart` — Doughnut Chart `(data-viz)`

- **Ruta JSON**: `src/components/charts/doughnut-chart.json`
- **Ruta módulo**: `src/components/charts/doughnut-chart.ts`
- **Métricas**:
  - `secciones`: 1
  - `bloques`: 1
  - `demos`: 1
  - `controles`: 1

- 🔴 🔗 **consistencia** — Módulo del componente no llama customElements.define('is-doughnut-chart', …). El JSON declara demos de <is-doughnut-chart> pero el tag nunca se registra.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\doughnut-chart.ts`
- 🟡 🔗 **consistencia** — Módulo no usa guard idempotente (customElements.get(tag)). Llamar el módulo dos veces rompe.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\doughnut-chart.ts`
  - 💡 Envolvé customElements.define en `if (!customElements.get(tag)) customElements.define(...)`.
- 🟡 🔗 **consistencia** — Control "open-on-click" (prop="attr:open-on-click") en src/components/charts/doughnut-chart.json#sections[0].blocks[0].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\doughnut-chart.ts`
  - 💡 Agregá 'open-on-click' al array devuelto por static get observedAttributes().

### ❌ `is-radar-chart` — Radar Chart `(data-viz)`

- **Ruta JSON**: `src/components/charts/radar-chart.json`
- **Ruta módulo**: `src/components/charts/radar-chart.ts`
- **Métricas**:
  - `secciones`: 6
  - `bloques`: 11
  - `demos`: 5
  - `controles`: 3

- 🔴 🧩 **json-complejidad** — Demo de <is-radar-chart> no declara <script type="application/json"> con payload.
  - 📄 `src/components/charts/radar-chart.json`
  - 💡 Pasale la data por JSON al host: <is-radar-chart><script type="application/json">{…}</script></is-radar-chart>.
- 🔴 🧩 **json-complejidad** — Demo de <is-radar-chart> no declara <script type="application/json"> con payload.
  - 📄 `src/components/charts/radar-chart.json`
  - 💡 Pasale la data por JSON al host: <is-radar-chart><script type="application/json">{…}</script></is-radar-chart>.
- 🔴 🔗 **consistencia** — Módulo del componente no llama customElements.define('is-radar-chart', …). El JSON declara demos de <is-radar-chart> pero el tag nunca se registra.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\radar-chart.ts`
- 🟡 🔗 **consistencia** — Módulo no usa guard idempotente (customElements.get(tag)). Llamar el módulo dos veces rompe.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\radar-chart.ts`
  - 💡 Envolvé customElements.define en `if (!customElements.get(tag)) customElements.define(...)`.
- 🟡 🔗 **consistencia** — Control "open-on-click" (prop="attr:open-on-click") en src/components/charts/radar-chart.json#sections[0].blocks[1].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\radar-chart.ts`
  - 💡 Agregá 'open-on-click' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "label" (prop="attr:label") en src/components/charts/radar-chart.json#sections[0].blocks[1].controls[1] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\radar-chart.ts`
  - 💡 Agregá 'label' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "legend-position" (prop="attr:legend-position") en src/components/charts/radar-chart.json#sections[0].blocks[1].controls[2] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\radar-chart.ts`
  - 💡 Agregá 'legend-position' al array devuelto por static get observedAttributes().

### ❌ `is-polar-area-chart` — Polar Area Chart `(data-viz)`

- **Ruta JSON**: `src/components/charts/polar-area-chart.json`
- **Ruta módulo**: `src/components/charts/polar-area-chart.ts`
- **Métricas**:
  - `secciones`: 5
  - `bloques`: 13
  - `demos`: 6
  - `controles`: 5

- 🔴 🔗 **consistencia** — Módulo del componente no llama customElements.define('is-polar-area-chart', …). El JSON declara demos de <is-polar-area-chart> pero el tag nunca se registra.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\polar-area-chart.ts`
- 🟡 🔗 **consistencia** — Módulo no usa guard idempotente (customElements.get(tag)). Llamar el módulo dos veces rompe.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\polar-area-chart.ts`
  - 💡 Envolvé customElements.define en `if (!customElements.get(tag)) customElements.define(...)`.
- 🟡 🔗 **consistencia** — Control "open-on-click" (prop="attr:open-on-click") en src/components/charts/polar-area-chart.json#sections[0].blocks[0].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\polar-area-chart.ts`
  - 💡 Agregá 'open-on-click' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "label" (prop="attr:label") en src/components/charts/polar-area-chart.json#sections[0].blocks[0].controls[1] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\polar-area-chart.ts`
  - 💡 Agregá 'label' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "legend-position" (prop="attr:legend-position") en src/components/charts/polar-area-chart.json#sections[0].blocks[0].controls[2] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\polar-area-chart.ts`
  - 💡 Agregá 'legend-position' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "without-legend" (prop="attr:without-legend") en src/components/charts/polar-area-chart.json#sections[0].blocks[0].controls[3] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\polar-area-chart.ts`
  - 💡 Agregá 'without-legend' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "without-animation" (prop="attr:without-animation") en src/components/charts/polar-area-chart.json#sections[0].blocks[0].controls[4] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\polar-area-chart.ts`
  - 💡 Agregá 'without-animation' al array devuelto por static get observedAttributes().

### ❌ `is-scatter-chart` — Scatter Chart `(data-viz)`

- **Ruta JSON**: `src/components/charts/scatter-chart.json`
- **Ruta módulo**: `src/components/charts/scatter-chart.ts`
- **Métricas**:
  - `secciones`: 6
  - `bloques`: 12
  - `demos`: 5
  - `controles`: 5

- 🔴 🧩 **json-complejidad** — Demo de <is-scatter-chart> no declara <script type="application/json"> con payload.
  - 📄 `src/components/charts/scatter-chart.json`
  - 💡 Pasale la data por JSON al host: <is-scatter-chart><script type="application/json">{…}</script></is-scatter-chart>.
- 🔴 🧩 **json-complejidad** — Demo de <is-scatter-chart> no declara <script type="application/json"> con payload.
  - 📄 `src/components/charts/scatter-chart.json`
  - 💡 Pasale la data por JSON al host: <is-scatter-chart><script type="application/json">{…}</script></is-scatter-chart>.
- 🔴 🔗 **consistencia** — Módulo del componente no llama customElements.define('is-scatter-chart', …). El JSON declara demos de <is-scatter-chart> pero el tag nunca se registra.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\scatter-chart.ts`
- 🟡 🔗 **consistencia** — Módulo no usa guard idempotente (customElements.get(tag)). Llamar el módulo dos veces rompe.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\scatter-chart.ts`
  - 💡 Envolvé customElements.define en `if (!customElements.get(tag)) customElements.define(...)`.
- 🟡 🔗 **consistencia** — Control "open-on-click" (prop="attr:open-on-click") en src/components/charts/scatter-chart.json#sections[0].blocks[1].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\scatter-chart.ts`
  - 💡 Agregá 'open-on-click' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "label" (prop="attr:label") en src/components/charts/scatter-chart.json#sections[0].blocks[1].controls[1] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\scatter-chart.ts`
  - 💡 Agregá 'label' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "x-label" (prop="attr:x-label") en src/components/charts/scatter-chart.json#sections[0].blocks[1].controls[2] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\scatter-chart.ts`
  - 💡 Agregá 'x-label' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "y-label" (prop="attr:y-label") en src/components/charts/scatter-chart.json#sections[0].blocks[1].controls[3] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\scatter-chart.ts`
  - 💡 Agregá 'y-label' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "grid" (prop="attr:grid") en src/components/charts/scatter-chart.json#sections[0].blocks[1].controls[4] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\scatter-chart.ts`
  - 💡 Agregá 'grid' al array devuelto por static get observedAttributes().

### ❌ `is-bubble-chart` — Bubble Chart `(data-viz)`

- **Ruta JSON**: `src/components/charts/bubble-chart.json`
- **Ruta módulo**: `src/components/charts/bubble-chart.ts`
- **Métricas**:
  - `secciones`: 1
  - `bloques`: 1
  - `demos`: 1
  - `controles`: 1

- 🔴 🔗 **consistencia** — Módulo del componente no llama customElements.define('is-bubble-chart', …). El JSON declara demos de <is-bubble-chart> pero el tag nunca se registra.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\bubble-chart.ts`
- 🟡 🔗 **consistencia** — Módulo no usa guard idempotente (customElements.get(tag)). Llamar el módulo dos veces rompe.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\bubble-chart.ts`
  - 💡 Envolvé customElements.define en `if (!customElements.get(tag)) customElements.define(...)`.
- 🟡 🔗 **consistencia** — Control "open-on-click" (prop="attr:open-on-click") en src/components/charts/bubble-chart.json#sections[0].blocks[0].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\bubble-chart.ts`
  - 💡 Agregá 'open-on-click' al array devuelto por static get observedAttributes().

### ❌ `is-sparkline` — Sparkline `(data-viz)`

- **Ruta JSON**: `src/components/charts/sparkline.json`
- **Ruta módulo**: `src/components/charts/sparkline.ts`
- **Métricas**:
  - `secciones`: 7
  - `bloques`: 12
  - `demos`: 6
  - `controles`: 4

- 🔴 🧩 **json-complejidad** — Demo de <is-sparkline> no declara <script type="application/json"> con payload.
  - 📄 `src/components/charts/sparkline.json`
  - 💡 Pasale la data por JSON al host: <is-sparkline><script type="application/json">{…}</script></is-sparkline>.
- 🔴 🧩 **json-complejidad** — Demo de <is-sparkline> no declara <script type="application/json"> con payload.
  - 📄 `src/components/charts/sparkline.json`
  - 💡 Pasale la data por JSON al host: <is-sparkline><script type="application/json">{…}</script></is-sparkline>.
- 🔴 🧩 **json-complejidad** — Demo de <is-sparkline> no declara <script type="application/json"> con payload.
  - 📄 `src/components/charts/sparkline.json`
  - 💡 Pasale la data por JSON al host: <is-sparkline><script type="application/json">{…}</script></is-sparkline>.
- 🔴 🧩 **json-complejidad** — Demo de <is-sparkline> no declara <script type="application/json"> con payload.
  - 📄 `src/components/charts/sparkline.json`
  - 💡 Pasale la data por JSON al host: <is-sparkline><script type="application/json">{…}</script></is-sparkline>.
- 🔴 🧩 **json-complejidad** — Demo de <is-sparkline> no declara <script type="application/json"> con payload.
  - 📄 `src/components/charts/sparkline.json`
  - 💡 Pasale la data por JSON al host: <is-sparkline><script type="application/json">{…}</script></is-sparkline>.
- 🔴 🧩 **json-complejidad** — Demo de <is-sparkline> no declara <script type="application/json"> con payload.
  - 📄 `src/components/charts/sparkline.json`
  - 💡 Pasale la data por JSON al host: <is-sparkline><script type="application/json">{…}</script></is-sparkline>.

### ⚠️ `is-lightbox` — Lightbox `(helpers)`

- **Ruta JSON**: `src/components/diagrams/lightbox.json`
- **Ruta módulo**: `src/components/diagrams/lightbox.ts`
- **Métricas**:
  - `secciones`: 6
  - `bloques`: 16
  - `demos`: 5
  - `controles`: 0

- 🟡 📝 **json-contenido** — Bloque demo en sections[2].blocks[1] no contiene ningún <is-*>.
  - 📄 `src/components/diagrams/lightbox.json`
  - 💡 Si el demo no usa ningún is-*, convertilo a bloque `html` (no necesita chrome de demo).
  - 🔎 {"html":"<figure>\r\n            <div class=\"lb-target\" data-tone=\"brand\" data-lb-target=\"s…"}

### ⚠️ `is-relative-time` — Tiempo relativo `(helpers)`

- **Ruta JSON**: `src/components/helpers/relative-time.json`
- **Ruta módulo**: `src/components/helpers/relative-time.ts`
- **Métricas**:
  - `secciones`: 5
  - `bloques`: 8
  - `demos`: 4
  - `controles`: 4

- 🟡 📝 **json-contenido** — Bloque demo en sections[2].blocks[0] no contiene ningún <is-*>.
  - 📄 `src/components/helpers/relative-time.json`
  - 💡 Si el demo no usa ningún is-*, convertilo a bloque `html` (no necesita chrome de demo).
  - 🔎 {"html":"<p class=\"demo-caption\" id=\"localeCaption\">Cargando locales…</p>\n          <div …"}

### ⚠️ `is-offscreen-canvas` — Offscreen Canvas `(helpers)`

- **Ruta JSON**: `src/components/helpers/offscreen-canvas.json`
- **Ruta módulo**: `src/components/helpers/offscreen-canvas.ts`
- **Métricas**:
  - `secciones`: 1
  - `bloques`: 3
  - `demos`: 1
  - `controles`: 2

- 🟡 🔗 **consistencia** — Control "width" (prop="attr:width") en src/components/helpers/offscreen-canvas.json#sections[0].blocks[0].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\helpers\offscreen-canvas.ts`
  - 💡 Agregá 'width' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "height" (prop="attr:height") en src/components/helpers/offscreen-canvas.json#sections[0].blocks[0].controls[1] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\helpers\offscreen-canvas.ts`
  - 💡 Agregá 'height' al array devuelto por static get observedAttributes().

### ⚠️ `is-format-date` — Formato de fecha `(helpers)`

- **Ruta JSON**: `src/components/helpers/format-date.json`
- **Ruta módulo**: `src/components/helpers/format-date.ts`
- **Métricas**:
  - `secciones`: 7
  - `bloques`: 9
  - `demos`: 6
  - `controles`: 11

- 🟡 📝 **json-contenido** — Bloque demo en sections[2].blocks[0] no contiene ningún <is-*>.
  - 📄 `src/components/helpers/format-date.json`
  - 💡 Si el demo no usa ningún is-*, convertilo a bloque `html` (no necesita chrome de demo).
  - 🔎 {"html":"<p class=\"demo-caption\" id=\"localeCaption\">Cargando locales…</p>\n          <div …"}

### ⚠️ `is-intersection-observer` — Observador de intersección `(helpers)`

- **Ruta JSON**: `src/components/helpers/intersection-observer.json`
- **Ruta módulo**: `src/components/helpers/intersection-observer.ts`
- **Métricas**:
  - `secciones`: 4
  - `bloques`: 6
  - `demos`: 2
  - `controles`: 4

- 🟡 🔗 **consistencia** — Control "root" (prop="attr:root") en src/components/helpers/intersection-observer.json#sections[1].blocks[0].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\helpers\intersection-observer.ts`
  - 💡 Agregá 'root' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "intersect-class" (prop="attr:intersect-class") en src/components/helpers/intersection-observer.json#sections[1].blocks[0].controls[1] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\helpers\intersection-observer.ts`
  - 💡 Agregá 'intersect-class' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "threshold" (prop="attr:threshold") en src/components/helpers/intersection-observer.json#sections[1].blocks[0].controls[2] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\helpers\intersection-observer.ts`
  - 💡 Agregá 'threshold' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "once" (prop="attr:once") en src/components/helpers/intersection-observer.json#sections[1].blocks[0].controls[3] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\helpers\intersection-observer.ts`
  - 💡 Agregá 'once' al array devuelto por static get observedAttributes().

### ⚠️ `is-mutation-observer` — Observador de mutación `(helpers)`

- **Ruta JSON**: `src/components/helpers/mutation-observer.json`
- **Ruta módulo**: `src/components/helpers/mutation-observer.ts`
- **Métricas**:
  - `secciones`: 3
  - `bloques`: 4
  - `demos`: 1
  - `controles`: 2

- 🟡 🔗 **consistencia** — Control "child-list" (prop="attr:child-list") en src/components/helpers/mutation-observer.json#sections[1].blocks[0].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\helpers\mutation-observer.ts`
  - 💡 Agregá 'child-list' al array devuelto por static get observedAttributes().
- 🟡 🔗 **consistencia** — Control "attr" (prop="attr:attr") en src/components/helpers/mutation-observer.json#sections[1].blocks[0].controls[1] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\helpers\mutation-observer.ts`
  - 💡 Agregá 'attr' al array devuelto por static get observedAttributes().

### ⚠️ `is-md-render` — Render Markdown `(helpers)`

- **Ruta JSON**: `src/components/helpers/md-render.json`
- **Ruta módulo**: `src/components/helpers/md-render.ts`
- **Métricas**:
  - `secciones`: 3
  - `bloques`: 3
  - `demos`: 2
  - `controles`: 2

- 🟡 📝 **json-contenido** — Bloque demo contiene un <script> ejecutable. La lógica debería vivir en un behavior (módulo .preview.js).
  - 📄 `src/components/helpers/md-render.json`
- 🟡 📝 **json-contenido** — Bloque demo contiene un <script> ejecutable. La lógica debería vivir en un behavior (módulo .preview.js).
  - 📄 `src/components/helpers/md-render.json`

### ⚠️ `is-md-editor` — Editor Markdown `(helpers)`

- **Ruta JSON**: `src/components/helpers/md-editor.json`
- **Ruta módulo**: `src/components/helpers/md-editor.ts`
- **Métricas**:
  - `secciones`: 6
  - `bloques`: 6
  - `demos`: 3
  - `controles`: 3

- 🟡 📝 **json-contenido** — Bloque demo contiene un <script> ejecutable. La lógica debería vivir en un behavior (módulo .preview.js).
  - 📄 `src/components/helpers/md-editor.json`
- 🟡 📝 **json-contenido** — Bloque demo contiene un <script> ejecutable. La lógica debería vivir en un behavior (módulo .preview.js).
  - 📄 `src/components/helpers/md-editor.json`
- 🟡 📝 **json-contenido** — Bloque demo contiene un <script> ejecutable. La lógica debería vivir en un behavior (módulo .preview.js).
  - 📄 `src/components/helpers/md-editor.json`

### ❌ `is-waterfall-chart` — Waterfall Chart `(data-viz)`

- **Ruta JSON**: `src/components/charts/waterfall-chart.json`
- **Ruta módulo**: `src/components/charts/waterfall-chart.ts`
- **Métricas**:
  - `secciones`: 1
  - `bloques`: 1
  - `demos`: 1
  - `controles`: 1

- 🔴 🔗 **consistencia** — Módulo del componente no llama customElements.define('is-waterfall-chart', …). El JSON declara demos de <is-waterfall-chart> pero el tag nunca se registra.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\waterfall-chart.ts`
- 🟡 🔗 **consistencia** — Módulo no usa guard idempotente (customElements.get(tag)). Llamar el módulo dos veces rompe.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\waterfall-chart.ts`
  - 💡 Envolvé customElements.define en `if (!customElements.get(tag)) customElements.define(...)`.
- 🟡 🔗 **consistencia** — Control "open-on-click" (prop="attr:open-on-click") en src/components/charts/waterfall-chart.json#sections[0].blocks[0].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\waterfall-chart.ts`
  - 💡 Agregá 'open-on-click' al array devuelto por static get observedAttributes().

### ❌ `is-funnel-chart` — Funnel Chart `(data-viz)`

- **Ruta JSON**: `src/components/charts/funnel-chart.json`
- **Ruta módulo**: `src/components/charts/funnel-chart.ts`
- **Métricas**:
  - `secciones`: 1
  - `bloques`: 1
  - `demos`: 1
  - `controles`: 1

- 🔴 🔗 **consistencia** — Módulo del componente no llama customElements.define('is-funnel-chart', …). El JSON declara demos de <is-funnel-chart> pero el tag nunca se registra.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\funnel-chart.ts`
- 🟡 🔗 **consistencia** — Módulo no usa guard idempotente (customElements.get(tag)). Llamar el módulo dos veces rompe.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\funnel-chart.ts`
  - 💡 Envolvé customElements.define en `if (!customElements.get(tag)) customElements.define(...)`.
- 🟡 🔗 **consistencia** — Control "open-on-click" (prop="attr:open-on-click") en src/components/charts/funnel-chart.json#sections[0].blocks[0].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\funnel-chart.ts`
  - 💡 Agregá 'open-on-click' al array devuelto por static get observedAttributes().

### ⚠️ `is-treemap` — Treemap `(data-viz)`

- **Ruta JSON**: `src/components/charts/treemap.json`
- **Ruta módulo**: `src/components/charts/treemap.ts`
- **Métricas**:
  - `secciones`: 2
  - `bloques`: 8
  - `demos`: 1
  - `controles`: 1

- 🟡 🔗 **consistencia** — Control "open-on-click" (prop="attr:open-on-click") en src/components/charts/treemap.json#sections[0].blocks[1].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\charts\treemap.ts`
  - 💡 Agregá 'open-on-click' al array devuelto por static get observedAttributes().

### ❌ `is-stat` — Stat KPI `(data)`

- **Ruta JSON**: `src/components/data/stat.json`
- **Ruta módulo**: `src/components/data/stat.ts`
- **Métricas**:
  - `secciones`: 5
  - `bloques`: 7
  - `demos`: 4
  - `controles`: 0

- 🔴 🧩 **json-complejidad** — Demo de <is-stat> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/stat.json`
  - 💡 Pasale la data por JSON al host: <is-stat><script type="application/json">{…}</script></is-stat>.
- 🔴 🧩 **json-complejidad** — Demo de <is-stat> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/stat.json`
  - 💡 Pasale la data por JSON al host: <is-stat><script type="application/json">{…}</script></is-stat>.
- 🔴 🧩 **json-complejidad** — Demo de <is-stat> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/stat.json`
  - 💡 Pasale la data por JSON al host: <is-stat><script type="application/json">{…}</script></is-stat>.
- 🔴 🧩 **json-complejidad** — Demo de <is-stat> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/stat.json`
  - 💡 Pasale la data por JSON al host: <is-stat><script type="application/json">{…}</script></is-stat>.

### ❌ `is-transfer` — Transfer `(data)`

- **Ruta JSON**: `src/components/data/transfer.json`
- **Ruta módulo**: `src/components/data/transfer.ts`
- **Métricas**:
  - `secciones`: 5
  - `bloques`: 11
  - `demos`: 4
  - `controles`: 0

- 🔴 🧩 **json-complejidad** — Demo de <is-transfer> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/transfer.json`
  - 💡 Pasale la data por JSON al host: <is-transfer><script type="application/json">{…}</script></is-transfer>.
- 🔴 🧩 **json-complejidad** — Demo de <is-transfer> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/transfer.json`
  - 💡 Pasale la data por JSON al host: <is-transfer><script type="application/json">{…}</script></is-transfer>.
- 🔴 🧩 **json-complejidad** — Demo de <is-transfer> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/transfer.json`
  - 💡 Pasale la data por JSON al host: <is-transfer><script type="application/json">{…}</script></is-transfer>.
- 🔴 🧩 **json-complejidad** — Demo de <is-transfer> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/transfer.json`
  - 💡 Pasale la data por JSON al host: <is-transfer><script type="application/json">{…}</script></is-transfer>.

### ❌ `is-transfer-item` — Transfer Item `(data)`

- **Ruta JSON**: `src/components/data/transfer-item.json`
- **Ruta módulo**: `src/components/data/transfer.ts`
- **Métricas**:
  - `secciones`: 2
  - `bloques`: 3
  - `demos`: 1
  - `controles`: 0

- 🔴 🧩 **json-complejidad** — Demo de <is-transfer> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/transfer-item.json`
  - 💡 Pasale la data por JSON al host: <is-transfer><script type="application/json">{…}</script></is-transfer>.

### ❌ `is-gauge` — Gauge `(data-viz)`

- **Ruta JSON**: `src/components/data/gauge.json`
- **Ruta módulo**: `src/components/data/gauge.ts`
- **Métricas**:
  - `secciones`: 6
  - `bloques`: 8
  - `demos`: 5
  - `controles`: 6

- 🔴 🧩 **json-complejidad** — Demo de <is-gauge> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/gauge.json`
  - 💡 Pasale la data por JSON al host: <is-gauge><script type="application/json">{…}</script></is-gauge>.
- 🔴 🧩 **json-complejidad** — Demo de <is-gauge> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/gauge.json`
  - 💡 Pasale la data por JSON al host: <is-gauge><script type="application/json">{…}</script></is-gauge>.
- 🔴 🧩 **json-complejidad** — Demo de <is-gauge> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/gauge.json`
  - 💡 Pasale la data por JSON al host: <is-gauge><script type="application/json">{…}</script></is-gauge>.
- 🔴 🧩 **json-complejidad** — Demo de <is-gauge> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/gauge.json`
  - 💡 Pasale la data por JSON al host: <is-gauge><script type="application/json">{…}</script></is-gauge>.
- 🔴 🧩 **json-complejidad** — Demo de <is-gauge> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/gauge.json`
  - 💡 Pasale la data por JSON al host: <is-gauge><script type="application/json">{…}</script></is-gauge>.

### ❌ `is-kanban` — Kanban `(data)`

- **Ruta JSON**: `src/components/data/kanban.json`
- **Ruta módulo**: `src/components/data/kanban.ts`
- **Métricas**:
  - `secciones`: 3
  - `bloques`: 9
  - `demos`: 2
  - `controles`: 0

- 🔴 🧩 **json-complejidad** — Demo de <is-kanban> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/kanban.json`
  - 💡 Pasale la data por JSON al host: <is-kanban><script type="application/json">{…}</script></is-kanban>.
- 🔴 🧩 **json-complejidad** — Demo de <is-kanban> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/kanban.json`
  - 💡 Pasale la data por JSON al host: <is-kanban><script type="application/json">{…}</script></is-kanban>.

### ❌ `is-kanban-column` — Kanban Column `(data)`

- **Ruta JSON**: `src/components/data/kanban-column.json`
- **Ruta módulo**: `src/components/data/kanban.ts`
- **Métricas**:
  - `secciones`: 2
  - `bloques`: 3
  - `demos`: 1
  - `controles`: 0

- 🔴 🧩 **json-complejidad** — Demo de <is-kanban> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/kanban-column.json`
  - 💡 Pasale la data por JSON al host: <is-kanban><script type="application/json">{…}</script></is-kanban>.

### ❌ `is-kanban-card` — Kanban Card `(data)`

- **Ruta JSON**: `src/components/data/kanban-card.json`
- **Ruta módulo**: `src/components/data/kanban.ts`
- **Métricas**:
  - `secciones`: 2
  - `bloques`: 3
  - `demos`: 1
  - `controles`: 0

- 🔴 🧩 **json-complejidad** — Demo de <is-kanban> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/kanban-card.json`
  - 💡 Pasale la data por JSON al host: <is-kanban><script type="application/json">{…}</script></is-kanban>.

### ❌ `is-barcode-scanner` — Barcode Scanner `(media)`

- **Ruta JSON**: `src/components/media/barcode-scanner.json`
- **Ruta módulo**: `src/components/media/barcode-scanner.ts`
- **Métricas**:
  - `secciones`: 1
  - `bloques`: 3
  - `demos`: 1
  - `controles`: 1

- 🟡 🔗 **consistencia** — Control "formats" (prop="attr:formats") en src/components/media/barcode-scanner.json#sections[0].blocks[0].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\media\barcode-scanner.ts`
  - 💡 Agregá 'formats' al array devuelto por static get observedAttributes().
- 🔴 ⚙️ **runtime** — observedAttributes declarado pero sin attributeChangedCallback: los cambios de atributo nunca se procesan. El playground del demo no será reactivo.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\media\barcode-scanner.ts`

### ⚠️ `is-signature` — Signature `(forms)`

- **Ruta JSON**: `src/components/forms/signature.json`
- **Ruta módulo**: `src/components/forms/signature.ts`
- **Métricas**:
  - `secciones`: 4
  - `bloques`: 3
  - `demos`: 2
  - `controles`: 0

- 🟡 📝 **json-contenido** — Bloque demo en sections[2].blocks[0] no contiene ningún <is-*>.
  - 📄 `src/components/forms/signature.json`
  - 💡 Si el demo no usa ningún is-*, convertilo a bloque `html` (no necesita chrome de demo).
  - 🔎 {"html":"<div class=\"sig-output\" id=\"output\">\r\n            <small style=\"color:var(--is-t…"}

### ❌ `is-spreadsheet` — Spreadsheet `(data)`

- **Ruta JSON**: `src/components/data/spreadsheet.json`
- **Ruta módulo**: `src/components/data/spreadsheet.ts`
- **Métricas**:
  - `secciones`: 3
  - `bloques`: 3
  - `demos`: 1
  - `controles`: 0

- 🔴 🧩 **json-complejidad** — Demo de <is-spreadsheet> no declara <script type="application/json"> con payload.
  - 📄 `src/components/data/spreadsheet.json`
  - 💡 Pasale la data por JSON al host: <is-spreadsheet><script type="application/json">{…}</script></is-spreadsheet>.

### ⚠️ `is-org-chart` — Org Chart `(diagrams)`

- **Ruta JSON**: `src/components/diagrams/org-chart.json`
- **Ruta módulo**: `src/components/diagrams/org-chart.ts`
- **Métricas**:
  - `secciones`: 5
  - `bloques`: 4
  - `demos`: 2
  - `controles`: 2

- 🟡 🔗 **consistencia** — Control "open-on-click" (prop="attr:open-on-click") en src/components/diagrams/org-chart.json#sections[1].blocks[0].controls[0] apunta a un atributo que el módulo no declara como observado.
  - 📄 `C:\ContaPyme\Personal\apps\is-webcomponents\src\components\diagrams\org-chart.ts`
  - 💡 Agregá 'open-on-click' al array devuelto por static get observedAttributes().

### ⚠️ `is-preview-component` — Preview Component `(preview)`

- **Ruta JSON**: ``
- **Ruta módulo**: `src/components/layout/preview-component.ts`

- 🟡 📐 **json-schema** — No se encontró JSON de preview para <is-preview-component>.
  - 💡 Creá un archivo de definición siguiendo el esquema is-preview/v1.

### ⚠️ `is-preview-controls` — Preview Controls `(preview)`

- **Ruta JSON**: ``
- **Ruta módulo**: `src/components/layout/preview-controls.ts`

- 🟡 📐 **json-schema** — No se encontró JSON de preview para <is-preview-controls>.
  - 💡 Creá un archivo de definición siguiendo el esquema is-preview/v1.

### ⚠️ `home` — home `()`

- **Ruta JSON**: ``

- 🟡 📐 **json-schema** — No se encontró JSON de preview para <home>.
  - 💡 Creá un archivo de definición siguiendo el esquema is-preview/v1.

### ⚠️ `icon-explorer` — icon-explorer `()`

- **Ruta JSON**: ``

- 🟡 📐 **json-schema** — No se encontró JSON de preview para <icon-explorer>.
  - 💡 Creá un archivo de definición siguiendo el esquema is-preview/v1.

### ⚠️ `phase7` — phase7 `()`

- **Ruta JSON**: ``

- 🟡 📐 **json-schema** — No se encontró JSON de preview para <phase7>.
  - 💡 Creá un archivo de definición siguiendo el esquema is-preview/v1.

### ⚠️ `theming` — theming `()`

- **Ruta JSON**: ``

- 🟡 📐 **json-schema** — No se encontró JSON de preview para <theming>.
  - 💡 Creá un archivo de definición siguiendo el esquema is-preview/v1.

### ⚠️ `ecosystem` — ecosystem `()`

- **Ruta JSON**: ``

- 🟡 📐 **json-schema** — No se encontró JSON de preview para <ecosystem>.
  - 💡 Creá un archivo de definición siguiendo el esquema is-preview/v1.

## Cobertura por categoría

| Categoría | Componentes |
|-----------|-------------|
| forms | 36 |
| diagrams | 18 |
| data-viz | 17 |
| helpers | 16 |
| isp | 15 |
| feedback | 15 |
| navigation | 13 |
| layout | 12 |
| actions | 11 |
| media | 11 |
| data | 10 |
| — | 5 |
| overlays | 3 |
| preview | 2 |
| code | 1 |
