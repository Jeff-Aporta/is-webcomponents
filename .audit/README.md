# .audit — la auditoria del repo

Las herramientas que revisan el repo y escriben el informe: que cada componente tenga su ficha,
sus ejemplos y su documentacion al dia.

- `audit-sections.mjs`, `build-report.mjs`, `extract-parts.mjs` — el informe.
- `phase-*.mjs` — los barridos por fase.
- `last.md` / `last.json` — el ultimo informe.

## Reglas

- Un barrido informa; no modifica el codigo sin que se lo pidan.
- El informe dice lo que falta, con el archivo y la linea.
