---
name: __PREFIJO__-app
description: Shell de __TITULO__. Úsalo una sola vez, en index.html; monta la barra y el shell de la vista activa.
---

# `<__PREFIJO__-app>`

Armazón de la app: barra superior (marca y conmutador de tema) y, debajo, el shell de la vista
activa. La app solo conoce el shell de cada vista; las vistas se registran en `kit-tags.ts`.

## Anatomía

```
<__PREFIJO__-app>
  #shadow-root
    <header part="barra">
      <strong class="marca">__TITULO__</strong>
      <iswc-theme-toggle scope="root">
    <main part="vista">
      <__PREFIJO__-hola>        ← shell de la vista activa
```

## Atributos observados

<!-- exclude: Atributos observados -->

## Props

| Prop | Tipo | Default | Qué hace |
| --- | --- | --- | --- |
| `vista` | `string` | `"hola"` | Vista activa; una clave sin shell cae en `hola`. |

## Eventos

<!-- exclude: Eventos -->

## Slots

<!-- exclude: Slots -->

## Ejemplos

```html
<__PREFIJO__-app></__PREFIJO__-app>
<script type="module">
  document.querySelector('__PREFIJO__-app').props = { vista: 'hola' };
</script>
```
