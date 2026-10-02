---
tag: iswc-toast
tags:
  - iswc-toast
category: feedback
status: public
source: ./toast.js
style: ./toast.css
preview: ./toast.json
---
# `<iswc-toast>`

## Propósito

Contenedor fijo de notificaciones. Crea ítems con create() o declara <iswc-toast-item>.

Este módulo registra `<iswc-toast>`.

## Cuándo usarlo

Estado, progreso, confirmación, carga o resultado de operaciones.

## Cuándo no usarlo

No saturar interfaz con señales redundantes o alertas sin acción.

## Importación

```js
import './toast.js';
```

## Ejemplo mínimo

```html
<iswc-toast></iswc-toast>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `placement` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `placement` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `default` | Contenido proyectado. |

### Eventos

No expone.

### Métodos y propiedades públicas

| Método | Uso |
| --- | --- |
| `create(message, options?)` | Crea y muestra un `<iswc-toast-item>`. |
| `promise(p, callbacks?)` | Reusa un solo toast para loading / success / error. |
| `IswcToast.host()` | Estático: `<iswc-toast>` singleton del documento (lo crea si falta). |
| `IswcToast.error(msg, duration?)` | Estático. Paridad con `toastError` de ISP. |
| `IswcToast.success(msg, duration?)` | Estático. Paridad con `toastSuccess`. |
| `IswcToast.loading(msg)` | Estático. Paridad con `toastLoading`. |
| `IswcToast.remove(item)` | Estático. Paridad con `toastRemove`. |
| `IswcToast.promise(p, callbacks?)` | Estático. Paridad con `toastPromise`. |

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `stack` | Personalizable con `::part(stack)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--iswc-font-family` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <iswc-toast> — Web Component (vanilla).
> Contenedor fijo de toasts. Los ítems son <iswc-toast-item> en light DOM
> (proyección al stack) o creados vía create().
> Atributos
>   placement  top-start | top-center | top-end |
>              bottom-start | bottom-center | bottom-end  (default bottom-end)
> Métodos
>   create(message, options?) → Promise<iswc-toast-item>
>     options: { color, icon, duration, allowHtml, caption, log } — sin size
>     color: brand | success | warning | danger | neutral
>     duration default 5000; 0 = hasta dismiss
>     caption: detalle bajo el título; log: payload de iswc-after-show (consola)
> CSS Parts: ::part(stack)
> Escucha iswc-after-hide de los ítems y los elimina del DOM.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./toast-item.js`](./toast-item.js)

Tags del módulo: `<iswc-toast>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-hidden`.

## Ejemplo avanzado

```html
<iswc-toast></iswc-toast>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size color; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./toast.js)
- [CSS](./toast.css)
- [Índice de categoría](./LLM.md)
- [Preview](./toast.json)
