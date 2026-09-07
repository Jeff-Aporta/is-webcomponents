# Feedback — corrida <run_id> (<proyecto>)

## Persona

> El sistema de auto-mejora del auditor se comporta según
> [`automation/profile.md`](automation/profile.md). Antes de emitir una regla seguimos los
> principios §4 y respetamos los anti-patrones §13.
>

Fecha: <fecha> · Proyecto: `<proyecto>` · Modo: <barrido|deep> · Autor: <revisor>

Una entrada por hallazgo del informe. El id, la `regla` y el `archivo` deben
coincidir con los del informe (matching automático del harness).

## <H1> · [<prioridad>] `<regla>` — `<archivo>`

- **Veredicto del revisor**: `resuelto` | `improcedente` | `real`.
- **Evidencia** (obligatoria en improcedente): rutas del repo que prueban la
  decisión — guard de health, ADR (`specs/adr/`), desviaciones
  (`specs/codigo/desviaciones-iss.md`), tests que fijan la semántica, comentario
  de intención en el código. Sin evidencia no se admite improcedente.
- **Ajuste esperado del harness**: qué debe cambiar la regla (no publicar EXENTO
  como H, leer tal registro de exenciones, excluir por proyecto, reconocer
  desviaciones N/A…).

## Resuelto en esta revisión

- <Hn>: <qué se arregló>.

## Nota de entorno

- <modo de corrida / red / claves / limitaciones>.