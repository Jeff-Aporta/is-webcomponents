---
tag: is-callout
tags:
  - is-callout
category: layout
status: public
source: ./callout.js
style: ./callout.css
preview: ../../previews/layout/is-callout.json
---
# `<is-callout>`

## Propósito

Mensaje en línea con borde y fondo suaves. Pensado para tips, info, warnings y
errores que el usuario no debe pasar por alto. Cinco colores y cinco apariencias,
con icono automático según la colore (sobrescribible vía icon
o slot icon).

Este módulo registra `<is-callout>`.

## Cuándo usarlo

Estructura, superficies, overlays y navegación por regiones de contenido.

## Cuándo no usarlo

No crear size colors; escalar mediante font-size contextual y em.

## Importación

```js
import './callout.js';
```

## Ejemplo mínimo

```html
<is-callout>Esto es un callout estándar.</is-callout>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | string/según contrato | Fuente define default/restricción. |
| `variant` | string/según contrato | Fuente define default/restricción. |
| `icon` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `color` | lectura/escritura | Declarada por clase. |
| `variant` | lectura/escritura | Declarada por clase. |
| `icon` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `icon` | Contenido proyectado. |
| `default` | Contenido proyectado. |

### Eventos

No expone.

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `icon` | Personalizable con `::part(icon)`. |
| `message` | Personalizable con `::part(message)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--spacing` | Token leído o definido por componente. |
| `--is-space-l` | Token leído o definido por componente. |
| `--callout-bg` | Token leído o definido por componente. |
| `--callout-border` | Token leído o definido por componente. |
| `--callout-text` | Token leído o definido por componente. |
| `--callout-accent` | Token leído o definido por componente. |
| `--is-bg-elev` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-color-brand-500` | Token leído o definido por componente. |
| `--is-font-family` | Token leído o definido por componente. |
| `--_pad-y` | Token leído o definido por componente. |
| `--_pad-x` | Token leído o definido por componente. |
| `--_icon-size` | Token leído o definido por componente. |
| `--_gap` | Token leído o definido por componente. |
| `--_radius` | Token leído o definido por componente. |
| `--is-radius` | Token leído o definido por componente. |
| `--is-color-brand-100` | Token leído o definido por componente. |
| `--is-color-brand-700` | Token leído o definido por componente. |
| `--is-text-muted` | Token leído o definido por componente. |
| `--is-control-bg` | Token leído o definido por componente. |
| `--is-control-border` | Token leído o definido por componente. |
| `--is-color-success-500` | Token leído o definido por componente. |
| `--is-color-success-100` | Token leído o definido por componente. |
| `--is-color-success-700` | Token leído o definido por componente. |
| `--is-color-warning-500` | Token leído o definido por componente. |
| `--is-color-warning-100` | Token leído o definido por componente. |
| `--is-color-warning-700` | Token leído o definido por componente. |
| `--is-color-danger-500` | Token leído o definido por componente. |
| `--is-color-danger-100` | Token leído o definido por componente. |
| `--is-color-danger-700` | Token leído o definido por componente. |
| `--is-on-brand` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-callout> — Web Component (vanilla, zero dependencies).
> Mensaje en línea con borde y fondo suaves. Pensado para tips, info, warnings
> y errores que el usuario no debe pasar por alto.
> Modelo equivalente a wa-callout (Web Awesome) / v-alert.
> Atributos
>   color     brand | neutral | success | warning | danger
>               (default 'brand', reflected)
>   variant  accent | filled | outlined | filled-outlined | plain
>               (default 'filled-outlined', reflected)
>   icon        nombre Iconify para mostrar a la izquierda (ej. "mdi:bell").
>               Si no se da, se elige uno por colore.
> Slots
>   (default)  mensaje principal
>   icon       icono propio (gana sobre el atributo icon)
> CSS Parts:  ::part(icon)  ::part(message)
> CSS custom properties
>   --spacing        espacio alrededor del callout (default var(--is-space-l, 1rem))
>   --callout-bg     fondo computado por color/variant
>   --callout-border color del borde
>   --callout-text   color del texto
>   --callout-accent color del icono
> Eventos: ninguno propio (customizable vía slotted buttons).

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-callout>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`.

## Ejemplo avanzado

```html
<is-callout color="success">…</is-callout>
<is-callout color="danger">…</is-callout>
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

- [JavaScript](./callout.js)
- [CSS](./callout.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/layout/is-callout.json)
