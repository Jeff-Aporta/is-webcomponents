# src/cdn — el loader

El loader carga los componentes por demanda: uno que se pide, uno que baja. Vive en capas (hojas),
para que una app que usa tres componentes no baje los doscientos.

## Piezas

- `loader.ts` — la API publica: `load`, `ensure`, `configure`, `registerApp`.
- `load-plan.ts` — como se decide que hace falta un componente y en que hoja esta.
- `loader-sheets.ts`, `sheet-cache.ts` — las hojas de codigo y su cache.
- `loader-mirrors.ts`, `loader-hashes.ts`, `loader-ref.ts` — los espejos (jsDelivr, githack, Pages) y
  el pin a SHA.
- `ensure-element.ts` — registra un elemento que aun no esta definido.
- `collect-iswc-tags.ts` — recoge los tags `iswc-*` de un arbol.
- `asset-store.ts`, `loader-store.ts` — el estado del loader.

## Reglas

- El loader no sabe de componentes: solo de tags y de hojas.
- Un modulo del kit no importa el loader: el loader carga el modulo.
- El CSS viaja con su modulo (`iswc:css`), no aparte.
- La API publica del loader no cambia sin avisar.

## Documentos

- [loader.md](loader.md) — la ficha del loader.
- [build/README.md](build/README.md) — las herramientas que construyen el kit.
