---
tag: iswc-popconfirm
tags:
  - iswc-popconfirm
category: feedback
status: public
source: ./popconfirm.ts
style: ./popconfirm.css
preview: ./popconfirm.json
---
# `<iswc-popconfirm>`

## PropÃ³sito

Cuadro de confirmaciÃ³n rÃ¡pido anclado a un botÃ³n. Sin modal, sin tapar
la pantalla. Perfecto para "Â¿Seguro que quieres borrar?" en lÃ­nea.

Este mÃ³dulo registra `<iswc-popconfirm>`.

## CuÃ¡ndo usarlo

Estado, progreso, confirmaciÃ³n, carga o resultado de operaciones.

## CuÃ¡ndo no usarlo

No saturar interfaz con seÃ±ales redundantes o alertas sin acciÃ³n.

## ImportaciÃ³n

```js
import './popconfirm.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-button id="btnDelete">Borrar</iswc-button>
<iswc-popconfirm for="btnDelete" message="Â¿Seguro?">
<iswc-button slot="confirm" color="danger">SÃ­, borrar</iswc-button>
<iswc-button slot="cancel">Cancelar</iswc-button>
</iswc-popconfirm>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `for` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `message` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `placement` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `hide-arrow` | boolean | Fuente define default/restricciÃ³n. |
| `open` | boolean | Fuente define default/restricciÃ³n. |
| `without-backdrop` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `placement` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `message` | Contenido proyectado. |
| `cancel` | Contenido proyectado. |
| `confirm` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-popconfirm-show` | Evento personalizado del componente (popconfirm show). |
| `iswc-popconfirm-hide` | Evento personalizado del componente (popconfirm hide). |
| `iswc-popconfirm-confirm` | Evento personalizado del componente (popconfirm confirm). |
| `iswc-popconfirm-cancel` | Evento personalizado del componente (popconfirm cancel). |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-popconfirm-show` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-popconfirm-hide` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-popconfirm-confirm` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-popconfirm-cancel` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-popconfirm');
el.addEventListener('iswc-popconfirm-show', (e) => {
  console.log('iswc-popconfirm-show', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `show()` | MÃ©todo pÃºblico declarado. |
| `hide()` | MÃ©todo pÃºblico declarado. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `arrow` | Personalizable con `::part(arrow)`. |
| `message` | Personalizable con `::part(message)`. |
| `actions` | Personalizable con `::part(actions)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-bg-elev` | Fondo del panel (vÃ­a `--bg`). |
| `--iswc-text` | Color de texto (vÃ­a `--fg`). |
| `--iswc-border` | Borde del panel (vÃ­a `--border`). |
| `--iswc-brand` | Color de marca (vÃ­a `--brand`). |
| `--iswc-brand-fg` | Texto sobre el color de marca (vÃ­a `--brand-fg`). |
| `--iswc-danger` | Tono destructivo (vÃ­a `--danger`). |

Los botones por defecto de los slots `confirm` / `cancel` son `<iswc-button>`:
su color y apariencia se controlan desde el propio botÃ³n, no desde aquÃ­.

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-popconfirm> â€” Web Component (vanilla, zero dependencies).
> Cuadro de confirmaciÃ³n emergente anclado a un disparador. Sin modal de fondo.
>   <iswc-button id="trigger">Borrar</iswc-button>
>   <iswc-popconfirm for="trigger" message="Â¿Seguro?">
>     <iswc-button slot="confirm" color="danger">SÃ­</iswc-button>
>     <iswc-button slot="cancel">No</iswc-button>
>   </iswc-popconfirm>
> Atributos
>   for          string â€” id del trigger element.
>   message      string â€” texto principal.
>   placement    top | bottom | start | end | top-start | top-end | bottom-start | bottom-end (default 'top')
>   hide-arrow   boolean
>   open         boolean â€” controlado.
>   without-backdrop boolean
> Slots
>   confirm â€” slot del botÃ³n de confirmaciÃ³n.
>   cancel  â€” slot del botÃ³n de cancelar.
> Eventos
>   iswc-popconfirm-show  detail: { trigger }
>   iswc-popconfirm-hide  detail: { trigger }
>   iswc-popconfirm-confirm detail: { trigger }
>   iswc-popconfirm-cancel detail: { trigger }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)

Tags del mÃ³dulo: `<iswc-popconfirm>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-modal`.

## Ejemplo avanzado

```html
<iswc-button id="btnDelete">Borrar</iswc-button>
<iswc-popconfirm for="btnDelete" message="Â¿Seguro?">
<iswc-button slot="confirm" color="danger">SÃ­, borrar</iswc-button>
<iswc-button slot="cancel">Cancelar</iswc-button>
</iswc-popconfirm>
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

- [JavaScript](./popconfirm.ts)
- [CSS](./popconfirm.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./popconfirm.json)
