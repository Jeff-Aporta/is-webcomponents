---
tag: iswc-toast-item
tags:
  - iswc-toast-item
category: feedback
status: public
source: ./toast-item.ts
style: ./toast-item.css
preview: ./toast-item.json
---
# `<iswc-toast-item>`

## PropÃ³sito

Un toast individual: la tarjeta que muestra el mensaje, su icono opcional, el
botÃ³n de cerrar y la barra de countdown que se agota hasta auto-ocultarse
(pausa al pasar el ratÃ³n o al enfocar dentro).

Es la pieza que apila `<iswc-toast>`; normalmente no se instancia a mano, pero
puede declararse suelto cuando se quiere un aviso fijo en una zona concreta.
No tiene `create()` â€” eso vive en `<iswc-toast>` (ver [toast.md](./toast.md)).

Este mÃ³dulo registra `<iswc-toast-item>`.

## CuÃ¡ndo usarlo

Estado, progreso, confirmaciÃ³n, carga o resultado de operaciones.

## CuÃ¡ndo no usarlo

No saturar interfaz con seÃ±ales redundantes o alertas sin acciÃ³n.

## ImportaciÃ³n

```js
import './toast-item.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-toast-item></iswc-toast-item>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `color` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `duration` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `open` | boolean | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `color` | lectura/escritura | Declarada por clase. |
| `duration` | lectura/escritura | Declarada por clase. |
| `open` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | TÃ­tulo. |
| `icon` | Contenido proyectado. |
| `start` | Contenido proyectado. |
| `caption` | Texto menor bajo el tÃ­tulo. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-after-show` | Emitido tras finalizar la animaciÃ³n de apertura. |
| `iswc-after-hide` | Emitido tras finalizar la animaciÃ³n de cierre. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-after-show` | `{ color, message, caption, log }` | sÃ­ | sÃ­ | no |
| `iswc-after-hide` | no | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-toast-item');
el.addEventListener('iswc-after-show', (e) => {
  console.log('iswc-after-show', e.detail);
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
| `icon` | Personalizable con `::part(icon)`. |
| `message` | Personalizable con `::part(message)`. |
| `title` | Personalizable con `::part(title)`. |
| `caption` | Personalizable con `::part(caption)`. |
| `close-button` | Personalizable con `::part(close-button)`. |
| `progress` | Personalizable con `::part(progress)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--_bg` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg` | Token leÃ­do o definido por componente. |
| `--_border` | Token leÃ­do o definido por componente. |
| `--iswc-control-border` | Token leÃ­do o definido por componente. |
| `--_text` | Token leÃ­do o definido por componente. |
| `--iswc-control-text` | Token leÃ­do o definido por componente. |
| `--_accent` | Token leÃ­do o definido por componente. |
| `--iswc-muted` | Token leÃ­do o definido por componente. |
| `--iswc-font-family` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-50` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-brand-700` | Token leÃ­do o definido por componente. |
| `--iswc-color-success-50` | Token leÃ­do o definido por componente. |
| `--iswc-color-success-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-success-700` | Token leÃ­do o definido por componente. |
| `--iswc-color-warning-50` | Token leÃ­do o definido por componente. |
| `--iswc-color-warning-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-warning-700` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-50` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-500` | Token leÃ­do o definido por componente. |
| `--iswc-color-danger-700` | Token leÃ­do o definido por componente. |
| `--iswc-focus` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-toast-item> â€” Web Component (vanilla).
> Ãtem individual de toast con countdown y cierre.
> Atributos
>   color   brand | success | warning | danger | neutral (default brand)
>   duration  number ms (default 5000; 0 = hasta dismiss). Reflect.
>   open      boolean â€” visible
> Slots: default (tÃ­tulo), caption, icon | start
> MÃ©todos: show(), hide()
> Eventos (bubbles, composed): iswc-after-show { color, message, caption, log }, iswc-after-hide
> CSS Parts: ::part(base) ::part(icon) ::part(message) ::part(title) ::part(caption) ::part(close-button) ::part(progress)

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)

Tags del mÃ³dulo: `<iswc-toast-item>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-live`, `aria-label`, `aria-hidden`.

## Ejemplo avanzado

```html
<iswc-toast-item></iswc-toast-item>
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

- [JavaScript](./toast-item.ts)
- [CSS](./toast-item.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./toast-item.json)
