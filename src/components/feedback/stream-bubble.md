---
tag: iswc-stream-bubble
tags:
  - iswc-stream-bubble
category: feedback
status: public
source: ./stream-bubble.ts
style: ./stream-bubble.css
preview: ./stream-bubble.json
---
# `<iswc-stream-bubble>`

## Propósito

Burbuja de una respuesta que llega por partes: estado, pasos previos, escritura letra a letra y markdown ligero. El texto se escapa antes de darle formato, así que es seguro pintar lo que llegue de un modelo.

## Cuándo usarlo

- Respuesta de un asistente o de un proceso por stream.

## Cuándo no usarlo

- Mensajes ya completos de un chat entre personas.
- Documentos en markdown: `iswc-md-render`.

## Importación

```js
import './stream-bubble.js';
```

## Ejemplo mínimo

```html
<iswc-stream-bubble name="Asistente" avatar="A" state="streaming" text="Revisando **tus datos**…"></iswc-stream-bubble>
```

## API

### Atributos y propiedades

Los datos van por atributos o por `el.props = { … }` (se mezcla con lo anterior y solo repinta si algo cambió). Un arreglo o un objeto va como JSON en el atributo; las funciones, solo por `props`.

| Atributo / prop | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `text` | string | "" | Texto acumulado. |
| `state` | `idle` \| `streaming` \| `end` \| `error` | `idle` | Estado. |
| `animated` | boolean | `false` | Letra a letra en `streaming`. |
| `progress` | `{ icono, texto }[]` | `[]` | Pasos previos; se quitan en `end` y `error`. |
| `name` | string | "" | Quien responde. |
| `avatar` | string | "" | Inicial del avatar. |
| `textos` | `Partial<StreamBubbleTextos>` | `{}` | Reemplaza los textos visibles. |

### Slots

No tiene slots.

### Eventos

No emite eventos propios.

### Métodos y propiedades públicas

`props`: las claves de la tabla anterior, en camelCase.

### CSS parts

| Part | Elemento |
| --- | --- |
| `bubble` | Contenedor. |
| `avatar` | Avatar. |
| `estado` | Pastilla de estado. |
| `nombre` | Nombre. |
| `progreso` | Pasos previos. |
| `texto` | Texto. |

### Custom states

No expone custom states.

### CSS custom properties

No define custom properties propias: toma los tokens del tema.

### Integración con formularios

No participa en formularios.

## Anatomía

```html
<div part="bubble">
  <div part="avatar"></div><div part="estado">…</div><div part="nombre">…</div>
  <div part="progreso">…</div><div part="texto">…</div>
</div>
```

## Comportamiento

- Solo admite enlaces `http(s)`, `mailto`, `tel`, `#` y rutas `/`.
- Los pasos ya pintados no se recrean.
- Con movimiento reducido, los indicadores de progreso van más lentos, nunca quietos.

## Dependencias y componentes relacionados

Sin dependencias. Relacionados: `iswc-status-pill`, `iswc-md-render`.

## Accesibilidad

El estado también va como texto; la espera lleva `aria-label`.

## Ejemplo avanzado

```html
<iswc-stream-bubble name="Asistente" avatar="A" state="streaming" text="Revisando **tus datos**…"></iswc-stream-bubble>
```

## Errores comunes

- Mandar el texto completo sin `animated` y esperar el efecto: va letra a letra solo con `animated`.

## Reglas para LLM

- Da `text` acumulado, no los trozos sueltos.
- No es un visor de markdown completo: tablas y fences no aplican.

## Fuentes

- [stream-bubble.ts](./stream-bubble.ts) · [stream-bubble.scss](./stream-bubble.scss) · [stream-bubble.json](./stream-bubble.json)
