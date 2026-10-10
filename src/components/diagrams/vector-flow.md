# Diagrama de flujo en vector

Un **vector de diagramas**: cada columna es un sub-diagrama restringido a los tipos de entidad que
acepta (su contexto) y las **aristas son los puentes** entre columnas. Lo dibuja `iswc-flowchart`
(mismo motor: ruteo, animación, índices jerárquicos, colores por tipo); el vector solo restringe.

```json
{ "vectorFlow": {
  "title": "Turno de conversación", "steps": "auto",
  "columns": [
    { "id": "cli", "label": "Clientes", "tipo": "clientes", "align": "center", "nodes": [ … ] },
    { "id": "cmp", "label": "Componentes", "tipo": "componentes",
      "groups": [{ "id": "propios", "label": "Propios (PatyIA API)" }, { "id": "openai", "label": "OpenAI" }],
      "nodes": [{ "id": "api", "kind": "component", "component": { … }, "group": "propios" }, { "id": "fin", "shape": "end" }] },
    { "id": "flu", "label": "ISS · TConversacionController", "tipo": "flujo", "nodes": [ … ] },
    { "id": "ctl", "label": "Controllers", "tipo": "controllers", "nodes": [{ "id": "c", "kind": "class", "class": { … }, "klass": "p" }] },
    { "id": "mod", "label": "Modelos", "tipo": "modelos", "nodes": [{ "id": "p", "kind": "class", "class": { … } }] },
    { "id": "db", "label": "PostgreSQL", "tipo": "tablas", "nodes": [ … ] }
  ],
  "edges": [{ "from": "cli", "to": "api", "label": "fetch" }, …]
} }
```

| `tipo` de columna | Acepta por defecto |
|---|---|
| `clientes` | cliente (controller de cliente) |
| `componentes` | componente, fin, inicio |
| `flujo` | paso, decisión, variables, barra, nota, anidado, inicio, fin |
| `controllers` | controller (del server) |
| `modelos` | POJO |
| `tablas` | tabla del DER |
| `custom` | lo que diga `accepts` |

Toda columna acepta además notas. `accepts` sobrescribe lo de su tipo.

**Estricto:** un nodo vive en una sola columna; un tipo que la columna no acepta, un `group` no
declarado en su columna o una arista a un nodo inexistente → error visible con el nodo, el tipo y la
columna (no se dibuja). **Automático:** un controller con `klass` y su POJO presente recibe la arista
`klass`.

Guardián: `src/utils/health/diagrams/vector-flow.test.ts`. Convenciones de uso: skill
`iswc-diagramas-enriquecidos`.
