---
tag: iswc-sparkline
tags:
  - iswc-sparkline
category: charts
status: public
source: ./sparkline.ts
style: ./sparkline.css
preview: ./sparkline.json
---
# `<iswc-sparkline>`

## PropÃ³sito

<iswc-sparkline>

Este mÃ³dulo registra `<iswc-sparkline>`.

## CuÃ¡ndo usarlo

Series, distribuciones, relaciones o jerarquÃ­as de datos.

## CuÃ¡ndo no usarlo

No crear otro engine si marks/engine existentes cubren caso.

## ImportaciÃ³n

```js
import './sparkline.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-sparkline data="3 5 4 8 6 9 7 10" label="Ventas"></iswc-sparkline>
<iswc-sparkline type="bar" data="2 1 3 2 4 1 2" label="Errores"></iswc-sparkline>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `values` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `data` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `type` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `variant` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `curve` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `trend` | `positive \| negative \| neutral` (sin atributo = color de acento de marca) | Controla `--line-color`/`--border-color-1`/`--fill-color-1` vÃ­a tokens de estado (`--iswc-success-text`, `--iswc-danger-text`, `--iswc-text-dim`). |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `data` | lectura/escritura | Declarada por clase. |

### Slots

No expone.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-sparkline');
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
| `sparkline` | Personalizable con `::part(sparkline)`. |
| `canvas` | Personalizable con `::part(canvas)`. |
| `sr-status` | Region `aria-live` para anuncios a lectores de pantalla (oculta visualmente). |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--line-color` | Token leÃ­do o definido por componente. |
| `--fill-color-1` | Token leÃ­do o definido por componente. |
| `--line-width` | Token leÃ­do o definido por componente. |
| `--iswc-accent` | Token leÃ­do o definido por componente. |
| `--border-color-1` | Token leÃ­do o definido por componente. |
| `--iswc-success-text` | Token leÃ­do o definido por componente. |
| `--iswc-danger-text` | Token leÃ­do o definido por componente. |
| `--iswc-text-dim` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> Contrato derivado de fuente y preview actuales.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/svg-chart-engine.js`](../_shared/svg-chart-engine.js)

Tags del mÃ³dulo: `<iswc-sparkline>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explÃ­cito en fuente.

## Ejemplo avanzado

```html
<iswc-sparkline variant="solid" data="â€¦"></iswc-sparkline>
<iswc-sparkline variant="gradient" data="â€¦"></iswc-sparkline>
<iswc-sparkline variant="line" data="â€¦"></iswc-sparkline>
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

- [JavaScript](./sparkline.ts)
- [CSS](./sparkline.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./sparkline.json)
