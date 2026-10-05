---
tag: iswc-stat
tags:
  - iswc-stat
category: data
status: public
source: ./stat.ts
style: ./stat.css
preview: ./stat.json
---
# `<iswc-stat>`

## PropÃ³sito

Tarjeta KPI para dashboards: label, nÃºmero principal, helper text,
trend (subida/bajada) e icono. Detecta automÃ¡ticamente la direcciÃ³n
del trend segÃºn el signo del valor.

Este mÃ³dulo registra `<iswc-stat>`.

## CuÃ¡ndo usarlo

PresentaciÃ³n, comparaciÃ³n, movimiento u organizaciÃ³n de datos estructurados.

## CuÃ¡ndo no usarlo

No reemplazar HTML semÃ¡ntico cuando contenido es estÃ¡tico y simple.

## ImportaciÃ³n

```js
import './stat.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-stat
label="Ingresos"
value="â‚¬ 1.249,00"
helper="vs mes anterior"
trend="+12.5%"
icon="mdi:cash-multiple"
></iswc-stat>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `value` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `helper` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `trend` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `trend-direction` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `icon` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `color` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

No expone.

### Slots

| Slot | Uso |
| --- | --- |
| `label` | Contenido proyectado. |
| `icon` | Contenido proyectado. |
| `value` | Contenido proyectado. |
| `trend` | Contenido proyectado. |
| `helper` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-stat');
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
| `base` | Personalizable con `::part(base)`. |
| `head` | Personalizable con `::part(head)`. |
| `label` | Personalizable con `::part(label)`. |
| `icon` | Personalizable con `::part(icon)`. |
| `value` | Personalizable con `::part(value)`. |
| `foot` | Personalizable con `::part(foot)`. |
| `trend` | Personalizable con `::part(trend)`. |
| `helper` | Personalizable con `::part(helper)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--bg` | Token leÃ­do o definido por componente. |
| `--iswc-bg-2` | Token leÃ­do o definido por componente. |
| `--fg` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--muted` | Token leÃ­do o definido por componente. |
| `--border` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--brand` | Token leÃ­do o definido por componente. |
| `--iswc-brand` | Token leÃ­do o definido por componente. |
| `--success` | Token leÃ­do o definido por componente. |
| `--iswc-success` | Token leÃ­do o definido por componente. |
| `--danger` | Token leÃ­do o definido por componente. |
| `--iswc-danger` | Token leÃ­do o definido por componente. |
| `--warning` | Token leÃ­do o definido por componente. |
| `--iswc-warning` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-stat> â€” Stat / KPI Card (vanilla, zero dependencies).
> Bloque para KPI en dashboards: label, nÃºmero principal, helper text,
> cambio/trend opcional e icono.
>   <iswc-stat label="Ingresos" value="â‚¬ 1.249,00" helper="vs mes anterior" trend="+12.5"></iswc-stat>
> Atributos
>   label       string
>   value       string (texto del nÃºmero principal; admite formato HTML)
>   helper      string
>   trend       string (e.g. "+12.5%" o "-3.2%")
>   trend-direction up | down | flat   (auto-detect si trend empieza con + o -)
>   icon        string (iconify id)
>   color     brand | neutral | success | warning | danger (default 'brand')
> Slots
>   label       override del label
>   value       override del valor
>   helper      override del helper
>   trend       override del trend
>   icon        override del icono
> CSS Parts
>   ::part(base) ::part(label) ::part(value) ::part(helper) ::part(trend) ::part(icon)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-stat>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`.

## Ejemplo avanzado

```html
<iswc-stat
label="Ingresos"
value="â‚¬ 1.249,00"
helper="vs mes anterior"
trend="+12.5%"
icon="mdi:cash-multiple"
></iswc-stat>
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

- [JavaScript](./stat.ts)
- [CSS](./stat.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./stat.json)
