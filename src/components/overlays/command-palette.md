---
tag: is-command-palette
tags:
  - is-command-palette
category: overlays
status: public
source: ./command-palette.js
style: ./command-palette.css
preview: ./command-palette.json
---
# `<is-command-palette>`

## Propósito

Paleta de comandos al estilo Cmd+K / Ctrl+K: busca y ejecuta comandos declarados en JSON.

Este módulo registra `<is-command-palette>`.

## Cuándo usarlo

Paleta de comandos, visor de documentos y ventanas flotantes.

## Cuándo no usarlo

Para diálogos/cajones genéricos usar `<is-dialog>` / `<is-drawer>` en layout.
No reinventar overlays si este módulo cubre el caso.

## Importación

```js
import './command-palette.js';
```

## Ejemplo mínimo

```html
<is-command-palette placeholder="Buscar…">
  <script type="application/json">
  [
    { "id": "new", "title": "Nuevo", "group": "Archivo", "icon": "mdi:file-plus" }
  ]
  </script>
</is-command-palette>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `hotkey` | string | Default `mod+k`. Lista separada por coma/espacio para varios atajos (p.ej. `"mod+k,mod+/"`). Vacío desactiva. |
| `placeholder` | string | Texto del input. |
| `max-results` | string/según contrato | Tope de resultados (default 12). |
| `empty-text` | string | Texto sin resultados. |

> El listener **no** captura la combinación si el foco está en un `<input>`,
> `<textarea>`, `<select>` o cualquier elemento `contentEditable` del
> documento anfitrión: evita romper campos de texto. Solo abre cuando se
> pulsa desde la página o desde un Web Component no editable.

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `commands` | solo lectura | Array cargado. |
| `results` | solo lectura | Resultados actuales. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |
| `footer` | Bloque inferior (si el módulo lo declara). |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-show` | no | sí | sí | no |
| `is-after-show` | no | sí | sí | no |
| `is-hide` | no | sí | sí | no |
| `is-after-hide` | no | sí | sí | no |
| `is-select` | `{ command, id }` | sí | sí | no |

Vocabulario unificado con `ModalBase`. Los antiguos `is-open` / `is-close`
ya no se emiten. Escape lo cierra el propio `<dialog>` (evento `cancel`).

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `open()` | Método público declarado. |
| `close()` | Método público declarado. |
| `toggle()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `dialog` | Personalizable con `::part(dialog)`. |
| `panel` | Personalizable con `::part(panel)`. |
| `input` | Personalizable con `::part(input)`. |
| `results` | Personalizable con `::part(results)`. |
| `empty` | Personalizable con `::part(empty)`. |
| `footer` | Personalizable con `::part(footer)`. |
| `sr-status` | Region aria-live polite oculta visualmente. |

### Custom states

No expone.

### CSS custom properties

Tokens del tema (`--is-*`) según CSS del módulo.

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Multi-hotkey

El atributo `hotkey` acepta combinaciones separadas por `,` o espacios.
Ejemplos:

```html
<!-- Ctrl+K y Ctrl+Shift+P abren la misma paleta -->
<is-command-palette hotkey="mod+k,mod+shift+p"></is-command-palette>

<!-- Solo Cmd+/ (Mac) / Ctrl+/ (Win/Linux) -->
<is-command-palette hotkey="mod+/"></is-command-palette>

<!-- Desactivar atajo global; abrir solo via .open() -->
<is-command-palette hotkey=""></is-command-palette>
```

Las combinaciones se parsean como pares `{mod,key}` donde `mod` puede
ser `mod` (cualquiera de Ctrl/Meta), `cmd` (Meta) o `ctrl`.

## Historial de queries (memoria de sesión)

Cada query ejecutada o confirmada con Enter se guarda en una pila LIFO de
la sesión (no persiste en `localStorage`: histórico solo en memoria, se
pierde al recargar). `↑` con el input vacío cicla por ese historial;
`↓` desde el historial vuelve al presente (input vacío).

> Si se necesita persistencia entre recargas, exponer API para
> `palette.pushHistory(q)` y serializar manualmente — el componente
> no toca `localStorage` por defecto.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-command-palette> — Cmd/Ctrl+K. Comandos vía JSON hijo; eventos is-show/is-after-show/is-hide/is-after-hide/is-select.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)

Tags del módulo: `<is-command-palette>`.

## Accesibilidad

Patrón **WAI-ARIA 1.2 combobox/listbox** + diálogo nativo `<dialog>` (modal
con backdrop, cierre con `Escape` via `cancel`, focus restoration a través
del propio `<dialog>`).

| Atributo / Rol | Dónde | Notas |
| --- | --- | --- |
| `role="combobox"` | `<input>` interno | Identifica el patrón combobox. |
| `aria-controls="<listbox-id>"` | `<input>` | Apunta al `<ol role="listbox">` (id estable por instancia). |
| `aria-expanded` | `<input>` | `"true"` mientras la paleta está abierta, `"false"` al cerrar. |
| `aria-haspopup="listbox"` | `<input>` | Declara el tipo de popup al lector de pantalla. |
| `aria-autocomplete="list"` | `<input>` | El filtrado produce una lista de sugerencias. |
| `aria-activedescendant="<id>"` | `<input>` | Apunta a la opción activa (cambia con ↑/↓). |
| `role="listbox"` | `<ol>` interno | Contenedor de los resultados. |
| `role="option"` + `id` único + `aria-selected` | `<li>` por comando | Marca la opción navegada con `aria-selected="true"`. |
| `aria-label="Paleta de comandos"` | `<dialog>` | Nombre accesible del modal. |
| `aria-live="polite"` (debounced ~120ms) | `.sr-status` | Anuncia conteo y sugerencia top al cambiar la query, sin inundar al lector. |

Comandos por teclado sobre el input:

- **↑ / ↓** navega opciones (con ciclado al cruzar extremos)
- **↑ cuando el input está vacío** cicla por el historial LIFO de la sesión (estilo terminal)
- **↓ desde una query histórica** vuelve al presente (input vacío)
- **Enter** ejecuta el comando activo
- **Esc** lo cierra el propio `<dialog>` (vía evento `cancel`)

Preservar semántica, foco, teclado, labels y ARIA. Listeners globales solo en
`connectedCallback` / `disconnectedCallback`.

## Ejemplo avanzado

```html
<is-command-palette
  placeholder="Buscar…"
  hotkey="mod+k,mod+/"
  max-results="10"
  empty-text="Sin coincidencias">
  <script type="application/json">
  [
    { "id": "new", "title": "Nuevo", "group": "Archivo", "icon": "mdi:file-plus" }
  ]
  </script>
</is-command-palette>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Agregar listeners de `document`/`window` en el constructor.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./command-palette.js)
- [CSS](./command-palette.css)
- [Índice de categoría](./LLM.md)
- [Preview](./command-palette.json)
