# Spec — <dominio>

> Copiar a `specs/<dominio>/spec.md`. Plantilla canónica de este repo.
> No duplicar [constitution.md](../constitution.md). Diario: [`lessons.md`](../lessons.md).

## Contexto

Qué problema resuelve, para quién y qué duele si no existe. Dos o tres frases. Sin nombres de archivos.

## WHAT — comportamiento exigido

**Obligatorio.** Cada regla se escribe en presente, es observable desde fuera y lleva su id `S-X#`.
Si no se puede comprobar sin leer el código, no es WHAT.

### S-X1 <Requerimiento>

Qué debe pasar. Entradas, salidas, garantías, errores visibles.

### S-X2 <Requerimiento>

...

> **Checklist: si esto aparece en el WHAT, es HOW — muévelo.**
>
> - Nombres de archivos, funciones, clases, variables o módulos internos.
> - "usa X", "llama a Y", "importa de Z", "se implementa con…".
> - Detalles de algoritmo (búsqueda, caché, recorrido, índice) que el usuario no observa.
> - Orden de las llamadas internas, estructuras de datos privadas, nombres de tablas/columnas.
> - Números de línea, rutas de build o artefactos generados.
>
> Si el dato **sí** es contrato (alguien depende de él), va en HOW fuerte, no en WHAT.

## HOW — solo si es contrato

Por defecto **no se escribe**: el HOW puede cambiar sin tocar el WHAT.

**HOW débil** (nota, no regla): cómo se piensa hacer hoy. Nadie lo vigila.

**HOW fuerte** (contrato estricto; cambiarlo exige ADR): solo piezas que un consumidor externo ya usa.

| Pieza | Contrato congelado | Por qué es contrato |
|---|---|---|
| | | |

> Todo HOW fuerte debe estar justificado: si nadie externo depende, no es contrato, es deuda.

## Aceptación

| Caso (WHAT) | Resultado observable | Guardián |
|---|---|---|
| S-X1: … | … | `tests/<area>/<caso>.test.ts` |

Una regla sin guardián citado es una intención, no una regla.
