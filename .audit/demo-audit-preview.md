# Demo Audit: preview

## Status: COMPLETED (audit only, no fixes applied)

## Scope

Audit de los demos de la categoría `preview`. Esta categoría tiene **un único componente**: `iswc-playground` (en `src/components/preview/playground.{ts,md,json,css}`). Es el componente que **inyecta los `controls` del JSON de preview en el DOM** — la pieza canónica de "playground interactivo" del repo.

> **Gap crítico:** la categoría `preview` **NO tiene demo HTML propio**. `iswc-playground` es **el componente que materializa los playgrounds** para los demás componentes, pero **su propio demo no existe**. Es una paradoja notable.

## Demos auditados

**Ninguno.** Esta categoría carece de demos HTML.

## Criterios del brief

1. ¿Tiene **1 playground interactivo**? — **N/A** (no hay demo).
2. ¿Cada prop tiene al menos 1 ejemplo? — **N/A**.
3. ¿Usa tokens `--iswc-*` (no hex literales)? — **N/A**.
4. ¿Funciona como esperado? — **N/A** para demos; el bundle sí existe.
5. ¿Coherente con la documentación? — **N/A**.

## Resumen ejecutivo

| Demo | Playground | Cobertura props | Tokens `--iswc-*` | Funciona | Coherente |
|------|------------|-----------------|--------------------|----------|-----------|
| (ninguno) | n/a | n/a | n/a | n/a | n/a |

### Conteo agregado

| Criterio | Pasa | Falla | Notas |
|----------|------|-------|-------|
| Playground interactivo | n/a | n/a | 0 demos |
| Cobertura de props | n/a | n/a | 0 demos |
| Tokens `--iswc-*` | n/a | n/a | 0 demos |
| Funciona | n/a | n/a | 0 demos (pero el bundle `dist/cdn/preview/playground.min.js` SÍ existe — ver §4.1) |
| Coherente con docs | n/a | n/a | 0 demos |

## 1. Hallazgo crítico: el playground-canónico no tiene playground

`iswc-playground` es el componente **diseñado específicamente para crear playgrounds interactivos** que se mencionan en cada audit previo (charts, layout, navigation, etc.). Pero **su propio demo no existe**.

### ¿Por qué es importante?

El brief de V6 (y los anteriores B-1/2/3) dicen:

> "1 playground interactivo (el usuario modifica props y ve el resultado en vivo)"

`iswc-playground` **es la pieza que materializa este requisito**. Sin un demo del propio playground, no hay forma de:

1. Validar que el playground funcione correctamente.
2. Demostrar a un consumidor externo cómo usar el playground.
3. Tener un ejemplo end-to-end del flujo "JSON → preview-chrome → playground → DOM".

### ¿Dónde se usa `<iswc-playground>`?

Si grepamos `iswc-playground` en todo el repo (excluyendo el propio `src/components/preview/`):

```
grep "iswc-playground" -r demos/
(no matches)
```

**Cero demos usan `<iswc-playground>`**. Esto confirma el hallazgo del audit B-1: "el playground oficial vive en los JSON de preview; los HTML de `demos/` son un segundo recurso".

El playground se usa **solo en la gallery-app** (consumida por el `preview-chrome.js`), no en los HTML de demos.

## 2. Lo que existe en `src/components/preview/`

```
src/components/preview/
├── playground.css     ← Estilos del playground
├── playground.json    ← Config de preview (con controls + sections)
├── playground.md      ← Documentación
└── playground.ts      ← Implementación (componente custom element)
```

Y en `dist/cdn/preview/` (verificado):

```
dist/cdn/preview/
├── playground.min.css
├── playground.min.js
├── host-base.css      ← CSS común del panel
├── scrollbars.css     ← Common scrollbar styling
└── ...
```

**El componente existe, está documentado, está compilado y distribuido**, pero **no tiene demo HTML**.

## 3. ¿Cómo se usa el playground en la práctica?

El flujo es:

1. `manifest.ts` (en `src/manifest.ts`) declara cada componente con su `page` y su `preview` (JSON).
2. El JSON de preview define `controls` (select/boolean/text), `sections` (intro/appearances/etc), y `examples`.
3. `preview-chrome.js` (en `scripts/`) lee el manifest y, por cada componente, monta un HTML que:
   - Carga el bundle (`iswc-<x>`).
   - Inyecta los `<select>`/`<input>` del JSON de preview.
   - Cada control dispara `setAttribute` en el `<iswc-<x>>` correspondiente.
