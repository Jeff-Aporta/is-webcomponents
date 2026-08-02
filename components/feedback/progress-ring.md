---
tag: is-progress-ring
tags:
  - is-progress-ring
category: feedback
status: public
source: ./progress-ring.js
style: ./progress-ring.css
preview: ../../previews/feedback/is-progress-ring.html
---
# `<is-progress-ring>`

## Propósito

<is-progress-ring>

Este módulo registra `<is-progress-ring>`.

## Cuándo usarlo

Estado, progreso, confirmación, carga o resultado de operaciones.

## Cuándo no usarlo

No saturar interfaz con señales redundantes o alertas sin acción.

## Importación

```js
import './progress-ring.js';
```

## Ejemplo mínimo

```html
<span style="font-size:4rem">
<is-progress-ring value="75" label="75%"></is-progress-ring>
</span>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string/según contrato | Fuente define default/restricción. |
| `label` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |
| `label` | lectura/escritura | Declarada por clase. |

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
| `progress-ring` | Personalizable con `::part(progress-ring)`. |
| `track` | Personalizable con `::part(track)`. |
| `indicator` | Personalizable con `::part(indicator)`. |
| `label` | Personalizable con `::part(label)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--track-width` | Token leído o definido por componente. |
| `--indicator-width` | Token leído o definido por componente. |
| `--track-color` | Token leído o definido por componente. |
| `--is-control-border` | Token leído o definido por componente. |
| `--indicator-color` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |
| `--is-color-brand-500` | Token leído o definido por componente. |
| `--is-font-family` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-progress-ring> — Web Component (vanilla).
> Anillo de progreso SVG.
> Atributos
>   value   number 0–100
>   label   string — aria-label / texto central
> CSS Parts: ::part(progress-ring) ::part(track) ::part(indicator) ::part(label)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-progress-ring>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-hidden`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`.

## Ejemplo avanzado

```html
<span style="font-size:4rem">
<is-progress-ring value="75" label="75%"></is-progress-ring>
</span>
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

- [JavaScript](./progress-ring.js)
- [CSS](./progress-ring.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/feedback/is-progress-ring.html)
