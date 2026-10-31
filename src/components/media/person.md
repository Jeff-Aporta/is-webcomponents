---
tag: iswc-person
tags:
  - iswc-person
category: media
status: public
source: ./person.ts
style: ./person.css
preview: ./person.json
---
# `<iswc-person>`

## Propósito

Una persona en línea: avatar con iniciales, nombre (o usuario) y un detalle. Va donde aparezca alguien: autor, asignado, miembro.

## Cuándo usarlo

- Autor de un mensaje, asignado de una tarea, miembro de un equipo.

## Cuándo no usarlo

- La sesión en la barra: `iswc-session-menu`.
- Solo una foto: `iswc-avatar`.

## Importación

```js
import './person.js';
```

## Ejemplo mínimo

```html
<iswc-person nombre="Ana Gestora" detalle="Gestora"></iswc-person>
```

## API

### Atributos y propiedades

Los datos van por atributos o por `el.props = { … }` (se mezcla con lo anterior y solo repinta si algo cambió). Un arreglo o un objeto va como JSON en el atributo; las funciones, solo por `props`.

| Atributo / prop | Tipo | Default | Notas |
| --- | --- | --- | --- |
| `usuario` | string | "" | Se muestra si no hay `nombre`. |
| `nombre` | string \| null | `null` | Nombre visible. |
| `detalle` | string | "" | Segunda línea. |
| `compacto` | boolean | `false` | Solo el avatar; el nombre pasa al `title`. |

### Slots

No tiene slots.

### Eventos

No emite eventos propios.

### Métodos y propiedades públicas

`props`: las claves de la tabla anterior, en camelCase.

### CSS parts

| Part | Elemento |
| --- | --- |
| `persona` | Contenedor. |
| `avatar` | El `iswc-avatar`. |
| `nombre` | Nombre. |
| `detalle` | Detalle. |

### Custom states

No expone custom states.

### CSS custom properties

No define custom properties propias: toma los tokens del tema.

### Integración con formularios

No participa en formularios.

## Anatomía

```html
<span part="persona">
  <iswc-avatar part="avatar"></iswc-avatar><span part="nombre">…</span><span part="detalle">…</span>
</span>
```

## Comportamiento

- Escala con el font-size del contexto.
- Las iniciales salen del nombre (dos palabras) o de los dos primeros caracteres.

## Dependencias y componentes relacionados

Usa `iswc-avatar`.

## Accesibilidad

El avatar lleva `label` con el nombre visible.

## Ejemplo avanzado

```html
<iswc-person nombre="Ana Gestora" detalle="Gestora"></iswc-person>
```

## Errores comunes

- Dar `compacto` sin `nombre` ni `usuario`: queda un `?`.

## Reglas para LLM

- No armes avatar + nombre a mano: usa este tag.

## Fuentes

- [person.ts](./person.ts) · [person.scss](./person.scss) · [person.json](./person.json)
