---
tag: iswc-date-field
tags:
  - iswc-date-field
category: forms
status: public
source: ./date-field.ts
style: ./date-field.css
preview: ./date-field.json
---
# `<iswc-date-field>`

## Propósito

Campo editable por secciones (DateField de MUI X). Cada sección es un spinbutton: flechas, dígitos, izquierda/derecha, Retroceso. El orden lo decide el locale.

Este módulo registra `<iswc-date-field>`.

## Cuándo usarlo

Captura, selección y validación de valores compatibles con formularios.

## Cuándo no usarlo

No duplicar validación, form association ni pickers shared.

## Importación

```js
import './date-field.js';
```

## Ejemplo mínimo

```html
<iswc-date-field></iswc-date-field>
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


| Evento | Descripción |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-date-field');
el.addEventListener('click', (e) => {
  console.log('click', e.detail);
});
```

</details>

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

No expone.

### Custom states

Hereda de la factory [`defineDateField`](../_shared/date-field-element.js), que aplica los siguientes states en el host:

| Estado | Uso |
| --- | --- |
| `:state(disabled)` | Atributo `disabled` presente o `formDisabledCallback` recibido. |
| `:state(invalid)` | Validación falla (required+vacío, sección incompleta, fuera de min/max o atributo `invalid`). |

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

> <iswc-date-field> — Campo de fecha editable por secciones (MUI DateField).
> Cada sección (día, mes, año, en el orden del locale) es un spinbutton:
> flechas para subir/bajar, dígitos para teclear, izquierda/derecha para
> saltar, Retroceso para vaciar. No usa <input type=date>.
> Atributos: label, hint, name, value (yyyy-mm-dd), min, max, required,
>            disabled, readonly, clearable, locale, invalid
> Slots: start, end
> Events: iswc-change, iswc-input

## Dependencias y componentes relacionados

- [`../_shared/date-field-element.js`](../_shared/date-field-element.js)

Tags del módulo: `<iswc-date-field>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explícito en fuente.

## Ejemplo avanzado

```html
<iswc-date-field></iswc-date-field>
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

- [JavaScript](./date-field.js)
- [CSS](./date-field.css)
- [Índice de categoría](./LLM.md)
- [Preview](./date-field.json)