---
tag: iswc-format-number
tags:
  - iswc-format-number
category: helpers
status: public
source: ./format-number.ts
style: ./format-number.css
preview: ./format-number.json
---
# `<iswc-format-number>`

## PropÃ³sito

NÃºmeros con Intl.NumberFormat. Locale = lang del documento.

Este mÃ³dulo registra `<iswc-format-number>`.

## CuÃ¡ndo usarlo

Formato, observaciÃ³n y posicionamiento reutilizable sobre APIs nativas.

## CuÃ¡ndo no usarlo

No crear wrapper nuevo si Intl/Observer/position existente cubre caso.

## ImportaciÃ³n

```js
import './format-number.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-format-number value="0.875" type="percent"></iswc-format-number>
<iswc-format-number value="99.9" type="currency" currency="USD"></iswc-format-number>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `type` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `currency` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `minimum-fraction-digits` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `maximum-fraction-digits` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `value` | lectura/escritura | Declarada por clase. |

### Slots

No expone.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-format-number');
el.addEventListener('click', (e) => {
  console.log('click', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone.

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `number` | Personalizable con `::part(number)`. |

### Custom states

No expone.

### CSS custom properties

No expone.

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-format-number> â€” Web Component (vanilla).
> Formatea nÃºmeros con Intl.NumberFormat.
> Atributos
>   value                    number
>   type                     decimal | currency | percent | unit (default decimal)
>   currency                 ISO 4217 (p.ej. USD, COP)
>   minimum-fraction-digits  number
>   maximum-fraction-digits  number
> Locale vÃ­a lang del documento.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-format-number>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explÃ­cito en fuente.

## Ejemplo avanzado

```html
<iswc-format-number value="1234.5" minimum-fraction-digits="2"></iswc-format-number>
<iswc-format-number value="1234.56" maximum-fraction-digits="0"></iswc-format-number>
```

## Errores comunes

- Usar tag sin importar mÃ³dulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementaciÃ³n paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explÃ­cito.
- Leer callers/shared antes de cambiar; corregir raÃ­z comÃºn.
- No modificar API basÃ¡ndose solo en preview.

## Fuentes

- [JavaScript](./format-number.ts)
- [CSS](./format-number.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./format-number.json)