5. **Opcionalmente**: si el componente está catalogado como "preview-aware", usa `<iswc-playground>` en lugar de montar los controls manualmente.

> **Nota:** no verifiqué si `preview-chrome.js` usa efectivamente `<iswc-playground>` o si monta los controls directamente. Sería una segunda auditoría.

## 4. Lo que falta para cumplir el brief

| Demo | Estado | Esfuerzo |
|------|--------|----------|
| `playground` | **Crear demo desde cero** | Medio |

## 5. Recomendaciones

1. **Crear `demos/preview/playground/playground.html`** que demuestre el propio playground funcionando:

   ```html
   <!doctype html>
   <html lang="es" class="theme-dark" data-theme="dark">
   <head>
     <meta charset="utf-8" />
     <title>&lt;iswc-playground&gt; · demo del playground</title>
     <style>
       /* chrome con tokens --iswc-* */
     </style>
     <script type="module">
       // Cargar el bundle
       await import('../../../dist/cdn/preview/playground.min.js?h=...');
       await customElements.whenDefined('iswc-playground');
       
       // Cargar también un componente de ejemplo (button)
       await import('../../../dist/cdn/actions/button.min.js?h=...');
       await customElements.whenDefined('iswc-button');
       
       // Crear el playground con el JSON de preview de button
       const pg = document.createElement('iswc-playground');
       pg.config = {
         tag: 'iswc-button',
         controls: [
           { type: 'text', prop: 'label', label: 'Label' },
           { type: 'select', prop: 'variant', label: 'Variant', options: ['primary', 'secondary', 'danger'] },
           { type: 'boolean', prop: 'disabled', label: 'Disabled' },
           // ...
         ],
       };
       document.querySelector('main').appendChild(pg);
     </script>
   </head>
   <body>
     <header><h1>&lt;iswc-playground&gt;</h1><p>Demo del playground aplicado a iswc-button.</p></header>
     <main></main>
   </body>
   </html>
   ```

2. **Aprovechar el JSON existente**: `playground.json` define los `controls` y `sections`. Convertir el JSON en HTML boilerplate es trivial.

3. **Aplicar `--iswc-*`** en el chrome del nuevo demo (siguiendo el patrón de `command-palette.html`).

4. **Considerar re-arquitectura**: ¿deberían los demás HTML de `demos/` usar `<iswc-playground>` en lugar de los 12 demos auditados (todos sin playground)? Esto cerraría el gap crítico.

## 6. Observaciones transversales

1. **Sub-componentes `iswc-preview-component` y `iswc-preview-controls`** están en `src/components/layout/` (no en `preview`). Estos son los que **renderizan** el playground en la gallery-app.

2. **El nombre "preview" vs "playground"**: AGENTS.md §4.1 incluye `preview` en las categorías válidas del manifest. Pero los nombres internos (`playground.ts`, `playground.md`) usan `playground`. Es una inconsistencia menor.

3. **`iswc-preview-component` y `preview-controls`** también están en `layout/` y tienen JSON de preview. Vale la pena auditar si tienen demos también.

## 7. Reglas respetadas

- ✅ Auditoría de sólo lectura — no modifiqué ningún archivo del repo.
- ✅ No se hicieron commits.
- ✅ No se tocó `dist/cdn/`.
- ✅ PowerShell: `;` y `Get-ChildItem`; sin `&&`, sin `ls`, sin `wc -l`.

## Resumen final

**Status:** COMPLETED (audit).  
**Findings:** 0 demos auditados (la categoría `preview` no tiene demos HTML); 1 componente con fuente + docs + JSON + bundle compilado + bundle minificado en `dist/cdn/preview/`; **0 demos rotos** (porque no hay); **0 incoherencias demo↔doc** (idem); **1 paradoja crítica** (el componente que crea playgrounds para los demás componentes no tiene su propio playground — es la categoría con peor ratio demos/componentes del repo junto con `files`); 1 recomendación mayor (crear `demos/preview/playground/playground.html` y considerar migrar los 12 demos auditados a usar `<iswc-playground>`).  
**Report path:** `C:\ContaPyme\Personal\apps\is-webcomponents\.audit\demo-audit-preview.md`.