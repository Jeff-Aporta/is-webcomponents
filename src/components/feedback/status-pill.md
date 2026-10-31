---
tag: iswc-status-pill
tags:
  - iswc-status-pill
category: feedback
status: public
source: ./status-pill.ts
style: ./status-pill.scss
preview: ./status-pill.json
---
# `<iswc-status-pill>`

## Propósito

Pastilla de una línea para un paso de un proceso: spinner o ícono, la frase y el rótulo del estado. Varias apiladas forman un feed de pasos en paralelo.

## Cuándo usarlo

- Feed de pasos de un proceso largo.

## Cuándo no usarlo

- Una etiqueta fija: `iswc-tag`.
- Un conteo: `iswc-badge`.

## Importación

```js
import './status-pill.js';
```

## Ejemplo mínimo

```html
<iswc-status-pill text="Consultando documentos" status="pending"></iswc-status-pill>
```

## API

### Atributos y propiedades

Los datos van por atributos o por `el.props = { … }` (se mezcla con lo anterior y solo repinta si algo cambió). Un arreglo o un objeto va como JSON en el atributo; las funciones, solo por `props`.

| Atributo / prop | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `text` | string | "" | Frase del paso. |
| `status` | `pending` \| `done` \| `error` | `pending` | Estado. |
| `ts` | string | "" | Marca de tiempo; va en el `title`. |
| `icon` | string | "" | Ícono de `done` y `error`. |
| `pending-label` | string | `en curso` | Rótulo. |
| `done-label` | string | `listo` | Rótulo. |
| `error-label` | string | `error` | Rótulo. |

### Slots

No tiene slots.

### Eventos

No emite eventos propios.

### Métodos y propiedades públicas

`props`: las claves de la tabla anterior, en camelCase.

### CSS parts

| Part | Elemento |
| --- | --- |
| `pill` | Contenedor. |
| `marca` | Spinner o ícono. |
| `texto` | La frase. |
| `estado` | El rótulo. |

### Custom states

No expone custom states.

### CSS custom properties

No define custom properties propias: toma los tokens del tema.

### Integración con formularios

No participa en formularios.

## Anatomía

```html
<article part="pill">
  <span part="marca"><iswc-spinner></iswc-spinner></span><span part="texto">…</span><span part="estado">…</span>
</article>
```

## Comportamiento

- La frase larga se corta con elipsis; el `title` la conserva con el estado y la hora.

## Dependencias y componentes relacionados

Usa `iswc-spinner` e `iswc-icon`. Relacionado: `iswc-trace-log`.

## Accesibilidad

El estado también va como texto: no depende del color.

## Ejemplo avanzado

```html
<iswc-status-pill text="Consultando documentos" status="pending"></iswc-status-pill>
```

## Errores comunes

- Dar un `status` fuera de los tres valores: se ignora.

## Reglas para LLM

- Traduce tus pasos a `text` y `status`; el tag no conoce nombres de pasos.

## Fuentes

- [status-pill.ts](./status-pill.ts) · [status-pill.scss](./status-pill.scss) · [status-pill.json](./status-pill.json)
