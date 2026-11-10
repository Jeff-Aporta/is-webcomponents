# labs — las pruebas de campo

Los labs son experimentos que no forman parte del kit: miden, comprueban o enseñan algo puntual.
Conservan el nombre con el que nacieron (`iss-ayudascpia-*`, `rieles-curvos`,
`icon-cdn-bench`).

## Reglas

- **El contenido de `labs/` no se toca.** Se pueden corregir las RUTAS que apuntan a un fixture
  renombrado, pero el ejemplo se queda como es.
- Un lab no se publica: no entra en `dist/` ni en el `manifest.ts`.
- Si un lab crece hasta ser parte del kit, se promueve a componente (y se documenta aqui).
