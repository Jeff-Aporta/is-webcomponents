---
tag: is-progress-bar
tags:
  - is-progress-bar
category: feedback
status: public
source: ./progress-bar.js
style: ./progress-bar.css
preview: ../../previews/feedback/is-progress-bar.html
---
# `<is-progress-bar>`

## Propósito

<is-progress-bar>

Este módulo registra `<is-progress-bar>`.

## Cuándo usarlo

Estado, progreso, confirmación, carga o resultado de operaciones.

## Cuándo no usarlo

No saturar interfaz con señales redundantes o alertas sin acción.

## Importación

```js
import './progress-bar.js';
```

## Ejemplo mínimo

```html
<is-progress-bar value="65" label="Carga"></is-progress-bar>
<is-progress-bar indeterminate label="Procesando"></is-progress-bar>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string/según contrato | Fuente define default/restricción. |
| `label` | string/según contrato | Fuente define default/restricción. |
| `indeterminate` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |
| `label` | lectura/escritura | Declarada por clase. |
| `indeterminate` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos

No expone.

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `progress-bar` | Personalizable con `::part(progress-bar)`. |
| `indicator` | Personalizable con `::part(indicator)`. |
| `label` | Personalizable con `::part(label)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--track-height` | Token leído o definido por componente. |
| `--track-color` | Token leído o definido por componente. |
| `--is-control-bg` | Token leído o definido por componente. |
| `--indicator-color` | Token leído o definido por componente. |
| `--is-color-brand-500` | Token leído o definido por componente. |
| `--is-font-family` | Token leído o definido por componente. |
| `--is-text-soft` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-progress-bar> — Web Component (vanilla).
> Atributos
>   value           number 0–100
>   label           string — aria-label
>   indeterminate   boolean
> Slots: default — etiqueta interna
> role=progressbar
> CSS Parts: ::part(progress-bar) ::part(indicator) ::part(label)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-progress-bar>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`.

## Ejemplo avanzado

```html
<is-progress-bar value="65" label="Carga"></is-progress-bar>
<is-progress-bar indeterminate label="Procesando"></is-progress-bar>
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

- [JavaScript](./progress-bar.js)
- [CSS](./progress-bar.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/feedback/is-progress-bar.html)
