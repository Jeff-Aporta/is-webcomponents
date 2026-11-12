# skills — las skills del kit

Las skills son lo que un agente lee para saber como usar el kit. La principal es
`skills/iswc-base/SKILL.md`; las demas cubren un caso concreto:

| Skill | Cuando usarla |
|---|---|
| `iswc-base` | la principal: el kit por dentro, el bootstrap y el indice |
| `build-component` | construir y documentar un componente |
| `is-cdn-install` | instalar el kit por CDN en una app |
| `iswc-foundation` | los cimientos: registro, carga, tokens, estilos |
| `iswc-server` | el perfil `server`: vendor, pines y la pagina `/api/docs` |
| `iswc-diagramas-enriquecidos` | los diagramas con contenido real |

## Alias (skills absorbidas)

Estas carpetas ya no son skills: su contenido vive en otra skill. Se conservan como
**alias** para que los enlaces antiguos sigan apuntando a algo cierto.

| Alias | Vive en |
|---|---|
| `document-component` | [`build-component`](build-component/SKILL.md), seccion «11. Documentar el componente» |
| `iswc-server-api-docs` | [`iswc-server`](iswc-server/SKILL.md), seccion «La pagina de la API» |

## Reglas

- La skill principal relaciona a las demas: es el mapa.
- Cada skill tiene su `SKILL.md` con su proposito, su cuando y sus enlaces.
- Un alias no se edita: se edita la skill que lo absorbe.
- Los cambios en una skill se propagan al catalogo (`deno task readmes` y el sincronizador).
- `deno task test:foundation` comprueba que las skills siguen siendo ciertas.
