---
tag: iswc-card
tags:
  - iswc-card
category: layout
status: public
source: ./card.ts
style: ./card.css
preview: ./card.json
---
# `<iswc-card>`

## PropÃ³sito

Contenedor flexible con slots para media, header,
body, footer y actions.
Cinco apariencias y dos orientaciones. JavaScript nativo, Shadow DOM, sin frameworks.

Este mÃ³dulo registra `<iswc-card>`.

## CuÃ¡ndo usarlo

Estructura, superficies, overlays y navegaciÃ³n por regiones de contenido.

## CuÃ¡ndo no usarlo

No crear size colors; escalar mediante font-size contextual y em.

## ImportaciÃ³n

```js
import './card.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-card>Hola mundo</iswc-card>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `variant` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `orientation` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `variant` | lectura/escritura | Declarada por clase. |
| `orientation` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `media` | Contenido proyectado. |
| `header` | Contenido proyectado. |
| `header-actions` | Contenido proyectado. |
| `default` | Contenido proyectado. |
| `footer` | Contenido proyectado. |
| `footer-actions` | Contenido proyectado. |
| `actions` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-card');
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
| `media` | Personalizable con `::part(media)`. |
| `header` | Personalizable con `::part(header)`. |
| `body` | Personalizable con `::part(body)`. |
| `footer` | Personalizable con `::part(footer)`. |
| `actions` | Personalizable con `::part(actions)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--spacing` | Token leÃ­do o definido por componente. |
| `--iswc-space-l` | Token leÃ­do o definido por componente. |
| `--card-bg` | Token leÃ­do o definido por componente. |
| `--card-border` | Token leÃ­do o definido por componente. |
| `--iswc-radius` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-sans` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--iswc-bg-elev` | Token leÃ­do o definido por componente. |
| `--iswc-accent-bg` | Token leÃ­do o definido por componente. |
| `--iswc-accent` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-card> â€” Web Component (vanilla, zero dependencies).
> Define el custom element `iswc-card` automÃ¡ticamente al importarse.
> Usa Shadow DOM con CSS propio, sin frameworks.
> Atributos
>   variant    accent | filled | outlined | filled-outlined | plain
>                 (default 'outlined', reflected)
>   orientation   horizontal | vertical
>                 (default 'vertical', reflected)
> Slots
>   (default)        cuerpo principal (body, requerido)
>   media            secciÃ³n de medios (vertical: top; horizontal: start)
>   header           encabezado (vertical only)
>   footer           pie (vertical only)
>   actions          acciones (horizontal: end)
>   header-actions   acciones dentro del header (vertical only)
>   footer-actions   acciones dentro del footer (vertical only)
> CSS Parts:  ::part(media) ::part(header) ::part(body) ::part(footer) ::part(actions)
> CSS custom properties
>   --spacing     padding/gap entre secciones (default var(--iswc-space-l, 1rem))
> Layout:
>   vertical  â†’ media â†’ header â†’ body â†’ footer  (column)
>   horizontalâ†’ media | body | actions           (row, body grows)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-card>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: ninguno explÃ­cito en fuente.

## Ejemplo avanzado

```html
<iswc-card variant="accent">...</iswc-card>
<iswc-card variant="filled-outlined">...</iswc-card>
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

- [JavaScript](./card.ts)
- [CSS](./card.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./card.json)
