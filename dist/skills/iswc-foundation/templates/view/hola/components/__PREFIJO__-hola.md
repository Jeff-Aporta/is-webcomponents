---
name: __PREFIJO__-hola
description: Pantalla de bienvenida de __TITULO__ (shell de la vista `hola`). Úsala como referencia de un shell de vista hecho con piezas del kit, con un modal.
---

# `<__PREFIJO__-hola>`

Portada de la app: cejilla, título `<__PREFIJO__-hola-mundo>`, lema, botón «Ver cómo está hecha»,
chips y cuatro tarjetas con las piezas del estándar. El botón abre un modal con la regla de los
cuatro archivos y los comandos para empezar. Datos en `../utils/bienvenida.ts`.

## Anatomía

```
<__PREFIJO__-hola>
  #shadow-root
    <section part="hero">
      <p class="kicker">
      <__PREFIJO__-hola-mundo id="titulo">
      <p class="lede">
      <iswc-button id="abrir-modal">Ver cómo está hecha</iswc-button>
      <iswc-tag> ×4
    <div part="tarjetas">
      <iswc-card> ×4                     ← caracteristicas()
    <iswc-dialog id="modal" label="Cómo está hecha">
      <iswc-callout> · <iswc-code lang="bash">   ← guionInicio()
      <iswc-button slot="footer" id="cerrar-modal">Entendido</iswc-button>
```

## Atributos observados

<!-- exclude: Atributos observados -->

## Props

| Prop | Tipo | Default | Qué hace |
| --- | --- | --- | --- |
| `modal` | `boolean` | `false` | Abre (`true`) o cierra el modal. Cambiarla solo toca el modal (repintado parcial). |

## Eventos

| Evento | `detail` | Cuándo |
| --- | --- | --- |
| `__PREFIJO__-hola-modal` | `{ abierto: boolean }` | Al abrir con el botón y al cerrarse el modal (Entendido, Esc o clic fuera). |

## Slots

<!-- exclude: Slots -->

## Ejemplos

```html
<__PREFIJO__-hola></__PREFIJO__-hola>
<script type="module">
  const hola = document.querySelector('__PREFIJO__-hola');
  hola.addEventListener('__PREFIJO__-hola-modal', (e) => console.log('modal', e.detail.abierto));
  hola.props = { modal: true }; // abre el modal desde fuera
</script>
```
