---
tag: is-spinner
tags:
  - is-spinner
category: feedback
status: public
source: ./spinner.js
style: ./spinner.css
preview: ../../previews/feedback/is-spinner.html
---
# `<is-spinner>`

## Propósito

Indicador de carga animado. Sin atributos; personalizable vía CSS vars.

Este módulo registra `<is-spinner>`.

## Cuándo usarlo

Estado, progreso, confirmación, carga o resultado de operaciones.

## Cuándo no usarlo

No saturar interfaz con señales redundantes o alertas sin acción.

## Importación

```js
import './spinner.js';
```

## Ejemplo mínimo

```html
<is-spinner></is-spinner>
<is-spinner style="font-size:2rem;--indicator-color:#40c057"></is-spinner>
```

## API

### Atributos y propiedades

#### Atributos observados

No expone.

#### Propiedades públicas

No expone.

### Slots

No expone.

### Eventos

No expone.

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `spinner` | Personalizable con `::part(spinner)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--track-width` | Token leído o definido por componente. |
| `--track-color` | Token leído o definido por componente. |
| `--indicator-color` | Token leído o definido por componente. |
| `--speed` | Token leído o definido por componente. |
| `--is-control-border` | Token leído o definido por componente. |
| `--is-color-brand-500` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-spinner> — Web Component (vanilla).
> Indicador de carga animado (anillo via border).
> role=status en el host; respeta prefers-reduced-motion.
> CSS Parts: ::part(spinner)
> CSS vars: --track-width, --track-color, --indicator-color, --speed

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-spinner>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`, `aria-live`, `aria-label`.

## Ejemplo avanzado

```html
<is-spinner style="--speed:1.05s"></is-spinner>
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

- [JavaScript](./spinner.js)
- [CSS](./spinner.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/feedback/is-spinner.html)
