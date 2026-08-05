---
tag: is-cdn-snippet
tags:
  - is-cdn-snippet
category: feedback
status: public
source: ./cdn-snippet.js
style: ./cdn-snippet.css
---
# `<is-cdn-snippet>`

## Propósito

Panel de consumo por CDN (jsDelivr) + prompt/docs para agentes. Sin npm/npx.

Este módulo registra `<is-cdn-snippet>`.

## Cuándo usarlo

Estado, progreso, confirmación, carga o resultado de operaciones.

## Cuándo no usarlo

No saturar interfaz con señales redundantes o alertas sin acción.

## Importación

```js
import './cdn-snippet.js';
```

## Ejemplo mínimo

```html
<is-cdn-snippet></is-cdn-snippet>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `tag` | string/según contrato | Fuente define default/restricción. |
| `category` | string/según contrato | Fuente define default/restricción. |
| `base` | string/según contrato | Fuente define default/restricción. |
| `title` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

No expone.

### Slots

No expone.

### Eventos

No expone.

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

No expone.

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-sans` | Token leído o definido por componente. |
| `--cdn-border` | Token leído o definido por componente. |
| `--is-border` | Token leído o definido por componente. |
| `--cdn-radius` | Token leído o definido por componente. |
| `--cdn-pre-bg` | Token leído o definido por componente. |
| `--is-bg-elev` | Token leído o definido por componente. |
| `--is-bg` | Token leído o definido por componente. |
| `--cdn-row-bg` | Token leído o definido por componente. |
| `--cdn-text-dim` | Token leído o definido por componente. |
| `--is-text-soft` | Token leído o definido por componente. |
| `--cdn-success` | Token leído o definido por componente. |
| `--is-color-success-500` | Token leído o definido por componente. |
| `--is-accent` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-mono` | Token leído o definido por componente. |
| `--is-control-bg` | Token leído o definido por componente. |
| `--is-control-text` | Token leído o definido por componente. |
| `--is-focus` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-cdn-snippet> — panel con los enlaces CDN de un componente.
> Atributos
>   tag         string  · p. ej. "is-button" (obligatorio)
>   category    string  · p. ej. "actions"   (obligatorio para el bundle de categoría)
>   base        string  · override del CDN_BASE (opcional)
>   title       string  · título del panel (default "Consumo por CDN")
> Pinta 3 filas: archivo individual, bundle de categoría, bundle global.
> Cada fila tiene su <pre> con el snippet y un botón "Copiar".
> Pensado para inyectarse al final de cada preview; el script de chrome
> (`preview-chrome.js`) lo crea automáticamente leyendo tag+category del
> `manifest.js` y el nombre del archivo actual.

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`../media/icon.js`](../media/icon.js)

Tags del módulo: `<is-cdn-snippet>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-hidden`.

## Ejemplo avanzado

```html
<is-cdn-snippet></is-cdn-snippet>
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

- [JavaScript](./cdn-snippet.js)
- [CSS](./cdn-snippet.css)
- [Índice de categoría](./LLM.md)
