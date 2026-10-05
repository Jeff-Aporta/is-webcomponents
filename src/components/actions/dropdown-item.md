---
tag: iswc-dropdown-item
tags:
  - iswc-dropdown-item
category: actions
status: public
source: ./dropdown-item.ts
style: ./dropdown-item.css
preview: ./dropdown-item.json
---
# `<iswc-dropdown-item>`

## PropÃ³sito

MenÃº anclado a un trigger. Panel en <dialog> modal
(top layer) para no quedar debajo de otras secciones. Items:
iswc-dropdown-item, iswc-divider e iconos.

Este mÃ³dulo registra `<iswc-dropdown-item>`.

## CuÃ¡ndo usarlo

Acciones, selecciÃ³n de comandos y menÃºs interactivos.

## CuÃ¡ndo no usarlo

No usar como decoraciÃ³n ni reemplazar enlaces semÃ¡nticos para navegaciÃ³n simple.

## ImportaciÃ³n

```js
import './dropdown-item.js';
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
| `value` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `type` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `checked` | boolean | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `color` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `submenu-open` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |
| `type` | lectura/escritura | Declarada por clase. |
| `checked` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `color` | lectura/escritura | Declarada por clase. |
| `submenuOpen` | lectura/escritura | Declarada por clase. |
| `hasSubmenu` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `icon` | Contenido proyectado. |
| `default` | Contenido proyectado. |
| `details` | Contenido proyectado. |
| `submenu` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-dropdown-item-select` | Evento personalizado del componente (dropdown item select). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-dropdown-item-select` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-dropdown-item');
el.addEventListener('iswc-dropdown-item-select', (e) => {
  console.log('iswc-dropdown-item-select', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `openSubmenu()` | MÃ©todo pÃºblico declarado. |
| `closeSubmenu()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `checkmark` | Personalizable con `::part(checkmark)`. |
| `icon` | Personalizable con `::part(icon)`. |
| `label` | Personalizable con `::part(label)`. |
| `details` | Personalizable con `::part(details)`. |
| `submenu-icon` | Personalizable con `::part(submenu-icon)`. |
| `submenu` | Personalizable con `::part(submenu)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-font-family` | Token leÃ­do o definido por componente. |
| `--iswc-radius-sm` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg-hover` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-500` | Token leÃ­do o definido por componente. |
| `--iswc-text-soft` | Token leÃ­do o definido por componente. |
| `--iswc-radius` | Token leÃ­do o definido por componente. |
| `--iswc-bg-elev` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--iswc-shadow` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-dropdown-item> â€” Ã­tem de menÃº para iswc-dropdown.
> El submenÃº va en un popover (top layer) y se posiciona con computePosition: el
> menÃº padre scrollea (`overflow: auto`), asÃ­ que un panel `absolute` quedarÃ­a
> recortado y le abrirÃ­a scroll horizontal.
> Attrs: value, type (normal|checkbox), checked, disabled, color (default|danger)
> Slots: default (label), icon, details, submenu
> Methods: openSubmenu(), closeSubmenu()
> Parts: checkmark, icon, label, details, submenu, submenu-icon

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/position.js`](../_shared/position.js)
- [`../media/icon.js`](../media/icon.js)

Tags del mÃ³dulo: `<iswc-dropdown-item>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`, `aria-haspopup`, `aria-checked`, `aria-disabled`.

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

- [JavaScript](./dropdown-item.ts)
- [CSS](./dropdown-item.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./dropdown-item.json)
