# File locks — types-strong-2026

## Locks activos (T1 cerrado)

| Archivo | WT que lo lockea | Locked desde | Notas |
|---|---|---|---|
| `src/components/_shared/svg-chart-engine.ts` | WT-0001 (cerrado, lock permanente) | T1 | `roundedBarRect` firma cambiada a `number`; no tocar en T2-T9. Solo lectura. |
| `src/components/_shared/diagram-element-base.ts` | WT-0001 (cerrado, lock permanente) | T1 | Cast HTMLScriptElement añadido; no tocar en T2-T9. Solo lectura. |
| `src/components/diagrams/diagram-types.ts` | (read-only permanente) | baseline | Shape server de tipos compartidos. NO modificar firmas. Solo añadir al final. |

## Locks liberados

(Ninguno aún — T1 fija locks permanentes)

## Reglas de lock

- **Lock permanente**: archivo congelado para T2-T9. Solo se desbloquea en T10 si hay necesidad crítica.
- **Lock temporal**: archivo bloqueado por una hoja activa; se libera al cerrar la hoja.
- Capitán media si dos hojas piden el mismo archivo (lock temporal).
- Cualquier propuesta de cambio a un archivo con lock permanente debe pasar por el captain y aprobarse en `plan-activo.md` antes de tocarse.

## Archivos compartidos — estado al cierre de T1

| Archivo | Errores antes | Errores después | Cambios | Verificado |
|---|---|---|---|---|
| `svg-chart-engine.ts` | 8 | 0 | `roundedBarRect(x, y)` ahora `number` | ✓ typecheck + strict |
| `diagram-element-base.ts` | 1 | 0 | cast `c as HTMLScriptElement` | ✓ typecheck + strict |
| `class-spec.ts` | 8 | 0 | tipo `ClassSpecClass[]` explícito + `headerH` en retorno | ✓ typecheck + strict |