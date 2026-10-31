---
tag: iswc-preview-component
tags:
  - iswc-preview-component
category: preview
status: public
source: ./preview-component.ts
style: ./preview-component.scss
preview: ./preview-component.json
---
# `<iswc-preview-component>`

## Propósito

Shell de la galería. Pinta una definición JSON de preview; no es un control de producto.

## Importación

```js
import './preview-component.js';
```

## Cuándo usarlo

Cuando una galería de demos tiene que pintar una definición `iswc-preview/v1` completa.

## Cuándo no usarlo

No lo pongas en una vista de producto. No evalúa el comportamiento de un demo: eso lo hace la galería.

## Ejemplo mínimo

```js
const vista = document.createElement('iswc-preview-component');
vista.preview = definicion;
document.body.append(vista);
```


## API

| Atributo o propiedad | Notas |
| --- | --- |
| `storage-key` | Clave para recordar el estado de la página. |
| `preview` | Propiedad: la definición `iswc-preview/v1`. |

## Eventos

| Evento | Descripción |
| --- | --- |
| _(ninguno)_ | Este componente no emite eventos personalizados. |

<details>
<summary>Ejemplo en vivo</summary>

```js
const el = document.querySelector('iswc-preview-component');
// El componente no emite eventos personalizados.
// Escucha los nativos si los necesitas:
el.addEventListener('click', (e) => {
  console.log('click', e);
});
```

</details>


### CSS parts

| Part | Uso |
| --- | --- |
| `aside` | Barra lateral complementaria (TOC). |
| `main` | Área principal del contenido. |
| `page` | Página completa (aside + main). |
| `toc-drawer` | Drawer que contiene el TOC en móvil. |
| `toc-toggle` | Botón para abrir/cerrar el TOC. |

## Comportamiento

Pinta el documento, el índice y los demos de la definición. En pantallas estrechas el índice pasa a un drawer.

## Accesibilidad

El botón del índice tiene `aria-label` y refleja `aria-expanded` según el drawer.

## Reglas para LLM

- La definición va por la propiedad `preview`.
- Es parte del chrome de la galería: no lo reimplementes.
