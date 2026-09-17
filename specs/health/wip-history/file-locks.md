# File locks — types-strong-2026

## Locks activos

| Archivo | WT que lo lockea | Locked desde | Notas |
|---|---|---|---|

## Locks liberados

(Ninguno aún)

## Reglas de lock

- Cada hoja lockea los archivos de su scope al arrancar.
- Capitán media si dos hojas piden el mismo archivo.
- Lock se libera al cerrar la hoja (merge a WT-ROOT).

## Archivos compartidos (NO se tocan después de T1)

- src/components/_shared/svg-chart-engine.ts — T1 solamente
- src/components/_shared/diagram-element-base.ts — T1 solamente
- src/components/diagrams/diagram-types.ts — read-only

