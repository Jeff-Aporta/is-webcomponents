---
tag: iswc-dropdown
tags:
  - iswc-dropdown
category: actions
status: public
source: ./dropdown.ts
style: ./dropdown.css
preview: ./dropdown.json
---
# `<iswc-dropdown>`

## PropÃ³sito

MenÃº anclado a un trigger. Panel en <dialog> modal
(top layer) para no quedar debajo de otras secciones. Items:
iswc-dropdown-item, iswc-divider e iconos.

Este mÃ³dulo registra `<iswc-dropdown>`.

## CuÃ¡ndo usarlo

Acciones, selecciÃ³n de comandos y menÃºs interactivos.

## CuÃ¡ndo no usarlo

No usar como decoraciÃ³n ni reemplazar enlaces semÃ¡nticos para navegaciÃ³n simple.

## ImportaciÃ³n

```js
import './dropdown.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-dropdown>
<iswc-button slot="trigger" with-caret>Options</iswc-button>
<iswc-dropdown-item value="edit">Edit</iswc-dropdown-item>
<iswc-divider></iswc-divider>
<iswc-dropdown-item value="delete" color="danger">Delete</iswc-dropdown-item>
</iswc-dropdown>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `open` | boolean | Fuente define default/restricciÃ³n. |
| `placement` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `distance` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `skidding` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `open` | lectura/escritura | Declarada por clase. |
| `placement` | lectura/escritura | Declarada por clase. |
| `distance` | lectura/escritura | Declarada por clase. |
| `skidding` | lectura/escritura | Declarada por clase. |
| `items` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `trigger` | Contenido proyectado. |
| `default` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-select` | Emitido al seleccionar un elemento. |
| `iswc-show` | Emitido justo antes de mostrarse (cancelable). |
| `iswc-after-show` | Emitido tras finalizar la animaciÃ³n de apertura. |
| `iswc-hide` | Emitido justo antes de ocultarse (cancelable). |
| `iswc-after-hide` | Emitido tras finalizar la animaciÃ³n de cierre. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-select` | sÃ­ | sÃ­ | sÃ­ | sÃ­ |
| `iswc-show` | no | sÃ­ | sÃ­ | sÃ­ |
| `iswc-after-show` | no | sÃ­ | sÃ­ | sÃ­ |
| `iswc-hide` | no | sÃ­ | sÃ­ | sÃ­ |
| `iswc-after-hide` | no | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-dropdown');
el.addEventListener('iswc-select', (e) => {
  console.log('iswc-select', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `show()` | MÃ©todo pÃºblico declarado. |
| `hide()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `trigger-wrap` | Personalizable con `::part(trigger-wrap)`. |
| `dialog` | Personalizable con `::part(dialog)`. |
| `menu` | Personalizable con `::part(menu)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-font-family` | Token leÃ­do o definido por componente. |
| `--show-duration` | Token leÃ­do o definido por componente. |
| `--hide-duration` | Token leÃ­do o definido por componente. |
| `--auto-size-available-height` | Token leÃ­do o definido por componente. |
| `--iswc-radius` | Token leÃ­do o definido por componente. |
| `--iswc-bg-elev` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--iswc-shadow` | Token leÃ­do o definido por componente. |
| `--iswc-text-soft` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-dropdown> â€” menÃº anclado a un trigger.
> El panel usa <dialog showModal()> (top layer) para no quedar debajo de
> headings/secciones/overflow de ancestros â€” mismo patrÃ³n que iswc-combobox.
> Slots: trigger | default (items / dividers / headings)
> Attrs: open, placement (default bottom-start), distance, skidding
> Events: iswc-show, iswc-after-show, iswc-hide, iswc-after-hide, iswc-select { item }
> Parts: ::part(dialog) ::part(menu)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/position.js`](../_shared/position.js)
- [`./dropdown-item.js`](./dropdown-item.js)
- [`../layout/divider.js`](../layout/divider.js)
- [`../_shared/popup-dismiss.js`](../_shared/popup-dismiss.js) â€” ciclo de escucha
  mientras el panel esta abierto (teclado, scroll), compartido con `iswc-context-menu`.

Tags del mÃ³dulo: `<iswc-dropdown>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-haspopup`, `aria-expanded`.

## Ejemplo avanzado

```html
<iswc-dropdown>
<iswc-button slot="trigger" with-caret>Options</iswc-button>
<iswc-dropdown-item value="edit">Edit</iswc-dropdown-item>
<iswc-divider></iswc-divider>
<iswc-dropdown-item value="delete" color="danger">Delete</iswc-dropdown-item>
</iswc-dropdown>
```

## Errores comunes

- Usar tag sin importar mÃ³dulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./dropdown.ts)
- [CSS](./dropdown.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./dropdown.json)
