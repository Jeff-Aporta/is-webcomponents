# Spec — <dominio>

> Copiar a `specs/<dominio>/spec.md`. Plantilla canónica de este repo.
> No duplicar [constitution.md](../constitution.md).

Comportamiento exigido. Diario: [`lessons.md`](../../specs/lessons.md).

## Contexto

Qué problema, para quién. Dos o tres frases.

## WHAT

### S-X1 <Requerimiento>

Comportamiento en presente, observable. Sin detalle de implementación. Es lo que el guardián verifica.

## HOW

**HOW débil** (opcional): cómo se piensa hacer hoy; puede cambiar sin tocar el WHAT.

**HOW fuerte** (solo contratos estrictos; cambiarlos exige ADR):

| Pieza | Contrato |
|---|---|
| Archivo / CLI | |

## Aceptación

| Caso | Resultado | Verificación |
|---|---|---|
| | | `node tests/<guardian>.test.ts` |
