---
tag: iswc-fab
tags:
  - iswc-fab
category: actions
status: public
source: ./fab.ts
style: ./fab.css
preview: ./fab.json
---
# `<iswc-fab>`

## PropÃ³sito

Floating Action Button: botÃ³n circular principal que se posiciona de
forma fija en la ventana. Soporta colores, tamaÃ±os, etiquetas
extendidas, pulso de atenciÃ³n y posicionamiento en cualquier esquina.

Este mÃ³dulo registra `<iswc-fab>`.

## CuÃ¡ndo usarlo

Acciones, selecciÃ³n de comandos y menÃºs interactivos.

## CuÃ¡ndo no usarlo

No usar como decoraciÃ³n ni reemplazar enlaces semÃ¡nticos para navegaciÃ³n simple.

## ImportaciÃ³n

```js
import './fab.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-fab icon="mdi:plus" label="Crear"></iswc-fab>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `icon` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `position` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `color` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `href` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `pulse` | boolean | Fuente define default/restricciÃ³n. |
| `extended` | boolean | Fuente define default/restricciÃ³n. |
| `without-shadow` | boolean | Fuente define default/restricciÃ³n. |
| `label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `position` | lectura/escritura | Declarada por clase. |
| `color` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `icon` | Contenido proyectado. |
| `default` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-fab-click` | Evento personalizado del componente (fab click). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-fab-click` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-fab');
el.addEventListener('iswc-fab-click', (e) => {
  console.log('iswc-fab-click', e.detail);
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
| `icon` | Personalizable con `::part(icon)`. |
| `label` | Personalizable con `::part(label)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--size` | DiÃ¡metro del botÃ³n (default `3.5em`). Escala con el `font-size` del host. |
| `--fab-shadow` | Sombra flotante. |
| `--iswc-brand` | Color de marca usado por el pulso de atenciÃ³n. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-fab> â€” Floating Action Button (vanilla, zero dependencies).
> BotÃ³n flotante de acciÃ³n principal. Material-like.
>   <iswc-fab icon="mdi:plus" position="bottom-end">Crear</iswc-fab>
> EstÃ¡ construido SOBRE <iswc-button>: el color, el foco y la conversiÃ³n a <a>
> cuando hay `href` los pone el botÃ³n. iswc-fab aÃ±ade solo lo suyo: anclaje fijo
> a una esquina, forma circular, sombra flotante y pulso.
> Atributos
>   icon        string  â€” iconify id del icono principal.
>   position    bottom-end | bottom-start | top-end | top-start | inline (default 'bottom-end')
>   color       brand | neutral | success | warning | danger (default 'brand')
>   href        string â€” si se define, renderiza <a>.
>   pulse       boolean â€” animaciÃ³n de pulso para llamar la atenciÃ³n.
>   extended    boolean â€” ancho extendido con label.
>   without-shadow boolean
>   label       string â€” texto accesible (y label extendido).
> Slots
>   (default)    contenido / label (si extended).
>   icon         override del icono.
> Eventos
>   iswc-fab-click  detail: { originalEvent }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./button.js`](./button.js) â€” el fab se apoya en `<iswc-button>` para la
  apariencia, el color y el modo enlace.

Tags del mÃ³dulo: `<iswc-fab>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`, `aria-label`.

## Ejemplo avanzado

```html
<iswc-fab icon="mdi:plus" label="Crear"></iswc-fab>
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

- [JavaScript](./fab.ts)
- [CSS](./fab.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./fab.json)
