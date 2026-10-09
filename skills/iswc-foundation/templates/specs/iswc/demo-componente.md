---
name: demo-componente
description: Escribir el playground .json (iswc-preview/v1) y registrar un componente en la galería de la app. Úsala al crear un componente o al cambiar su API pública.
---

# Demo de componente (`<tag>.json` + galería)

La galería (`view/demo/index.html`) lee `view/demo/manifest.json`, valida cada `.json` con Zod
(`src/js/consts/schemas/demo.schemas.ts`; la forma canónica completa es `@iswc/component-schemas`)
y lo monta con `<iswc-preview-component>` del kit. Lo que no valida se avisa y no se muestra.

## Forma

```json
{
  "$schema": "iswc-preview/v1",
  "tag": "__PREFIJO__-x",
  "category": "<vista o 'shell'>",
  "navTitle": "X",
  "title": "&lt;__PREFIJO__-x&gt;",
  "titleHtml": false,
  "storageKey": "docs-__PREFIJO__-x",
  "styles": "<css del escenario>",
  "sections": [
    {
      "id": "intro",
      "title": "&lt;__PREFIJO__-x&gt;",
      "lede": "Una línea: qué es.",
      "blocks": [
        { "kind": "demo", "html": "<__PREFIJO__-x id=\"x\"></__PREFIJO__-x>", "target": "#x",
          "props": { },
          "controls": [ { "control": "text", "prop": "props:nombre", "label": "nombre", "default": "" } ] },
        { "kind": "html", "html": "<iswc-callout tone=\"info\"><strong slot=\"title\">Cuándo usarlo</strong>…</iswc-callout><iswc-callout tone=\"warning\"><strong slot=\"title\">Cuándo no</strong>…</iswc-callout>" }
      ]
    }
  ]
}
```

## Controles

| `prop` | Efecto |
| --- | --- |
| `attr:<nombre>` | Escribe/borra el atributo (booleano = presencia) |
| `prop:<nombre>` | Asigna la propiedad JS |
| `props:<clave>` | Mezcla `{ clave: valor }` en `.props` (componentes con props) |

`control` ∈ `select` (con `options`), `text`, `boolean`, `number` (`min`, `max`, `step`).

## Reglas

- Al menos un bloque `demo` vivo con los controles de su API clave, y un bloque `html` con dos
  `iswc-callout`: «Cuándo usarlo» / «Cuándo no».
- Todo componente tiene su línea en `view/demo/manifest.json` y viceversa (`{ "tag", "file" }`, `file`
  relativo a `view/demo/`).
- La ficha `.md` y el `.json` cuentan lo mismo: si cambias la API pública, cambian los dos.
- Cada vista tiene además su `demo/index.html` con las sub-piezas aisladas y datos de muestra.

Siguiente: [`nuevo-componente.md`](nuevo-componente.md) · [`nueva-vista.md`](nueva-vista.md).
