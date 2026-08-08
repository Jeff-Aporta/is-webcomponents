---
tag: is-time-field
tags:
  - is-time-field
category: forms
status: public
source: ./time-field.js
style: ./time-field.css
preview: ../../previews/forms/is-time-field.json
---
# `<is-time-field>`

## Propósito

Campo editable por secciones (DateField de MUI X). Cada sección es un spinbutton: flechas, dígitos, izquierda/derecha, Retroceso. El orden lo decide el locale.

Este módulo registra `<is-time-field>`.

## Cuándo usarlo

Captura, selección y validación de valores compatibles con formularios.

## Cuándo no usarlo

No duplicar validación, form association ni pickers shared.

## Importación

```js
import './time-field.js';
```

## Ejemplo mínimo

```html
<is-time-field></is-time-field>
```

## API

Wrapper de factory: hereda contrato completo de [`defineDateField`](../_shared/date-field-element.js). Cabecera de fuente enumera atributos, slots y eventos efectivos; tablas siguientes muestran solo declaraciones locales del wrapper.

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

No expone.

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-sans` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-text-dim` | Token leído o definido por componente. |
| `--is-control-bg` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--is-radius-sm` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |
| `--is-accent-bg` | Token leído o definido por componente. |
| `--is-color-danger-500` | Token leído o definido por componente. |
| `--is-control-bg-hover` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-time-field> — Campo de hora editable por secciones (MUI TimeField).
> Atributos: label, hint, name, value (HH:mm[:ss]), min, max, required,
>            disabled, readonly, clearable, locale, ampm, hour24, seconds,
>            invalid
> Slots: start, end
> Events: is-change, is-input

## Dependencias y componentes relacionados

- [`../_shared/date-field-element.js`](../_shared/date-field-element.js)

Tags del módulo: `<is-time-field>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explícito en fuente.

## Ejemplo avanzado

```html
<is-time-field></is-time-field>
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

- [JavaScript](./time-field.js)
- [CSS](./time-field.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/forms/is-time-field.json)
