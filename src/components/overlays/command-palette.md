---
tag: iswc-command-palette
tags:
  - iswc-command-palette
category: overlays
status: public
source: ./command-palette.ts
style: ./command-palette.css
preview: ./command-palette.json
---
# `<iswc-command-palette>`

## PropÃ³sito

Paleta de comandos al estilo Cmd+K / Ctrl+K: busca y ejecuta comandos declarados en JSON.

Este mÃ³dulo registra `<iswc-command-palette>`.

## CuÃ¡ndo usarlo

Paleta de comandos, visor de documentos y ventanas flotantes.

## CuÃ¡ndo no usarlo

Para diÃ¡logos/cajones genÃ©ricos usar `<iswc-dialog>` / `<iswc-drawer>` en layout.
No reinventar overlays si este mÃ³dulo cubre el caso.

## ImportaciÃ³n

```js
import './command-palette.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-command-palette placeholder="Buscarâ€¦">
  <script type="application/json">
  [
    { "id": "new", "title": "Nuevo", "group": "Archivo", "icon": "mdi:file-plus" }
  ]
  </script>
</iswc-command-palette>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `hotkey` | string | Default `mod+k`. Lista separada por coma/espacio para varios atajos (p.ej. `"mod+k,mod+/"`). VacÃ­o desactiva. |
| `placeholder` | string | Texto del input. |
| `max-results` | string/segÃºn contrato | Tope de resultados (default 12). |
| `empty-text` | string | Texto sin resultados. |

> El listener **no** captura la combinaciÃ³n si el foco estÃ¡ en un `<input>`,
> `<textarea>`, `<select>` o cualquier elemento `contentEditable` del
> documento anfitriÃ³n: evita romper campos de texto. Solo abre cuando se
> pulsa desde la pÃ¡gina o desde un Web Component no editable.

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `commands` | solo lectura | Array cargado. |
| `results` | solo lectura | Resultados actuales. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |
| `footer` | Bloque inferior (si el mÃ³dulo lo declara). |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-show` | Emitido justo antes de mostrarse (cancelable). |
| `iswc-after-show` | Emitido tras finalizar la animaciÃ³n de apertura. |
| `iswc-hide` | Emitido justo antes de ocultarse (cancelable). |
| `iswc-after-hide` | Emitido tras finalizar la animaciÃ³n de cierre. |
| `iswc-select` | Emitido al seleccionar un elemento. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-show` | no | sÃ­ | sÃ­ | no |
| `iswc-after-show` | no | sÃ­ | sÃ­ | no |
| `iswc-hide` | no | sÃ­ | sÃ­ | no |
| `iswc-after-hide` | no | sÃ­ | sÃ­ | no |
| `iswc-select` | `{ command, id }` | sÃ­ | sÃ­ | no |

Vocabulario unificado con `ModalBase`. Los antiguos `iswc-open` / `iswc-close`
ya no se emiten. Escape lo cierra el propio `<dialog>` (evento `cancel`).


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-command-palette');
el.addEventListener('iswc-show', (e) => {
  console.log('iswc-show', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `open()` | MÃ©todo pÃºblico declarado. |
| `close()` | MÃ©todo pÃºblico declarado. |
| `toggle()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `keys` | Fila con los atajos de teclado mostrados. |

### Custom states

No expone.

### CSS custom properties

Tokens del tema (`--iswc-*`) segÃºn CSS del mÃ³dulo.

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Multi-hotkey

El atributo `hotkey` acepta combinaciones separadas por `,` o espacios.
Ejemplos:

```html
<!-- Ctrl+K y Ctrl+Shift+P abren la misma paleta -->
<iswc-command-palette hotkey="mod+k,mod+shift+p"></iswc-command-palette>

<!-- Solo Cmd+/ (Mac) / Ctrl+/ (Win/Linux) -->
<iswc-command-palette hotkey="mod+/"></iswc-command-palette>

<!-- Desactivar atajo global; abrir solo via .open() -->
<iswc-command-palette hotkey=""></iswc-command-palette>
```

