# src/components — los componentes del kit

Un componente es un **tag** (`iswc-*`) y vive en su propia carpeta: el `.ts`, el `.scss`, el `.md`
y el `.json` de la demo.

## La forma canonica

```
src/components/<categoria>/<tag>/
  <tag>.ts        la clase del componente
  <tag>.scss      sus estilos (el kit: @use 'kit' as *)
  <tag>.md        su ficha
  <tag>.json      su demo (iswc-preview/v1)
```

El `.ts` extiende `IswcReactive` (o `IswcFormControl` si es un control de formulario), y sus
estilos usan los mixins del kit (`src/styles/kit/`).

## Las categorias

| Categoria | Que agrupa |
|---|---|
| `actions` | botones, menús, acciones |
| `charts` | los graficos |
| `code` | el editor y el visor de codigo |
| `data` | rejillas, tablas, datos |
| `data-viz` | los graficos de datos |
| `diagrams` | los diagramas |
| `feedback` | avisos, estados, progreso |
| `files` | archivos y carpetas |
| `forms` | los controles de formulario |
| `helpers` | ayudas de md, flotantes |
| `isp` | las piezas especificas de negocio |
| `layout` | la estructura de la pagina |
| `media` | imagen, audio, video |
| `navigation` | menus, migas, paginacion |
| `overlays` | dialogos, ventanas, popovers |
| `preview` | la vista previa de los demos |

## Los md de dominio

Cada categoria tiene su `README.md` con su idiosyncrasia (que se reusa, que no, y por que).
Cuando anades un componente, lee el de su categoria antes: ahi esta escrito lo que ya existe.

## El indice

`src/components/index.ts` reexporta los componentes publicos. Un componente nuevo se anade ahi
si su API es publica.
