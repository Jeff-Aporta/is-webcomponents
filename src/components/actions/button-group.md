---
tag: is-button-group
tags:
  - is-button-group
category: actions
status: public
source: ./button-group.js
style: ./button-group.css
preview: ../../previews/actions/is-button-group.json
---
# `<is-button-group>`

## Propósito

Agrupa botones relacionados en una sola unidad visual y, si se lo pides, gestiona
cuál está activo. Sirve para controles segmentados, toolbars y split buttons.

Este módulo registra `<is-button-group>`.

## Cuándo usarlo

Acciones, selección de comandos y menús interactivos.

## Cuándo no usarlo

No usar como decoración ni reemplazar enlaces semánticos para navegación simple.

## Importación

```js
import './button-group.js';
```

## Ejemplo mínimo

```html
<is-button-group label="Vista" variant="segmented" select="single" value="lista">
<is-button variant="plain" value="lista" hue="210">Lista</is-button>
<is-button variant="plain" value="tabla" hue="160">Tabla</is-button>
<is-button variant="plain" value="tarjetas" hue="35">Tarjetas</is-button>
</is-button-group>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `label` | string/según contrato | Fuente define default/restricción. |
| `orientation` | string/según contrato | Fuente define default/restricción. |
| `variant` | string/según contrato | Fuente define default/restricción. |
| `select` | string/según contrato | Fuente define default/restricción. |
| `value` | string/según contrato | Fuente define default/restricción. |
| `pill` | boolean | Fuente define default/restricción. |
| `stretch` | boolean | Fuente define default/restricción. |
| `allow-empty` | boolean | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `label` | lectura/escritura | Declarada por clase. |
| `orientation` | lectura/escritura | Declarada por clase. |
| `variant` | lectura/escritura | Declarada por clase. |
| `select` | lectura/escritura | Declarada por clase. |
| `value` | lectura/escritura | Declarada por clase. |
| `values` | lectura/escritura | Declarada por clase. |
| `pill` | lectura/escritura | Declarada por clase. |
| `stretch` | lectura/escritura | Declarada por clase. |
| `allowEmpty` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `items` | solo lectura | Declarada por clase. |
| `selectedItems` | solo lectura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-change` | sí | sí | sí | no |

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-button-border-width` | Token leído o definido por componente. |
| `--is-control-border-width` | Token leído o definido por componente. |
| `--is-button-group-radius` | Token leído o definido por componente. |
| `--is-button-border-radius` | Token leído o definido por componente. |
| `--is-button-group-gap` | Token leído o definido por componente. |
| `--is-button-group-pad` | Token leído o definido por componente. |
| `--is-button-group-accent` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |
| `--_button-horizontal-indent` | Token leído o definido por componente. |
| `--_button-horizontal-indent-outlined` | Token leído o definido por componente. |
| `--_button-start-end-radius` | Token leído o definido por componente. |
| `--_button-end-end-radius` | Token leído o definido por componente. |
| `--_button-start-start-radius` | Token leído o definido por componente. |
| `--_button-end-start-radius` | Token leído o definido por componente. |
| `--_button-vertical-indent` | Token leído o definido por componente. |
| `--_button-vertical-indent-outlined` | Token leído o definido por componente. |
| `--is-bg-soft` | Token leído o definido por componente. |
| `--is-bg-elev` | Token leído o definido por componente. |
| `--is-border-soft` | Token leído o definido por componente. |
| `--is-control-bg` | Token leído o definido por componente. |
| `--is-control-bg-hover` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-control-bg-active` | Token leído o definido por componente. |
| `--is-control-border` | Token leído o definido por componente. |
| `--is-control-text` | Token leído o definido por componente. |
| `--is-text-soft` | Token leído o definido por componente. |
| `--_sel` | Token leído o definido por componente. |
| `--is-button-selected-color` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-button-group> — Web Component (vanilla, zero dependencies).
> Agrupa botones relacionados en una unidad visual y, opcionalmente, gestiona
> qué botón está seleccionado (control segmentado / toggle group).
> Atributos
>   label         string   a11y, anunciado por AT; no se muestra
>   orientation   horizontal | vertical            (default horizontal, reflected)
>   variant    joined | segmented | separated   (default joined, reflected)
>   select        none | single | multiple         (default none)
>   value         valor(es) seleccionados; en `multiple` separados por coma
>   pill          boolean  extremos redondeados en todo el grupo
>   stretch       boolean  los botones reparten el ancho disponible
>   allow-empty   boolean  en `single`, permite deseleccionar el activo
>   disabled      boolean  bloquea el grupo completo
> Slots
>   (default)  uno o más <is-button> (o <button> nativos)
> CSS Parts:  ::part(base)
> Eventos:    is-change { value, values }
> El valor de cada botón es su atributo `value`; si no lo tiene, se usa su
> texto y, en último caso, su índice. El botón activo recibe el atributo
> `selected` y `aria-pressed`, que el CSS del grupo usa para pintarlo.
> Las variables --_button-*-radius y --_button-*-indent se inyectan en los
> hijos slotted; <is-button> las consume para fusionar bordes.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-button-group>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-pressed`, `aria-disabled`, `aria-label`, `aria-orientation`.

## Ejemplo avanzado

```html
<is-button-group variant="segmented" select="single">…</is-button-group>
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

- [JavaScript](./button-group.js)
- [CSS](./button-group.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/actions/is-button-group.json)
