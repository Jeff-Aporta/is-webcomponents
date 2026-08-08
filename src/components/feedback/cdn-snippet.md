---
tag: is-cdn-snippet
tags:
  - is-cdn-snippet
category: feedback
status: public
source: ./cdn-snippet.js
style: ./cdn-snippet.css
preview: ../../previews/feedback/is-cdn-snippet.json
---
# `<is-cdn-snippet>`

## Propósito

Panel de consumo por CDN organizado en dos tabs — **Enlaces** (snippets del
espejo activo) y **Mirrors** (selector de espejo + boot con fallback
encadenado) — más una sección de prompt/docs para agentes vía
`<is-md-editor>` (solo lectura, scroll, copiar, abrir diálogo). Sin npm/npx.
Tools: `/is-webcomponents:build|migrate|local` (ver `src/skills/is-webcomponents/`).

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

> <is-cdn-snippet> — panel CDN + mirrors + docs para agentes (sin npm/npx).
> Tabs
>   enlaces  · snippets del espejo activo (jsDelivr / Pages)
>   mirrors  · selector de espejo + boot con fallback encadenado
> Atributos
>   tag         string  · p. ej. "is-button"
>   category    string  · p. ej. "actions"
>   base        string  · override del CDN_BASE (opcional; ignora espejo)
>   title       string  · título del panel
>   dependencies / config · ver #parseDeps / #parseConfig
>   url-key     string · opt-in: tab Enlaces/Mirrors en `?s=`
> Dentro del tab "Enlaces" cada fila (CSS común, JS del componente, bundle de
> categoría, dependencias, bundle completo) tiene su <pre> y su botón "Copiar".
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
