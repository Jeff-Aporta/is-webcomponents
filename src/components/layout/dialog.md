---
tag: iswc-dialog
tags:
  - iswc-dialog
category: layout
status: public
source: ./dialog.ts
style: ./dialog.css
preview: ./dialog.json
---
# `<iswc-dialog>`

## PropÃ³sito

Modal accesible que requiere la atenciÃ³n inmediata del usuario. Equivalente
a <dialog> nativo, con header, footer, animaciones,
light-dismiss y API declarativa data-dialog="close".

Este mÃ³dulo registra `<iswc-dialog>`.

## CuÃ¡ndo usarlo

Estructura, superficies, overlays y navegaciÃ³n por regiones de contenido.

## CuÃ¡ndo no usarlo

No crear size colors; escalar mediante font-size contextual y em.

## ImportaciÃ³n

```js
import './dialog.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-button onclick="document.getElementById('dlg').open = true">Abrir</iswc-button>
<iswc-dialog id="dlg" label="TÃ­tulo">
Contenido.
<div slot="footer">
<iswc-button data-dialog="close">Cancelar</iswc-button>
</div>
</iswc-dialog>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `open` | boolean | Fuente define default/restricciÃ³n. |
| `label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `without-header` | boolean | Fuente define default/restricciÃ³n. |
| `light-dismiss` | boolean | Fuente define default/restricciÃ³n. |
| `backdrop-variant` | `none` \| `basic` | Default `none` (sin oscuridad ni blur). `basic` = oscuridad + blur. Otros looks vÃ­a style/class. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `open` | lectura/escritura | Declarada por clase. |
| `label` | lectura/escritura | Declarada por clase. |
| `withoutHeader` | lectura/escritura | Declarada por clase. |
| `lightDismiss` | lectura/escritura | Declarada por clase. |
| `backdropVariant` | lectura/escritura | `none` \| `basic`. |

### Slots

| Slot | Uso |
| --- | --- |
| `label` | Contenido proyectado. |
| `header-actions` | Contenido proyectado. |
| `default` | Contenido proyectado. |
| `footer` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-hide` | Emitido justo antes de ocultarse (cancelable). |
| `iswc-show` | Emitido justo antes de mostrarse (cancelable). |
| `iswc-after-show` | Emitido tras finalizar la animaciÃ³n de apertura. |
| `iswc-after-hide` | Emitido tras finalizar la animaciÃ³n de cierre. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-hide` | sÃ­ | sÃ­ | sÃ­ | sÃ­ |
| `iswc-show` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-after-show` | sÃ­ | sÃ­ | sÃ­ | no |
| `iswc-after-hide` | sÃ­ | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-dialog');
el.addEventListener('iswc-hide', (e) => {
  console.log('iswc-hide', e.detail);
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
| `backdrop` | Personalizable con `::part(backdrop)`. |
| `dialog` | Personalizable con `::part(dialog)`. |
| `header` | Personalizable con `::part(header)`. |
| `title` | Personalizable con `::part(title)`. |
| `header-actions` | Personalizable con `::part(header-actions)`. |
| `close-button` | Personalizable con `::part(close-button)`. |
| `body` | Personalizable con `::part(body)`. |
| `footer` | Personalizable con `::part(footer)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--width` | Token leÃ­do o definido por componente. |
| `--spacing` | Token leÃ­do o definido por componente. |
| `--iswc-space-l` | Token leÃ­do o definido por componente. |
| `--show-duration` | Token leÃ­do o definido por componente. |
| `--hide-duration` | Token leÃ­do o definido por componente. |
| `--backdrop-color` | Token leÃ­do o definido por componente. |
| `--_radius` | Token leÃ­do o definido por componente. |
| `--iswc-radius` | Token leÃ­do o definido por componente. |
| `--_shadow` | Token leÃ­do o definido por componente. |
| `--iswc-bg` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-border` | Token leÃ­do o definido por componente. |
| `--iswc-font-family` | Token leÃ­do o definido por componente. |
| `--iswc-text-muted` | Token leÃ­do o definido por componente. |
| `--iswc-bg-elev` | Token leÃ­do o definido por componente. |
| `--iswc-focus` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-dialog> â€” Web Component (vanilla, zero dependencies).
> Modal sobre la pÃ¡gina que requiere atenciÃ³n inmediata del usuario. Equivalente
> accesible a <dialog> nativo + wa-dialog (Web Awesome).
> Atributos
>   open              boolean â€” si estÃ¡ abierto (reflected).
>   label             string  â€” tÃ­tulo en el header (a11y).
>   without-header    boolean â€” oculta el header y el botÃ³n de cerrar.
>   light-dismiss     boolean â€” cierra al hacer click fuera del diÃ¡logo.
> Slots
>   (default)        contenido principal (body).
>   label            header label propio (gana sobre el atributo label).
>   header-actions   acciones adicionales en el header.
>   footer           pie, normalmente con botones.
> MÃ©todos
>   show() / hide() / toggle()
> Eventos
>   iswc-show        detail: {} â€” antes de abrir.
>   iswc-after-show  detail: {} â€” tras la animaciÃ³n de apertura.
>   iswc-hide        detail: { source } â€” antes de cerrar (cancelable).
>                  source = null (Escape) | elemento que disparÃ³ el cierre.
>   iswc-after-hide  detail: {} â€” tras la animaciÃ³n de cierre.
> CSS Parts
>   dialog, header, title, close-button, header-actions, body, footer
> CSS custom properties
>   --width          ancho preferido (default 500px)
>   --spacing        padding interno (default var(--iswc-space-l, 1rem))
>   --show-duration  duraciÃ³n de la animaciÃ³n de apertura
>   --hide-duration  duraciÃ³n de la animaciÃ³n de cierre
>   --backdrop-color color del backdrop

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../_shared/modal-base.js`](../_shared/modal-base.js) â€” clase base con el ciclo
  completo del modal (focus-trap, `Escape`, backdrop light-dismiss, restore de foco,
  `data-*="close"`, eventos). AquÃ­ sÃ³lo queda el chrome y las animaciones.

Tags del mÃ³dulo: `<iswc-dialog>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-modal`, `aria-label`, `aria-hidden`.

## Ejemplo avanzado

```html
<iswc-dialog without-header>â€¦</iswc-dialog>
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

- [JavaScript](./dialog.ts)
- [CSS](./dialog.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./dialog.json)
