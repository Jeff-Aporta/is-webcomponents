---
tag: iswc-avatar
tags:
  - iswc-avatar
category: media
status: public
source: ./avatar.ts
style: ./avatar.css
preview: ./avatar.json
---
# `<iswc-avatar>`

## PropÃ³sito

Avatar con imagen, iniciales o icono fallback. Caja = 1em Ã— 1em; escala con font-size.

Este mÃ³dulo registra `<iswc-avatar>`.

## CuÃ¡ndo usarlo

Iconos, identidad visual y reproducciÃ³n de video.

## CuÃ¡ndo no usarlo

No crear loader/reproductor paralelo antes de revisar existentes.

## ImportaciÃ³n

```js
import './avatar.js';
```

## Ejemplo mÃ­nimo

```html
<span style="font-size:3rem">
<iswc-avatar initials="AB" shape="rounded"></iswc-avatar>
</span>
```

## API

### Atributos y propiedades

#### Atributos observados

| Atributo | Tipo | Notas |
| --- | --- | --- |
| `image` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `initials` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `label` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `loading` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |
| `shape` | string/segÃºn contrato | Fuente define default/restricciÃ³n. |

#### Propiedades pÃºblicas

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


| Evento | DescripciÃ³n |
| --- | --- |
| `iswc-error` | Emitido cuando se produce un error. |

| Evento | detail | bubbles | composed | cancelable |
| --- | --- | --- | --- | --- |
| `iswc-error` | no | sÃ­ | sÃ­ | no |


<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-avatar');
el.addEventListener('iswc-error', (e) => {
  console.log('iswc-error', e.detail);
});
```

</details>

### MÃ©todos y propiedades pÃºblicas

No expone.

Propiedades pÃºblicas aparecen en tabla anterior; APIs heredadas se verifican en dependencia base.

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
| `--iswc-font-family` | Token leÃ­do o definido por componente. |
| `--iswc-text` | Token leÃ­do o definido por componente. |
| `--iswc-control-bg` | Token leÃ­do o definido por componente. |
| `--iswc-control-border` | Token leÃ­do o definido por componente. |
| `--iswc-muted` | Token leÃ­do o definido por componente. |

### IntegraciÃ³n con formularios

No declara integraciÃ³n form-associated propia en este mÃ³dulo.

## Comportamiento

DocumentaciÃ³n de cabecera preservada desde fuente:

> <iswc-avatar> â€” Web Component (vanilla).
> Atributos
>   image     string â€” URL de imagen
>   initials  string â€” iniciales si no hay imagen (mÃ¡x. 2)
>   label     string â€” aria-label del avatar
>   loading   eager | lazy (default eager)
>   shape     circle | square | rounded (default circle)
> Slots
>   icon      fallback cuando no hay image ni initials (default mdi:account)
> Eventos
>   iswc-error  â€” cuando la imagen falla al cargar (bubbles, composed)
> CSS Parts: ::part(image) ::part(initials) ::part(icon)
> Escala con font-size del contexto (caja = 1em Ã— 1em).

## Dependencias y componentes relacionados

- [`../_shared/adopt-css.js`](../_shared/adopt-css.js)
- [`./icon.js`](./icon.js)

Tags del mÃ³dulo: `<iswc-avatar>`.

## Accesibilidad

Preservar semÃ¡ntica, foco, teclado, labels y ARIA. ARIA detectado: `aria-label`, `aria-hidden`.

## Ejemplo avanzado

```html
<span style="font-size:3rem">
<iswc-avatar initials="AB" shape="rounded"></iswc-avatar>
</span>
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

- [JavaScript](./avatar.ts)
- [CSS](./avatar.css)
- [Ãndice de categorÃ­a](../../specs/componentes.md)
- [Preview](./avatar.json)
