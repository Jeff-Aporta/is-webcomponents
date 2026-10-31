---
tag: iswc-empty-state
tags:
  - iswc-empty-state
category: feedback
status: public
source: ./empty-state.ts
style: ./empty-state.css
preview: ./empty-state.json
---
# `<iswc-empty-state>`

## Propósito

Lo que se ve cuando una lista o un panel no tiene datos, está cargando o falló: ícono, título, texto y una acción opcional.

## Cuándo usarlo

- Listas y paneles sin datos, cargando o con error.
- Vistas enteras sin permiso o sin sesión (`variante="tarjeta"`).

## Cuándo no usarlo

- Validación de un formulario: `error-text` del campo.
- Avisos dentro del contenido: `iswc-callout`.

## Importación

```js
import './empty-state.js';
```

## Ejemplo mínimo

```html
<iswc-empty-state titulo="Sin proyectos" texto="Crea uno para empezar.">
  <iswc-button color="brand">Crear el primero</iswc-button>
</iswc-empty-state>
```

## API

### Atributos y propiedades

Los datos van por atributos o por `el.props = { … }` (se mezcla con lo anterior y solo repinta si algo cambió). Un arreglo o un objeto va como JSON en el atributo; las funciones, solo por `props`.

| Atributo / prop | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `icono` | string | `mdi:inbox-outline` | Ícono del estado vacío. |
| `titulo` | string | `Nada por aquí` | Título. |
| `texto` | string | "" | Explicación. |
| `estado` | `vacio` \| `cargando` \| `error` | `vacio` | Cambia ícono, spinner y rol. |
| `variante` | `caja` \| `tarjeta` | `caja` | `caja` punteada; `tarjeta` con cuerpo propio. |
| `texto-cargando` | string | `Cargando…` | Título mientras carga (`textoCargando` en `props`). |

### Slots

| Slot | Contenido |
| --- | --- |
| `(default)` | Acción: un botón o un enlace. |

### Eventos

No emite eventos propios.

### Métodos y propiedades públicas

`props`: las claves de la tabla anterior, en camelCase.

### CSS parts

| Part | Elemento |
| --- | --- |
| `caja` | Contenedor. |
| `icono` | Ícono. |
| `titulo` | Título. |
| `texto` | Explicación. |

### Custom states

No expone custom states.

### CSS custom properties

No define custom properties propias: toma los tokens del tema.

### Integración con formularios

No participa en formularios.

## Anatomía

```html
<div part="caja" role="status">
  <iswc-icon part="icono"></iswc-icon><strong part="titulo">…</strong><p part="texto">…</p><slot></slot>
</div>
```

## Comportamiento

- `estado="error"` usa `role="alert"`; los demás, `role="status"`.
- El atributo `hidden` lo oculta.

## Dependencias y componentes relacionados

Usa `iswc-icon` e `iswc-spinner`. Relacionados: `iswc-callout`, `iswc-loading`.

## Accesibilidad

El cambio de estado se anuncia por el rol de la caja.

## Ejemplo avanzado

```html
<iswc-empty-state titulo="Sin proyectos" texto="Crea uno para empezar.">
  <iswc-button color="brand">Crear el primero</iswc-button>
</iswc-empty-state>
```

## Errores comunes

- Usarlo para un aviso que convive con datos: eso es `iswc-callout`.

## Reglas para LLM

- Toda lista sin datos usa este tag, nunca HTML suelto.
- Con `.props` se puede cambiar todo de una vez: `{ estado, titulo, texto }`.

## Fuentes

- [empty-state.ts](./empty-state.ts) · [empty-state.scss](./empty-state.scss) · [empty-state.json](./empty-state.json)
