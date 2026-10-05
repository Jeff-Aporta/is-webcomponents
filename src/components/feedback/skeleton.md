---
tag: iswc-skeleton
tags:
  - iswc-skeleton
category: feedback
status: public
source: ./skeleton.ts
style: ./skeleton.css
preview: ./skeleton.json
---
# `<iswc-skeleton>`

## PropÃ³sito

<iswc-skeleton>

Este mÃ³dulo registra `<iswc-skeleton>`.

## CuÃ¡ndo usarlo

Estado, progreso, confirmaciÃ³n, carga o resultado de operaciones.

## CuÃ¡ndo no usarlo

No saturar interfaz con seÃ±ales redundantes o alertas sin acciÃ³n.

## ImportaciÃ³n

```js
import './skeleton.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-skeleton effect="sheen" style="height:1rem"></iswc-skeleton>
<iswc-skeleton effect="pulse" style="height:1rem"></iswc-skeleton>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `effect` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

No expone.

### Slots

No expone.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-skeleton');
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
| `indicator` | Personalizable con `::part(indicator)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--color` | Token leÃ­do o definido por componente. |
| `--sheen-color` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-skeleton> â€” Web Component (vanilla).
> Placeholder de carga.
> Atributos
>   effect  none | sheen | pulse (default sheen)
> CSS Parts: ::part(indicator)
> CSS vars: --color, --sheen-color

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-skeleton>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`.

## Ejemplo avanzado

```html
<iswc-skeleton effect="sheen" style="height:1rem"></iswc-skeleton>
<iswc-skeleton effect="pulse" style="height:1rem"></iswc-skeleton>
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

- [JavaScript](./skeleton.ts)
- [CSS](./skeleton.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./skeleton.json)
