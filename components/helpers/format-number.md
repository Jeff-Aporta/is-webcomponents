---
tag: is-format-number
tags:
  - is-format-number
category: helpers
status: public
source: ./format-number.js
style: ./format-number.css
preview: ../../previews/helpers/is-format-number.html
---
# `<is-format-number>`

## Propósito

Números con Intl.NumberFormat. Locale = lang del documento.

Este módulo registra `<is-format-number>`.

## Cuándo usarlo

Formato, observación y posicionamiento reutilizable sobre APIs nativas.

## Cuándo no usarlo

No crear wrapper nuevo si Intl/Observer/position existente cubre caso.

## Importación

```js
import './format-number.js';
```

## Ejemplo mínimo

```html
<is-format-number value="0.875" type="percent"></is-format-number>
<is-format-number value="99.9" type="currency" currency="USD"></is-format-number>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string/según contrato | Fuente define default/restricción. |
| `type` | string/según contrato | Fuente define default/restricción. |
| `currency` | string/según contrato | Fuente define default/restricción. |
| `minimum-fraction-digits` | string/según contrato | Fuente define default/restricción. |
| `maximum-fraction-digits` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |

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
| `number` | Personalizable con `::part(number)`. |

### Custom states

No expone.

### CSS custom properties

No expone.

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-format-number> — Web Component (vanilla).
> Formatea números con Intl.NumberFormat.
> Atributos
>   value                    number
>   type                     decimal | currency | percent | unit (default decimal)
>   currency                 ISO 4217 (p.ej. USD, COP)
>   minimum-fraction-digits  number
>   maximum-fraction-digits  number
> Locale vía lang del documento.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del módulo: `<is-format-number>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explícito en fuente.

## Ejemplo avanzado

```html
<is-format-number value="1234.5" minimum-fraction-digits="2"></is-format-number>
<is-format-number value="1234.56" maximum-fraction-digits="0"></is-format-number>
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

- [JavaScript](./format-number.js)
- [CSS](./format-number.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/helpers/is-format-number.html)
