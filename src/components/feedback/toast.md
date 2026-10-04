---
tag: iswc-toast
tags:
  - iswc-toast
category: feedback
status: public
source: ./toast.ts
style: ./toast.css
preview: ./toast.json
---
# `<iswc-toast>`

## PropÃ³sito

Contenedor fijo de notificaciones. Crea Ã­tems con create() o declara <iswc-toast-item>.

Este mÃ³dulo registra `<iswc-toast>`.

## CuÃ¡ndo usarlo

Estado, progreso, confirmaciÃ³n, carga o resultado de operaciones.

## CuÃ¡ndo no usarlo

No saturar interfaz con seÃ±ales redundantes o alertas sin acciÃ³n.

## ImportaciÃ³n

```js
import './toast.js';
```

## Ejemplo mÃ­nimo

```html
<iswc-toast></iswc-toast>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `placement` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `placement` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos


| Evento | DescripciÃ³n |
| --- | --- |

No expone.


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-toast');
el.addEventListener('click', (e) => {
  console.log('click', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

| MÃ©todo | Uso |
| --- | --- |
| `create(message, options?)` | Crea y muestra un `<iswc-toast-item>`. |
| `promise(p, callbacks?)` | Reusa un solo toast para loading / success / error. |
| `IswcToast.host()` | EstÃ¡tico: `<iswc-toast>` singleton del documento (lo crea si falta). |
| `IswcToast.error(msg, duration?)` | EstÃ¡tico. Paridad con `toastError` de ISP. |
| `IswcToast.success(msg, duration?)` | EstÃ¡tico. Paridad con `toastSuccess`. |
| `IswcToast.loading(msg)` | EstÃ¡tico. Paridad con `toastLoading`. |
| `IswcToast.remove(item)` | EstÃ¡tico. Paridad con `toastRemove`. |
| `IswcToast.promise(p, callbacks?)` | EstÃ¡tico. Paridad con `toastPromise`. |

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `stack` | Personalizable con `::part(stack)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-font-family` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-toast> â€” Web Component (vanilla).
> Contenedor fijo de toasts. Los Ã­tems son <iswc-toast-item> en light DOM
> (proyecciÃ³n al stack) o creados vÃ­a create().
> Atributos
>   placement  top-start | top-center | top-end |
>              bottom-start | bottom-center | bottom-end  (default bottom-end)
> MÃ©todos
>   create(message, options?) â†’ Promise<iswc-toast-item>
>     options: { color, icon, duration, allowHtml, caption, log } â€” sin size
>     color: brand | success | warning | danger | neutral
>     duration default 5000; 0 = hasta dismiss
>     caption: detalle bajo el tÃ­tulo; log: payload de iswc-after-show (consola)
> CSS Parts: ::part(stack)
> Escucha iswc-after-hide de los Ã­tems y los elimina del DOM.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./toast-item.js`](./toast-item.js)

Tags del mÃ³dulo: `<iswc-toast>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-hidden`.

## Ejemplo avanzado

```html
<iswc-toast></iswc-toast>
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

- [JavaScript](./toast.ts)
- [CSS](./toast.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./toast.json)
