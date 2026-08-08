---
tag: is-fab
tags:
  - is-fab
category: actions
status: public
source: ./fab.js
style: ./fab.css
preview: ../../previews/actions/is-fab.json
---
# `<is-fab>`

## Propósito

Floating Action Button: botón circular principal que se posiciona de
forma fija en la ventana. Soporta colores, tamaños, etiquetas
extendidas, pulso de atención y posicionamiento en cualquier esquina.

Este módulo registra `<is-fab>`.

## Cuándo usarlo

Acciones, selección de comandos y menús interactivos.

## Cuándo no usarlo

No usar como decoración ni reemplazar enlaces semánticos para navegación simple.

## Importación

```js
import './fab.js';
```

## Ejemplo mínimo

```html
<is-fab icon="mdi:plus" label="Crear"></is-fab>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `icon` | string/según contrato | Fuente define default/restricción. |
| `position` | string/según contrato | Fuente define default/restricción. |
| `color` | string/según contrato | Fuente define default/restricción. |
| `href` | string/según contrato | Fuente define default/restricción. |
| `pulse` | boolean | Fuente define default/restricción. |
| `extended` | boolean | Fuente define default/restricción. |
| `without-shadow` | boolean | Fuente define default/restricción. |
| `label` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `position` | lectura/escritura | Declarada por clase. |
| `color` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `icon` | Contenido proyectado. |
| `default` | Contenido proyectado. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-fab-click` | sí | sí | sí | no |

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `base` | Personalizable con `::part(base)`. |
| `icon` | Personalizable con `::part(icon)`. |
| `label` | Personalizable con `::part(label)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--size` | Diámetro del botón (default `3.5em`). Escala con el `font-size` del host. |
| `--fab-shadow` | Sombra flotante. |
| `--is-brand` | Color de marca usado por el pulso de atención. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-fab> — Floating Action Button (vanilla, zero dependencies).
> Botón flotante de acción principal. Material-like.
>   <is-fab icon="mdi:plus" position="bottom-end">Crear</is-fab>
> Está construido SOBRE <is-button>: el color, el foco y la conversión a <a>
> cuando hay `href` los pone el botón. is-fab añade solo lo suyo: anclaje fijo
> a una esquina, forma circular, sombra flotante y pulso.
> Atributos
>   icon        string  — iconify id del icono principal.
>   position    bottom-end | bottom-start | top-end | top-start | inline (default 'bottom-end')
>   color       brand | neutral | success | warning | danger (default 'brand')
>   href        string — si se define, renderiza <a>.
>   pulse       boolean — animación de pulso para llamar la atención.
>   extended    boolean — ancho extendido con label.
>   without-shadow boolean
>   label       string — texto accesible (y label extendido).
> Slots
>   (default)    contenido / label (si extended).
>   icon         override del icono.
> Eventos
>   is-fab-click  detail: { originalEvent }

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./button.js`](./button.js) — el fab se apoya en `<is-button>` para la
  apariencia, el color y el modo enlace.

Tags del módulo: `<is-fab>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-hidden`, `aria-label`.

## Ejemplo avanzado

```html
<is-fab icon="mdi:plus" label="Crear"></is-fab>
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

- [JavaScript](./fab.js)
- [CSS](./fab.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/actions/is-fab.json)
