---
tag: iswc-preview-component
tags:
  - iswc-preview-component
category: preview
status: public
---
# `<iswc-preview-component>`

## Propósito

Shell de la galería. Pinta una definición JSON de preview; no es un control de producto.

## Cuándo usarlo

Cuando el componente padre ya está en la pantalla y este tag es la pieza que le falta.

## Cuándo no usarlo

No lo reimplementes ni lo uses para sustituir al padre. La guía del padre documenta el conjunto.

## Ejemplo mínimo

```html
<iswc-preview-component></iswc-preview-component>
```


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
