---
tag: is-digital-clock
tags:
  - is-digital-clock
category: forms
status: public
source: ./digital-clock.js
style: ./digital-clock.css
preview: ../../previews/forms/is-time-clock.html
---
# `<is-digital-clock>`

## Propósito

Reloj analógico (TimeClock de MUI X). Arrastra la manecilla, haz clic o usa el teclado. Al soltar avanza de horas a minutos.

Este módulo registra `<is-digital-clock>`.

## Cuándo usarlo

Captura, selección y validación de valores compatibles con formularios.

## Cuándo no usarlo

No duplicar validación, form association ni pickers shared.

## Importación

```js
import './digital-clock.js';
```

## Ejemplo mínimo

```html
<is-digital-clock></is-digital-clock>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string/según contrato | Fuente define default/restricción. |
| `layout` | string/según contrato | Fuente define default/restricción. |
| `step` | string/según contrato | Fuente define default/restricción. |
| `minutes-step` | string/según contrato | Fuente define default/restricción. |
| `seconds` | boolean | Fuente define default/restricción. |
| `ampm` | boolean | Fuente define default/restricción. |
| `hour24` | string/según contrato | Fuente define default/restricción. |
| `min-time` | string/según contrato | Fuente define default/restricción. |
| `max-time` | string/según contrato | Fuente define default/restricción. |
| `skip-disabled` | boolean | Fuente define default/restricción. |
| `locale` | string/según contrato | Fuente define default/restricción. |
| `disabled` | boolean | Fuente define default/restricción. |
| `readonly` | boolean | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |
| `layout` | lectura/escritura | Declarada por clase. |
| `step` | lectura/escritura | Declarada por clase. |
| `minutesStep` | lectura/escritura | Declarada por clase. |
| `seconds` | lectura/escritura | Declarada por clase. |
| `ampm` | lectura/escritura | Declarada por clase. |
| `skipDisabled` | lectura/escritura | Declarada por clase. |
| `locale` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `readonly` | lectura/escritura | Declarada por clase. |
| `time` | solo lectura | Declarada por clase. |

### Slots

No expone.

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-change` | sí | sí | sí | no |

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `scrollToSelection()` | Método público declarado. |

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
| `--is-clock-height` | Token leído o definido por componente. |
| `--is-sans` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-bg-elev` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-radius` | Token leído o definido por componente. |
| `--is-shadow` | Token leído o definido por componente. |
| `--is-radius-sm` | Token leído o definido por componente. |
| `--is-control-bg-hover` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |
| `--is-color-brand-600` | Token leído o definido por componente. |
| `--is-on-brand` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-digital-clock> — Selector de hora en lista (MUI DigitalClock) o en
> columnas de horas / minutos / segundos / AM-PM (MultiSectionDigitalClock).
> Atributos: value (HH:mm[:ss]), layout (list|sections), step (minutos en
>            lista), minutes-step, seconds, ampm, hour24, min-time, max-time,
>            skip-disabled, locale, disabled, readonly
> Events: is-change { value }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/date-utils.js`](../_shared/date-utils.js)

Tags del módulo: `<is-digital-clock>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-selected`, `aria-label`.

## Ejemplo avanzado

```html
<is-digital-clock></is-digital-clock>
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

- [JavaScript](./digital-clock.js)
- [CSS](./digital-clock.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/forms/is-time-clock.html)
