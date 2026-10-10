---
name: nueva-vista
description: Crear una vista view/<v>/ en una app iswc (shell, página aislada, demo, utils y registro). Úsala cuando nace un dominio nuevo de la app.
---

# Nueva vista `view/<v>/`

Referencia viva: `view/hola/`. Cada vista es un mini-proyecto autocontenido.

```
view/<v>/
├── index.html        ← la vista sola (QA aislado): mismo pin, carga KIT_TAGS + VIEW_TAGS.<v>
├── README.md         ← alcance (dentro/fuera), shell, contrato, qué no hacer
├── demo/index.html   ← cada sub-pieza aislada con datos de muestra
├── components/       ← <tag>.ts/.scss/.md/.json de la vista + all.ts (hijos antes que el shell)
└── utils/            ← dominio sin DOM: stores, modelos, cálculos (importable y probable sin navegador)
```

## Pasos

1. Spec: `specs/foundation/NN-<v>.md` con su WHAT (7 secciones, `especificar-what.md`).
2. Copia `view/hola/` como esqueleto y renombra.
3. **Un shell** `<__PREFIJO__-<v>>`: arma la vista con sus sub-piezas, escucha sus eventos (una vez) y
   les reasigna `props`. Los hijos nunca hablan con el store.
4. Registro: `VIEW_TAGS.<v> = [hijos…, shell]` en `src/js/kit-tags.ts`, y el shell en `SHELLS` de
   `<__PREFIJO__-app>`.
5. Galería: cada componente de la vista en `view/demo/manifest.json`.
6. Lo que usen dos vistas sube a `src/js/` (componentes a `src/js/components/__PREFIJO__/`, lógica a
   `src/js/core` o `src/js/dominio`).
7. Pruebas: `tests/vistas/` (utils) y `tests/e2e/` (UI); `deno task test:all` en verde.

Siguiente: [`nuevo-componente.md`](nuevo-componente.md).
