---
tag: is-time-clock
tags:
  - is-time-clock
category: forms
status: public
source: ./time-clock.js
style: ./time-clock.css
preview: ../../previews/forms/is-time-clock.html
---
# `<is-time-clock>`

## Propósito

Reloj analógico (TimeClock de MUI X). Arrastra la manecilla, haz clic o usa el teclado. Al soltar avanza de horas a minutos.

Este módulo registra `<is-time-clock>`.

## Cuándo usarlo

Captura, selección y validación de valores compatibles con formularios.

## Cuándo no usarlo

No duplicar validación, form association ni pickers shared.

## Importación

```js
import './time-clock.js';
```

## Ejemplo mínimo

```html
<is-time-clock></is-time-clock>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string/según contrato | Fuente define default/restricción. |
| `view` | string/según contrato | Fuente define default/restricción. |
| `ampm` | boolean | Fuente define default/restricción. |
| `hour24` | string/según contrato | Fuente define default/restricción. |
| `seconds` | boolean | Fuente define default/restricción. |
| `minutes-step` | string/según contrato | Fuente define default/restricción. |
| `min-time` | string/según contrato | Fuente define default/restricción. |
| `max-time` | string/según contrato | Fuente define default/restricción. |
| `locale` | string/según contrato | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `readonly` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |
| `view` | lectura/escritura | Declarada por clase. |
| `ampm` | lectura/escritura | Declarada por clase. |
| `seconds` | lectura/escritura | Declarada por clase. |
| `minutesStep` | lectura/escritura | Declarada por clase. |
| `locale` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `readonly` | lectura/escritura | Declarada por clase. |
| `time` | solo lectura | Declarada por clase. |

### Slots

No expone.

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-view-change` | sí | sí | sí | no |
| `is-change` | sí | sí | sí | no |

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `header` | Personalizable con `::part(header)`. |
| `hours` | Personalizable con `::part(hours)`. |
| `minutes` | Personalizable con `::part(minutes)`. |
| `seconds` | Personalizable con `::part(seconds)`. |
| `clock` | Personalizable con `::part(clock)`. |
| `hand` | Personalizable con `::part(hand)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--a` | Token leído o definido por componente. |
| `--is-clock-size` | Token leído o definido por componente. |
| `--is-clock-face` | Token leído o definido por componente. |
| `--is-control-bg` | Token leído o definido por componente. |
| `--is-sans` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-bg-elev` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-radius` | Token leído o definido por componente. |
| `--is-shadow` | Token leído o definido por componente. |
| `--is-text-dim` | Token leído o definido por componente. |
| `--is-radius-sm` | Token leído o definido por componente. |
| `--is-control-bg-hover` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |
| `--is-accent-bg` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |
| `--is-clock-inset` | Token leído o definido por componente. |
| `--is-on-brand` | Token leído o definido por componente. |
| `--is-hand-length` | Token leído o definido por componente. |
| `--is-color-brand-600` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-time-clock> — Reloj analógico para elegir hora (MUI TimeClock).
> Vistas encadenadas: horas → minutos → segundos (si `seconds`). El disco es
> un slider: se puede arrastrar, hacer clic o usar el teclado.
> Atributos: value (HH:mm[:ss]), view (hours|minutes|seconds), ampm,
>            hour24, seconds, minutes-step, min-time, max-time, locale,
>            disabled, readonly
> Events: is-change { value } · is-view-change { view }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/date-utils.js`](../_shared/date-utils.js)

Tags del módulo: `<is-time-clock>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-orientation`, `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`, `aria-disabled`.

## Ejemplo avanzado

```html
<is-time-clock></is-time-clock>
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

- [JavaScript](./time-clock.js)
- [CSS](./time-clock.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/forms/is-time-clock.html)
