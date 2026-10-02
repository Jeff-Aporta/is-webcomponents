---
tag: iswc-time-field
tags:
  - iswc-time-field
category: forms
status: public
source: ./time-field.js
style: ./time-field.css
preview: ./time-field.json
---
# `<iswc-time-field>`

## Propósito

Campo editable por secciones (DateField de MUI X). Cada sección es un spinbutton: flechas, dígitos, izquierda/derecha, Retroceso. El orden lo decide el locale.

Este módulo registra `<iswc-time-field>`.

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
<iswc-time-field></iswc-time-field>
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
| `--iswc-sans` | Token leído o definido por componente. |
| `--iswc-text` | Token leído o definido por componente. |
| `--iswc-text-dim` | Token leído o definido por componente. |
| `--iswc-control-bg` | Token leído o definido por componente. |
| `--iswc-border` | Token leído o definido por componente. |
| `--iswc-radius-sm` | Token leído o definido por componente. |
| `--iswc-accent` | Token leído o definido por componente. |
| `--iswc-accent-bg` | Token leído o definido por componente. |
| `--iswc-color-danger-500` | Token leído o definido por componente. |
| `--iswc-control-bg-hover` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-time-field> — Campo de hora editable por secciones (MUI TimeField).
> Atributos: label, hint, name, value (HH:mm[:ss]), min, max, required,
>            disabled, readonly, clearable, locale, ampm, hour24, seconds,
>            invalid
> Slots: start, end
> Events: iswc-change, iswc-input

## Dependencias y componentes relacionados

- [`../_shared/date-field-element.js`](../_shared/date-field-element.js)

Tags del módulo: `<iswc-time-field>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explícito en fuente.

## Ejemplo avanzado

```html
<iswc-time-field></iswc-time-field>
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
- [Preview](./time-field.json)
