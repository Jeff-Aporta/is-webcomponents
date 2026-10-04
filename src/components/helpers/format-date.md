---
tag: iswc-format-date
tags:
  - iswc-format-date
category: helpers
status: public
source: ./format-date.ts
style: ./format-date.css
preview: ./format-date.json
---
# `<iswc-format-date>`

## PropÃ³sito

Formatea fechas con Intl.DateTimeFormat. Cualquier locale BCP 47 vÃ­a locale (o lang del documento).

Este mÃ³dulo registra `<iswc-format-date>`.

## CuÃ¡ndo usarlo

Formato, observaciÃ³n y posicionamiento reutilizable sobre APIs nativas.

## CuÃ¡ndo no usarlo

No crear wrapper nuevo si Intl/Observer/position existente cubre caso.

## ImportaciÃ³n

```js
import './format-date.js';
```

## Ejemplo mÃ­nimo

```html
const asked = ['es','en','fr','de','ja','zh-CN','ar','pt-BR'];
const ok = Intl.DateTimeFormat.supportedLocalesOf(asked);
// â†’ p.ej. ["es","en","fr","de","ja","zh-CN","ar","pt-BR"]
<iswc-format-date locale="ja" date="2026-07-30" weekday="long" month="long" day="numeric" year="numeric"></iswc-format-date>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `date` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `weekday` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `era` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `year` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `month` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `day` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `hour` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `minute` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `second` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `time-zone` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `time-zone-name` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `hour-format` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `locale` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `date` | lectura/escritura | Declarada por clase. |
| `locale` | lectura/escritura | Declarada por clase. |

### Slots

No expone.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-format-date');
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
| `date` | Personalizable con `::part(date)`. |

### Custom states

No expone.

### CSS custom properties

No expone.

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-format-date> â€” Web Component (vanilla).
> Formatea fechas con Intl.DateTimeFormat.
> Atributos: date, weekday, era, year, month, day, hour, minute, second,
>            time-zone, time-zone-name, hour-format (auto|12|24),
>            locale (BCP 47; default = lang del documento)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-format-date>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explÃ­cito en fuente.

## Ejemplo avanzado

```html
<iswc-format-date date="2026-07-30T17:30:00" hour="numeric" minute="numeric" hour-format="24"></iswc-format-date>
<iswc-format-date date="2026-07-30T17:30:00" hour="numeric" minute="numeric" hour-format="12"></iswc-format-date>
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

- [JavaScript](./format-date.ts)
- [CSS](./format-date.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./format-date.json)
