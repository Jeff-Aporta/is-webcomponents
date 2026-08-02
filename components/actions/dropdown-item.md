---
tag: is-dropdown-item
tags:
  - is-dropdown-item
category: actions
status: public
source: ./dropdown-item.js
style: ./dropdown-item.css
preview: ../../previews/actions/is-dropdown.html
---
# `<is-dropdown-item>`

## Propósito

Menú anclado a un trigger. Panel en <dialog> modal
(top layer) para no quedar debajo de otras secciones. Items:
is-dropdown-item, is-divider e iconos.

Este módulo registra `<is-dropdown-item>`.

## Cuándo usarlo

Acciones, selección de comandos y menús interactivos.

## Cuándo no usarlo

No usar como decoración ni reemplazar enlaces semánticos para navegación simple.

## Importación

```js
import './dropdown-item.js';
```

## Ejemplo mínimo

```html
<is-dropdown>
<is-button slot="trigger" with-caret>Options</is-button>
<is-dropdown-item value="edit">Edit</is-dropdown-item>
<is-divider></is-divider>
<is-dropdown-item value="delete" color="danger">Delete</is-dropdown-item>
</is-dropdown>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string/según contrato | Fuente define default/restricción. |
| `type` | string/según contrato | Fuente define default/restricción. |
| `checked` | boolean | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `color` | string/según contrato | Fuente define default/restricción. |
| `submenu-open` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

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

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-dropdown-item-select` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `openSubmenu()` | Método público declarado. |
| `closeSubmenu()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `--is-font-family` | Token leído o definido por componente. |
| `--is-radius-sm` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-control-bg-hover` | Token leído o definido por componente. |
| `--is-color-danger-500` | Token leído o definido por componente. |
| `--is-text-soft` | Token leído o definido por componente. |
| `--is-radius` | Token leído o definido por componente. |
| `--is-bg-elev` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-shadow` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-dropdown-item> — ítem de menú para is-dropdown.
> El submenú va en un popover (top layer) y se posiciona con computePosition: el
> menú padre scrollea (`overflow: auto`), así que un panel `absolute` quedaría
> recortado y le abriría scroll horizontal.
> Attrs: value, type (normal|checkbox), checked, disabled, color (default|danger)
> Slots: default (label), icon, details, submenu
> Methods: openSubmenu(), closeSubmenu()
> Parts: checkmark, icon, label, details, submenu, submenu-icon

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/position.js`](../_shared/position.js)
- [`../media/icon.js`](../media/icon.js)

Tags del módulo: `<is-dropdown-item>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`, `aria-haspopup`, `aria-checked`, `aria-disabled`.

## Ejemplo avanzado

```html
<is-dropdown>
<is-button slot="trigger" with-caret>Options</is-button>
<is-dropdown-item value="edit">Edit</is-dropdown-item>
<is-divider></is-divider>
<is-dropdown-item value="delete" color="danger">Delete</is-dropdown-item>
</is-dropdown>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./dropdown-item.js)
- [CSS](./dropdown-item.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/actions/is-dropdown.html)
