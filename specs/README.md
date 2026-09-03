# Specs IS Web Components (SDD)

Contrato vigente del kit. **No sustituye** [`AGENTS.md`](../LLM.md): el spec dice qué debe pasar; el diario dice qué pasó y por qué.

Cómo se trabaja: [flujo-sdd.md](flujo-sdd.md) — spec → tasks → ejecución → gate.

Planes fechados de una sesión viven en `docs/superpowers/` (si existen). Al cerrarse: fusionar aquí o añadir un ADR.

## Mapa

| Capa | Ruta | Pregunta |
|------|------|----------|
| Proceso | [flujo-sdd.md](flujo-sdd.md) | ¿Cómo se aborda un cambio? |
| Constitution | [constitution.md](constitution.md) | ¿Qué no se negocia? |
| Constraints | [constraints.md](constraints.md) | ¿Qué está prohibido? |
| Spec | [galeria/spec.md](galeria/spec.md) | ¿Cómo funciona la galería y los previews? |
| Spec | [cdn.md](cdn.md) | ¿Cómo se publica por CDN? |
| Spec | [componentes.md](componentes.md) | ¿Qué forma tiene un `is-*`? |
| Spec | [iconos.md](iconos.md) | ¿Cómo se resuelven los iconos? |
| Spec | [documentacion.md](documentacion.md) | ¿Cómo se documenta para agentes? |
| Spec | [testing.md](testing.md) | ¿Qué hace verde el gate? |
| Spec | [typescript/spec.md](typescript/spec.md) | ¿Cómo se tipa el kit? |
| Plantillas | [plantillas/](plantillas) | `spec.template.md`, `tasks.template.md` |
| ADR | [adr.md](adr.md) | Decisiones cerradas |
| Lesson | [lessons.md](lessons.md) | Índice del diario |

## Cómo leer

1. [constitution.md](constitution.md) y [constraints.md](constraints.md).
2. `specs/<dominio>/spec.md` del área que tocas.
3. Entrada en `AGENTS.md` si el síntoma ya ocurrió.

## Dominios

Un cambio nuevo = sección en el spec del dominio, o carpeta nueva bajo `specs/` si el dominio no existe. **Prohibido** `spec-foo.md` suelto en la raíz de `specs/`.

Cada regla irreversible debe tener verificación en `tests/*.test.mjs` o comando documentado en el spec. Un spec sin guardián citado es una intención, no una regla.
