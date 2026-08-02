---
tag: is-badge
tags:
  - is-badge
category: feedback
status: public
source: ./badge.js
style: ./badge.css
preview: ../../previews/feedback/is-badge.html
---
# `<is-badge>`

## Propósito

Etiqueta compacta con colores semánticas y apariencias.

Este módulo registra `<is-badge>`.

## Cuándo usarlo

Estado, progreso, confirmación, carga o resultado de operaciones.

## Cuándo no usarlo

No saturar interfaz con señales redundantes o alertas sin acción.

## Importación

```js
import './badge.js';
```

## Ejemplo mínimo

```html
<is-badge color="success" variant="filled">OK</is-badge>
<is-badge pill attention="pulse">Live</is-badge>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | string/según contrato | Fuente define default/restricción. |
| `variant` | string/según contrato | Fuente define default/restricción. |
| `pill` | boolean | Fuente define default/restricción. |
| `attention` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

No expone.

### Slots

| Slot | Uso |
| --- | --- |
| `start` | Contenido proyectado. |
| `default` | Contenido proyectado. |
| `end` | Contenido proyectado. |

### Eventos

No expone.

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `badge` | Personalizable con `::part(badge)`. |
| `start` | Personalizable con `::part(start)`. |
| `label` | Personalizable con `::part(label)`. |
| `end` | Personalizable con `::part(end)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--pulse-color` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |
| `--_bg` | Token leído o definido por componente. |
| `--is-brand-soft` | Token leído o definido por componente. |
| `--_border` | Token leído o definido por componente. |
| `--_text` | Token leído o definido por componente. |
| `--is-brand-text` | Token leído o definido por componente. |
| `--_on` | Token leído o definido por componente. |
| `--is-on-brand` | Token leído o definido por componente. |
| `--is-font-family` | Token leído o definido por componente. |
| `--is-control-bg` | Token leído o definido por componente. |
| `--is-control-border` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-text-dim` | Token leído o definido por componente. |
| `--is-success-soft` | Token leído o definido por componente. |
| `--is-color-success-500` | Token leído o definido por componente. |
| `--is-success-text` | Token leído o definido por componente. |
| `--is-warning-soft` | Token leído o definido por componente. |
| `--is-color-warning-500` | Token leído o definido por componente. |
| `--is-warning-text` | Token leído o definido por componente. |
| `--is-danger-soft` | Token leído o definido por componente. |
| `--is-color-danger-500` | Token leído o definido por componente. |
| `--is-danger-text` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-badge> — Web Component (vanilla).
> Etiqueta compacta con colores semánticas.
> Atributos
>   color      brand | neutral | success | warning | danger (default brand)
>   variant   accent | filled | outlined | filled-outlined (default accent)
>   pill         boolean
>   attention    none | pulse | bounce (default none)
> Slots: default, start, end

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-badge>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explícito en fuente.

## Ejemplo avanzado

```html
<is-badge color="success" variant="filled">OK</is-badge>
<is-badge pill attention="pulse">Live</is-badge>
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

- [JavaScript](./badge.js)
- [CSS](./badge.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/feedback/is-badge.html)
