# skills — las skills del kit

Las skills son lo que un agente lee para saber como usar el kit. La principal es
`skills/iswc-base/SKILL.md`; las demas cubren un caso concreto:

| Skill | Cuando usarla |
|---|---|
| `iswc-base` | la principal: el kit por dentro, el bootstrap y el indice |
| `build-component` | crear o cambiar un componente |
| `document-component` | documentar un componente |
| `is-cdn-install` | instalar el kit por CDN en una app |
| `iswc-foundation` | los cimientos: registro, carga, tokens, estilos |
| `iswc-server` | el servidor de API y sus docs |
| `iswc-server-api-docs` | el componente de documentacion de API |
| `iswc-diagramas-enriquecidos` | los diagramas con contenido real |

## Reglas

- La skill principal relaciona a las demas: es el mapa.
- Cada skill tiene su `SKILL.md` con su proposito, su cuando y sus enlaces.
- Los cambios en una skill se propagan al catalogo (`deno task readmes` y el sincronizador).
- `deno task test:foundation` comprueba que las skills siguen siendo ciertas.
