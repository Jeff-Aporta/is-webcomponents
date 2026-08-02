---
tag: is-skeleton
tags:
  - is-skeleton
category: feedback
status: public
source: ./skeleton.js
style: ./skeleton.css
preview: ../../previews/feedback/is-skeleton.html
---
# `<is-skeleton>`

## Propósito

<is-skeleton>

Este módulo registra `<is-skeleton>`.

## Cuándo usarlo

Estado, progreso, confirmación, carga o resultado de operaciones.

## Cuándo no usarlo

No saturar interfaz con señales redundantes o alertas sin acción.

## Importación

```js
import './skeleton.js';
```

## Ejemplo mínimo

```html
<is-skeleton effect="sheen" style="height:1rem"></is-skeleton>
<is-skeleton effect="pulse" style="height:1rem"></is-skeleton>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `effect` | string/según contrato | Fuente define default/restricción. |

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
| `indicator` | Personalizable con `::part(indicator)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--color` | Token leído o definido por componente. |
| `--sheen-color` | Token leído o definido por componente. |
| `--is-control-bg` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-skeleton> — Web Component (vanilla).
> Placeholder de carga.
> Atributos
>   effect  none | sheen | pulse (default sheen)
> CSS Parts: ::part(indicator)
> CSS vars: --color, --sheen-color

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-skeleton>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`.

## Ejemplo avanzado

```html
<is-skeleton effect="sheen" style="height:1rem"></is-skeleton>
<is-skeleton effect="pulse" style="height:1rem"></is-skeleton>
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

- [JavaScript](./skeleton.js)
- [CSS](./skeleton.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/feedback/is-skeleton.html)