Las combinaciones se parsean como pares `{mod,key}` donde `mod` puede
ser `mod` (cualquiera de Ctrl/Meta), `cmd` (Meta) o `ctrl`.

## Historial de queries (memoria de sesiÃ³n)

Cada query ejecutada o confirmada con Enter se guarda en una pila LIFO de
la sesiÃ³n (no persiste en `localStorage`: histÃ³rico solo en memoria, se
pierde al recargar). `â†‘` con el input vacÃ­o cicla por ese historial;
`â†“` desde el historial vuelve al presente (input vacÃ­o).

> Si se necesita persistencia entre recargas, exponer API para
> `palette.pushHistory(q)` y serializar manualmente â€” el componente
> no toca `localStorage` por defecto.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-command-palette> â€” Cmd/Ctrl+K. Comandos vÃ­a JSON hijo; eventos iswc-show/iswc-after-show/iswc-hide/iswc-after-hide/iswc-select.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)

Tags del mÃ³dulo: `<iswc-command-palette>`.

## Accesibilidad

PatrÃ³n **WAI-ARIA 1.2 combobox/listbox** + diÃ¡logo nativo `<dialog>` (modal
con backdrop, cierre con `Escape` via `cancel`, focus restoration a travÃ©s
del propio `<dialog>`).

| Atributo / Rol | DÃ³nde | Notas |
| --- | --- | --- |
| `role="combobox"` | `<input>` interno | Identifica el patrÃ³n combobox. |
| `aria-controls="<listbox-id>"` | `<input>` | Apunta al `<ol role="listbox">` (id estable por instancia). |
| `aria-expanded` | `<input>` | `"true"` mientras la paleta estÃ¡ abierta, `"false"` al cerrar. |
| `aria-haspopup="listbox"` | `<input>` | Declara el tipo de popup al lector de pantalla. |
| `aria-autocomplete="list"` | `<input>` | El filtrado produce una lista de sugerencias. |
| `aria-activedescendant="<id>"` | `<input>` | Apunta a la opciÃ³n activa (cambia con â†‘/â†“). |
| `role="listbox"` | `<ol>` interno | Contenedor de los resultados. |
| `role="option"` + `id` Ãºnico + `aria-selected` | `<li>` por comando | Marca la opciÃ³n navegada con `aria-selected="true"`. |
| `aria-label="Paleta de comandos"` | `<dialog>` | Nombre accesible del modal. |
| `aria-live="polite"` (debounced ~120ms) | `.sr-status` | Anuncia conteo y sugerencia top al cambiar la query, sin inundar al lector. |

Comandos por teclado sobre el input:

- **â†‘ / â†“** navega opciones (con ciclado al cruzar extremos)
- **â†‘ cuando el input estÃ¡ vacÃ­o** cicla por el historial LIFO de la sesiÃ³n (estilo terminal)
- **â†“ desde una query histÃ³rica** vuelve al presente (input vacÃ­o)
- **Enter** ejecuta el comando activo
- **Esc** lo cierra el propio `<dialog>` (vÃ­a evento `cancel`)

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. Listeners globales solo en
`connectedCallback` / `disconnectedCallback`.

## Ejemplo avanzado

```html
<iswc-command-palette
  placeholder="Buscarâ€¦"
  hotkey="mod+k,mod+/"
  max-results="10"
  empty-text="Sin coincidencias">
  <script type="application/json">
  [
    { "id": "new", "title": "Nuevo", "group": "Archivo", "icon": "mdi:file-plus" }
  ]
  </script>
</iswc-command-palette>
```

## Errores comunes

- Usar tag sin importar mÃ³dulo primero.
- Inventar API por similitud con otro componente.
- Agregar listeners de `document`/`window` en el constructor.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./command-palette.ts)
- [CSS](./command-palette.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./command-palette.json)
