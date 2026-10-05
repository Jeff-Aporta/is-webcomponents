---
tag: iswc-gauge
tags:
  - iswc-gauge
category: data
status: public
source: ./gauge.ts
style: ./gauge.css
preview: ./gauge.json
---
# `<iswc-gauge>`

## PropÃ³sito

Medidor circular SVG de porcentaje. Soporta colores, semicÃ­rculo,
custom min/max, unidad, formato y tamaÃ±o.

Este mÃ³dulo registra `<iswc-gauge>`.

## CuÃ¡ndo usarlo

PresentaciÃ³n, comparaciÃ³n, movimiento u organizaciÃ³n de datos estructurados.

## CuÃ¡ndo no usarlo

No reemplazar HTML semÃ¡ntico cuando contenido es estÃ¡tico y simple.

## ImportaciÃ³n

```js
import './gauge.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-gauge value="67" label="ConversiÃ³n" unit="%"></iswc-gauge>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `value` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `min` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `max` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `unit` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `thickness` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `color` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `half` | boolean | Fuente define default/restricciÃ³n. |
| `format` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `show-value` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

No expone.

### Slots

No expone.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-gauge-change` | Evento personalizado del componente (gauge change). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-gauge-change` | segÃºn cabecera | segÃºn cabecera | segÃºn cabecera | segÃºn cabecera |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-gauge');
el.addEventListener('iswc-gauge-change', (e) => {
  console.log('iswc-gauge-change', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone.

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `svg` | Personalizable con `::part(svg)`. |
| `track` | Personalizable con `::part(track)`. |
| `fill` | Personalizable con `::part(fill)`. |
| `content` | Personalizable con `::part(content)`. |
| `value` | Personalizable con `::part(value)`. |
| `label` | Personalizable con `::part(label)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--brand` | Token leÃ­do o definido por componente. |
| `--iswc-brand` | Token leÃ­do o definido por componente. |
| `--success` | Token leÃ­do o definido por componente. |
| `--iswc-success` | Token leÃ­do o definido por componente. |
| `--warning` | Token leÃ­do o definido por componente. |
| `--iswc-warning` | Token leÃ­do o definido por componente. |
| `--danger` | Token leÃ­do o definido por componente. |
| `--iswc-danger` | Token leÃ­do o definido por componente. |
| `--bg-track` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--fg` | Token leÃ­do o definido por componente. |
| `--muted` | Token leÃ­do o definido por componente. |
| `--gauge-size` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-gauge> â€” Medidor circular de porcentaje (vanilla, zero dependencies).
> Medidor semicircular o completo de 0..100 (o arbitrary min/max).
>   <iswc-gauge value="67" label="ConversiÃ³n"></iswc-gauge>
> Atributos
>   value       number  (0..100)
>   min         number
>   max         number
>   label       string
>   unit        string  (e.g. "%")
>   thickness   number  (px)
>   color     brand | success | warning | danger (default 'brand')
>   half        boolean â€” semicÃ­rculo.
>   format      string  â€” Intl.NumberFormat format string. e.g. "0.0".
>   show-value  boolean (default true)
> Eventos
>   iswc-gauge-change  detail: { value, percent }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-gauge>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explÃ­cito en fuente.

## Ejemplo avanzado

```html
<iswc-gauge value="67" label="ConversiÃ³n" unit="%"></iswc-gauge>
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

- [JavaScript](./gauge.ts)
- [CSS](./gauge.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./gauge.json)
