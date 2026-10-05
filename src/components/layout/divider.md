---
tag: iswc-divider
tags:
  - iswc-divider
category: layout
status: public
source: ./divider.ts
style: ./divider.css
preview: ./divider.json
---
# `<iswc-divider>`

## PropÃ³sito

Separador horizontal o vertical. Opacidad default 20; color vÃ­a tokens del theme.

Este mÃ³dulo registra `<iswc-divider>`.

## CuÃ¡ndo usarlo

Estructura, superficies, overlays y navegaciÃ³n por regiones de contenido.

## CuÃ¡ndo no usarlo

No crear size colors; escalar mediante font-size contextual y em.

## ImportaciÃ³n

```js
import './divider.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-divider></iswc-divider>
<iswc-divider opacity="80" color="brand"></iswc-divider>
<iswc-divider orientation="vertical" color="accent"></iswc-divider>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `orientation` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `opacity` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `color` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `orientation` | lectura/escritura | Declarada por clase. |
| `opacity` | lectura/escritura | Declarada por clase. |
| `color` | lectura/escritura | Declarada por clase. |

### Slots

No expone.

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-divider');
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
| `divider` | Personalizable con `::part(divider)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--color` | Token leÃ­do o definido por componente. |
| `--opacity` | Token leÃ­do o definido por componente. |
| `--width` | Token leÃ­do o definido por componente. |
| `--spacing` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-text-soft` | Token leÃ­do o definido por componente. |
| `--iswc-text-dim` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--iswc-control-border` | Token leÃ­do o definido por componente. |
| `--iswc-accent` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-success-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-warning-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-500` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-divider> â€” Web Component (vanilla).
> Separador visual horizontal o vertical.
> Atributos
>   orientation  horizontal | vertical (default horizontal)
>   opacity      0â€“100 (default 20)
>   color        text | text-soft | text-dim | border | control | brand | accent |
>                success | warning | danger (default text)
> role=separator + aria-orientation en el host
> CSS vars: --color, --opacity, --width, --spacing

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-divider>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-orientation`, `aria-hidden`.

## Ejemplo avanzado

```html
<iswc-divider></iswc-divider>
<iswc-divider opacity="80" color="brand"></iswc-divider>
<iswc-divider orientation="vertical" color="accent"></iswc-divider>
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

- [JavaScript](./divider.ts)
- [CSS](./divider.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./divider.json)
