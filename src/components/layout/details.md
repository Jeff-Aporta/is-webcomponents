---
tag: iswc-details
tags:
  - iswc-details
category: layout
status: public
source: ./details.ts
style: ./details.css
preview: ./details.json
---
# `<iswc-details>`

## PropÃ³sito

Disclosure colapsable: muestra un resumen y, al expandir, el contenido. Equivalente
accesible al <details> nativo, con apariencias,
iconos, animaciones y comportamiento de accordion opcional.

Este mÃ³dulo registra `<iswc-details>`.

## CuÃ¡ndo usarlo

Estructura, superficies, overlays y navegaciÃ³n por regiones de contenido.

## CuÃ¡ndo no usarlo

No crear size colors; escalar mediante font-size contextual y em.

## ImportaciÃ³n

```js
import './details.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-details summary="Â¿QuÃ© es InSoft?">
InSoft es un ERP modularâ€¦
</iswc-details>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `open` | boolean | Fuente define default/restricciÃ³n. |
| `summary` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `name` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `disabled` | boolean | Fuente define default/restricciÃ³n. |
| `variant` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `icon-placement` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `open` | lectura/escritura | Declarada por clase. |
| `summary` | lectura/escritura | Declarada por clase. |
| `name` | lectura/escritura | Declarada por clase. |
| `disabled` | lectura/escritura | Declarada por clase. |
| `variant` | lectura/escritura | Declarada por clase. |
| `iconPlacement` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `summary` | Contenido proyectado. |
| `expand-icon` | Contenido proyectado. |
| `default` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-show` | Emitido justo antes de mostrarse (cancelable). |
| `iswc-after-show` | Emitido tras finalizar la animaciÃ³n de apertura. |
| `iswc-hide` | Emitido justo antes de ocultarse (cancelable). |
| `iswc-after-hide` | Emitido tras finalizar la animaciÃ³n de cierre. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-show` | segÃºn cabecera | segÃºn cabecera | segÃºn cabecera | segÃºn cabecera |
| `iswc-after-show` | segÃºn cabecera | segÃºn cabecera | segÃºn cabecera | segÃºn cabecera |
| `iswc-hide` | segÃºn cabecera | segÃºn cabecera | segÃºn cabecera | segÃºn cabecera |
| `iswc-after-hide` | segÃºn cabecera | segÃºn cabecera | segÃºn cabecera | segÃºn cabecera |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-details');
el.addEventListener('iswc-show', (e) => {
  console.log('iswc-show', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `show()` | MÃ©todo pÃºblico declarado. |
| `hide()` | MÃ©todo pÃºblico declarado. |
| `toggle()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `header` | Personalizable con `::part(header)`. |
| `summary` | Personalizable con `::part(summary)`. |
| `icon` | Personalizable con `::part(icon)`. |
| `content` | Personalizable con `::part(content)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--spacing` | Token leÃ­do o definido por componente. |
| `--show-duration` | Token leÃ­do o definido por componente. |
| `--hide-duration` | Token leÃ­do o definido por componente. |
| `--iswc-space-m` | Token leÃ­do o definido por componente. |
| `--_bg` | Token leÃ­do o definido por componente. |
| `--iswc-bg-elev` | Token leÃ­do o definido por componente. |
| `--_border` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--_text` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--_header-bg` | Token leÃ­do o definido por componente. |
| `--_header-bg-hover` | Token leÃ­do o definido por componente. |
| `--iswc-font-family` | Token leÃ­do o definido por componente. |
| `--iswc-radius` | Token leÃ­do o definido por componente. |
| `--iswc-focus` | Token leÃ­do o definido por componente. |
| `--iswc-text-muted` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-details> â€” Web Component (vanilla, zero dependencies).
> Disclosure colapsable: muestra un resumen y, al expandir, el contenido.
> Equivalente a wa-details / <details>.
> Atributos
>   open             boolean â€” si estÃ¡ expandido (reflected)
>   summary          string  â€” texto del summary si no se usa el slot
>   name             string  â€” grupo accordion: si dos <iswc-details> comparten
>                             `name`, abrir uno cierra el resto
>   disabled         boolean
>   variant       filled | outlined | filled-outlined | plain
>                    (default 'outlined', reflected)
>   icon-placement   start | end
>                    (default 'end', reflected)
> Slots
>   (default)         contenido principal
>   summary           summary propio (gana sobre el atributo summary)
>   expand-icon       icono de expandido
>   collapse-icon     icono de colapsado
> MÃ©todos
>   show() / hide() / toggle()
> Eventos
>   iswc-show       detail: {} â€” antes de abrir (cancelable)
>   iswc-after-show detail: {} â€” tras la animaciÃ³n de apertura
>   iswc-hide       detail: {} â€” antes de cerrar (cancelable)
>   iswc-after-hide detail: {} â€” tras la animaciÃ³n de cierre
> CSS Parts: ::part(base) ::part(header) ::part(summary) ::part(icon) ::part(content)
> CSS custom properties
>   --spacing          espacio del header/contenido
>   --show-duration    duraciÃ³n de la animaciÃ³n de apertura
>   --hide-duration    duraciÃ³n de la animaciÃ³n de cierre

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-details>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-expanded`, `aria-hidden`, `aria-disabled`.

## Ejemplo avanzado

```html
<iswc-details variant="filled" summary="â€¦">â€¦</iswc-details>
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

- [JavaScript](./details.ts)
- [CSS](./details.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./details.json)
