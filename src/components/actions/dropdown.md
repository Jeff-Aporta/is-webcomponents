---
tag: iswc-dropdown
tags:
  - iswc-dropdown
category: actions
status: public
source: ./dropdown.js
style: ./dropdown.css
preview: ./dropdown.json
---
# `<iswc-dropdown>`

## Propósito

Menú anclado a un trigger. Panel en <dialog> modal
(top layer) para no quedar debajo de otras secciones. Items:
iswc-dropdown-item, iswc-divider e iconos.

Este módulo registra `<iswc-dropdown>`.

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


| Evento | Descripción |
| --- | --- |
| `iswc-select` | Emitido al seleccionar un elemento. |
| `iswc-show` | Emitido justo antes de mostrarse (cancelable). |
| `iswc-after-show` | Emitido tras finalizar la animación de apertura. |
| `iswc-hide` | Emitido justo antes de ocultarse (cancelable). |
| `iswc-after-hide` | Emitido tras finalizar la animación de cierre. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-select` | sí | sí | sí | sí |
| `iswc-show` | no | sí | sí | sí |
| `iswc-after-show` | no | sí | sí | sí |
| `iswc-hide` | no | sí | sí | sí |
| `iswc-after-hide` | no | sí | sí | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-dropdown');
el.addEventListener('iswc-select', (e) => {
  console.log('iswc-select', e.detail);
});
```

</details>

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
| `--iswc-font-family` | Token leído o definido por componente. |
| `--show-duration` | Token leído o definido por componente. |
| `--hide-duration` | Token leído o definido por componente. |
| `--auto-size-available-height` | Token leído o definido por componente. |
| `--iswc-radius` | Token leído o definido por componente. |
| `--iswc-bg-elev` | Token leído o definido por componente. |
| `--iswc-text` | Token leído o definido por componente. |
| `--iswc-border` | Token leído o definido por componente. |
| `--iswc-shadow` | Token leído o definido por componente. |
| `--iswc-text-soft` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-dropdown> — menú anclado a un trigger.
> El panel usa <dialog showModal()> (top layer) para no quedar debajo de
> headings/secciones/overflow de ancestros — mismo patrón que iswc-combobox.
> Slots: trigger | default (items / dividers / headings)
> Attrs: open, placement (default bottom-start), distance, skidding
> Events: iswc-show, iswc-after-show, iswc-hide, iswc-after-hide, iswc-select { item }
> Parts: ::part(dialog) ::part(menu)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/position.js`](../_shared/position.js)
- [`./dropdown-item.js`](./dropdown-item.js)
- [`../layout/divider.js`](../layout/divider.js)
- [`../_shared/popup-dismiss.js`](../_shared/popup-dismiss.js) — ciclo de escucha
  mientras el panel esta abierto (teclado, scroll), compartido con `iswc-context-menu`.

Tags del módulo: `<iswc-dropdown>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-haspopup`, `aria-expanded`.

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

- [JavaScript](./dropdown.js)
- [CSS](./dropdown.css)
- [Índice de categoría](./LLM.md)
- [Preview](./dropdown.json)
