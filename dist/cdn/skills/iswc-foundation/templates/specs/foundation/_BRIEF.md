# Brief de redacción de `specs/foundation/`

Objetivo: specs AUTOSUFICIENTES. Si `src/` y `view/` se borran, agentes HOW «ciegos» deben poder
reconstruir la app SOLO con estas specs (con patrones nuevos si quieren), cumpliendo todo lo exigido.
La fuente de verdad al destilar es el CÓDIGO actual.

- Prioridad y formato: [`../especificar-what.md`](../especificar-what.md) (WHAT > HOW WEAK > HOW STRONG,
  7 secciones, IDs `[W-|HW-|HS-<AREA>-NN]`, uno por viñeta y verificable).
- Archivos `NN-tema.md`: `10` plataforma, `20` componentes y vistas, `30`–`60` dominios de la app,
  `70` pruebas, gate y sync.
- Idioma: español. Escribe solo los archivos asignados.
