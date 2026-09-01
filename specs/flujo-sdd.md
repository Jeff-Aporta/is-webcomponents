# Flujo SDD — IS Web Components

Spec-Driven Development. Tres etapas, en orden.

```
spec (qué) → tasks (cómo) → ejecución en src/ → gate (tests/)
```

## 1. Spec

Antes de tocar código. Salida: `specs/<dominio>/spec.md` con contexto, requerimientos (`S-Xn`), contratos y tabla de aceptación.

- **Feature en dominio existente** → sección nueva en ese `spec.md`.
- **Dominio nuevo** → carpeta `specs/<dominio>/spec.md` + fila en [README.md](README.md).
- **Sesión fechada** → `docs/superpowers/specs/AAAA-MM-DD-<tema>.md`. Al cerrar, fusionar al spec del dominio o ADR.

Plantilla: [plantillas/spec.template.md](plantillas/spec.template.md).

**Stop:** en esta etapa no se escribe código de producto.

## 2. Task plan

Con el spec: `tasks.md` en `docs/superpowers/plans/` (o junto al spec si es micro-cambio). Cada tarea tiene un comando que falla o pasa.

Plantilla: [plantillas/tasks.template.md](plantillas/tasks.template.md).

## 3. Ejecución

Por cada tarea:

1. **Rojo primero.** Escribir o extender el guardián en `tests/<area>.test.ts` antes de la implementación.
2. **Verde.** Diff mínimo en `src/` (o `src/manifest.js` / `scripts/` si aplica).
3. **Gate.** `node tests/run-all.ts` (y el guardián nuevo aislado).
4. **Diario.** Si el error fue nuevo, entrada en `AGENTS.md` § bitácora.

Push solo si el usuario lo pide. Autor **Jeff-Aporta**. Sin `Co-authored-by`.

## Al cerrar

| Artefacto | Cuándo |
|---|---|
| `specs/<dominio>/spec.md` | Cambió el comportamiento exigido |
| `specs/constraints.md` | Error pagado que hay que prohibir |
| `specs/adr/README.md` | Debate cerrado |
| `AGENTS.md` | Lección con síntoma + verificación |
| `AGENTS.md` | Trampa operativa (PowerShell, paths, iconos…) |
| `specs/lessons/README.md` | Fila índice a la lección |

El spec dice **qué debe pasar**. `AGENTS.md` dice **qué pasó**.
