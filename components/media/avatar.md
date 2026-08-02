---
tag: is-avatar
tags:
  - is-avatar
category: media
status: public
source: ./avatar.js
style: ./avatar.css
preview: ../../previews/media/is-avatar.html
---
# `<is-avatar>`

## Propósito

Avatar con imagen, iniciales o icono fallback. Caja = 1em × 1em; escala con font-size.

Este módulo registra `<is-avatar>`.

## Cuándo usarlo

Iconos, identidad visual y reproducción de video.

## Cuándo no usarlo

No crear loader/reproductor paralelo antes de revisar existentes.

## Importación

```js
import './avatar.js';
```

## Ejemplo mínimo

```html
<span style="font-size:3rem">
<is-avatar initials="AB" shape="rounded"></is-avatar>
</span>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `image` | string/según contrato | Fuente define default/restricción. |
| `initials` | string/según contrato | Fuente define default/restricción. |
| `label` | string/según contrato | Fuente define default/restricción. |
| `loading` | string/según contrato | Fuente define default/restricción. |
| `shape` | string/según contrato | Fuente define default/restricción. |

#### Propiedades públicas

| Propiedad | Acceso | Notas |
| --- | --- | --- |
| `image` | lectura/escritura | Declarada por clase. |
| `initials` | lectura/escritura | Declarada por clase. |
| `label` | lectura/escritura | Declarada por clase. |
| `loading` | lectura/escritura | Declarada por clase. |
| `shape` | lectura/escritura | Declarada por clase. |

### Slots

| Slot | Uso |
| --- | --- |
| `icon` | Contenido proyectado. |

### Eventos

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `is-error` | no | sí | sí | no |

### Métodos y propiedades públicas

No expone.

Propiedades públicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

### CSS parts

| Part | Uso |
| --- | --- |
| `avatar` | Personalizable con `::part(avatar)`. |
| `image` | Personalizable con `::part(image)`. |
| `initials` | Personalizable con `::part(initials)`. |
| `icon` | Personalizable con `::part(icon)`. |

### Custom states

No expone.

### CSS custom properties

| Token | Uso |
| --- | --- |
| `--is-font-family` | Token leído o definido por componente. |
| `--is-text` | Token leído o definido por componente. |
| `--is-control-bg` | Token leído o definido por componente. |
| `--is-control-border` | Token leído o definido por componente. |
| `--is-muted` | Token leído o definido por componente. |

### Integración con formularios

No declara integración form-associated propia en este módulo.

## Comportamiento

Documentación de cabecera preservada desde fuente:

> <is-avatar> — Web Component (vanilla).
> Atributos
>   image     string — URL de imagen
>   initials  string — iniciales si no hay imagen (máx. 2)
>   label     string — aria-label del avatar
>   loading   eager | lazy (default eager)
>   shape     circle | square | rounded (default circle)
> Slots
>   icon      fallback cuando no hay image ni initials (default mdi:account)
> Eventos
>   is-error  — cuando la imagen falla al cargar (bubbles, composed)
> CSS Parts: ::part(image) ::part(initials) ::part(icon)
> Escala con font-size del contexto (caja = 1em × 1em).

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./icon.js`](./icon.js)

Tags del módulo: `<is-avatar>`.

## Accesibilidad

Preservar semántica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-hidden`.

## Ejemplo avanzado

```html
<span style="font-size:3rem">
<is-avatar initials="AB" shape="rounded"></is-avatar>
</span>
```

## Errores comunes

- Usar tag sin importar módulo primero.
- Inventar API por similitud con otro componente.
- Pasar objeto complejo por atributo cuando API exige propiedad/payload.
- Copiar preview contra fuente actual; JS/CSS prevalecen.
- Crear size variant; usar font-size contextual y em.

## Reglas para LLM

- Reusar componente y dependencias antes de implementación paralela.
- Mantener nombres exactos de tags y API.
- Booleano se activa por presencia; no usar `attr="false"` salvo contrato explícito.
- Leer callers/shared antes de cambiar; corregir raíz común.
- No modificar API basándose solo en preview.

## Fuentes

- [JavaScript](./avatar.js)
- [CSS](./avatar.css)
- [Índice de categoría](./LLM.md)
- [Preview](../../previews/media/is-avatar.html)
