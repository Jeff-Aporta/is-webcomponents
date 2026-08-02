---
tag: is-dropdown
tags:
  - is-dropdown
category: actions
status: public
source: ./dropdown.js
style: ./dropdown.css
preview: ../../previews/actions/is-dropdown.html
---
# `<is-dropdown>`

## Propósito

Menú anclado a un trigger. Panel en <dialog> modal
(top layer) para no quedar debajo de otras secciones. Items:
is-dropdown-item, is-divider e iconos.

Este módulo registra `<is-dropdown>`.

## Cuándo usarlo

Acciones, selección de comandos y menús interactivos.

## Cuándo no usarlo

No usar como decoración ni reemplazar enlaces semánticos para navegación simple.

## Importación

```js
import './dropdown.js';
```

## Ejemplo mínimo

```html
<is-dropdown>
<is-button slot="trigger" with-caret>Options</is-button>
<is-dropdown-item value="edit">Edit</is-dropdown-item>
<is-divider></is-divider>
<is-dropdown-item value="delete" variant="danger">Delete</is-dropdown-item>
</is-dropdown>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `open` | boolean | Fuente define default/restricción. |
| `placement` | string/según contrato | Fuente define default/restricción. |
| `distance` | string/según contrato | Fuente define default/restricción. |
| `skidding` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

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

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-select` | sí | sí | sí | sí |
| `is-show` | no | sí | sí | sí |
| `is-after-show` | no | sí | sí | sí |
| `is-hide` | no | sí | sí | sí |
| `is-after-hide` | no | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `show()` | Método público declarado. |
| `hide()` | Método público declarado. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `--is-font-family` | Token leído o definido por componente. |
| `--show-duration` | Token leído o definido por componente. |
| `--hide-duration` | Token leído o definido por componente. |
| `--auto-size-available-height` | Token leído o definido por componente. |
| `--is-radius` | Token leído o definido por componente. |
| `--is-bg-elev` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-shadow` | Token leído o definido por componente. |
| `--is-text-soft` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-dropdown> — menú anclado a un trigger.
> El panel usa <dialog showModal()> (top layer) para no quedar debajo de
> headings/secciones/overflow de ancestros — mismo patrón que is-combobox.
> Slots: trigger | default (items / dividers / headings)
> Attrs: open, placement (default bottom-start), distance, skidding
> Events: is-show, is-after-show, is-hide, is-after-hide, is-select { item }
> Parts: ::part(dialog) ::part(menu)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/position.js`](../_shared/position.js)
- [`./dropdown-item.js`](./dropdown-item.js)
- [`../layout/divider.js`](../layout/divider.js)

Tags del módulo: `<is-dropdown>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-haspopup`, `aria-expanded`.

## Ejemplo avanzado

```html
<is-dropdown>
<is-button slot="trigger" with-caret>Options</is-button>
<is-dropdown-item value="edit">Edit</is-dropdown-item>
<is-divider></is-divider>
<is-dropdown-item value="delete" variant="danger">Delete</is-dropdown-item>
</is-dropdown>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size variant; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./dropdown.js)
- [CSS](./dropdown.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/actions/is-dropdown.html)
