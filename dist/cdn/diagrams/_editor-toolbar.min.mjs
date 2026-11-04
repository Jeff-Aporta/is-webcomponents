/*!
 * ISWC - docs (LLM)
 * component-skill: (sin _editor-toolbar.md) → https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * component: (sin _editor-toolbar.md) → https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * category: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md
 * kit: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md
 * loader: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/cdn/loader.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * blob: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/_editor-toolbar.js
 */
import{e as b}from"../_chunks/chunk-MGW4N46Z.mjs";import"../_chunks/chunk-FZCPQKWI.mjs";import"../_chunks/chunk-3COKNGLT.mjs";import"../_chunks/chunk-HK2DHHTQ.mjs";import"../_chunks/chunk-CMZVHIC2.mjs";var y="iswc-editor-action",g=`
:host {
  position: absolute;
  top: .75em;
  right: .75em;
  display: flex;
  gap: .25em;
  z-index: 5;
  background: var(--iswc-bg-elev, #131a24);
  border: 1px solid var(--iswc-border, rgba(255,255,255,0.12));
  border-radius: .5em;
  padding: .375em;
  box-shadow: 0 .375em 1em rgba(0,0,0,0.35);
  font-family: var(--iswc-ui, ui-sans-serif, system-ui, sans-serif);
}
button {
  appearance: none;
  border: 1px solid var(--iswc-border, rgba(255,255,255,0.18));
  background: transparent;
  color: var(--iswc-text, #e2e8f0);
  padding: .5em .8333em;
  border-radius: .5em;
  cursor: pointer;
  font: .75em var(--iswc-ui, ui-sans-serif, system-ui, sans-serif);
  line-height: 1;
}
button:hover { background: rgba(255,255,255,0.06); }
button:focus-visible { outline: 2px solid var(--iswc-accent, #2563eb); outline-offset: 1px; }
button:disabled { opacity: 0.4; cursor: not-allowed; }
button[aria-pressed="true"] {
  background: var(--iswc-accent, #2563eb);
  border-color: transparent;
}
.sep {
  width: .0625em;
  background: var(--iswc-border, rgba(255,255,255,0.12));
  align-self: stretch;
  margin: 0 .125em;
}
`;function L(e={}){let{showAddNode:t=!0,showConnect:d=!0,showDelete:l=!0,showHistory:c=!0,showZoom:p=!0,undoDisabled:m=!1,redoDisabled:f=!1}=e,a=document.createElement("div");a.setAttribute("role","toolbar"),a.setAttribute("aria-label","Acciones del editor"),a.setAttribute("aria-keyshortcuts","ArrowLeft ArrowRight"),a.dataset.editorPart="toolbar";let u=document.createElement("style");u.textContent=g,a.appendChild(u);let o=[];t&&o.push({action:"add-node",label:"+ Nodo",icon:"+",ariaLabel:"A\xF1adir nodo",key:"N"}),d&&o.push({action:"connect",label:"Conectar",icon:"\u2192",ariaLabel:"Conectar nodos seleccionados",key:"C"}),l&&o.push({action:"delete",label:"Eliminar",icon:"\u2715",ariaLabel:"Eliminar selecci\xF3n",key:"Del"}),c&&(o.push({action:"undo",label:"\u21B6",icon:"\u21B6",ariaLabel:"Deshacer",key:"Ctrl+Z",initiallyDisabled:m}),o.push({action:"redo",label:"\u21B7",icon:"\u21B7",ariaLabel:"Rehacer",key:"Ctrl+Y",initiallyDisabled:f})),p&&(o.push({action:"zoom-in",label:"\u{1F50D}+",icon:"\u{1F50D}+",ariaLabel:"Acercar",key:"+"}),o.push({action:"zoom-out",label:"\u{1F50D}\u2212",icon:"\u{1F50D}\u2212",ariaLabel:"Alejar",key:"-"}),o.push({action:"fit",label:"Fit",icon:"\u26F6",ariaLabel:"Ajustar al contenido",key:"F"}));let h=!1;for(let i=0;i<o.length;i++){let r=o[i],n=i>0?o[i-1]:null;if((r.action==="undo"||r.action==="zoom-in")&&n&&n.action!=="undo"&&n.action!=="zoom-in"){let s=document.createElement("span");s.className="sep",s.setAttribute("aria-hidden","true"),a.appendChild(s)}a.appendChild(E(r)),h=!1}return a.addEventListener("click",i=>{let r=i.target;if(!r)return;let n=r.closest("button[data-action]");if(!n||n.disabled)return;let s=n.getAttribute("data-action");if(!s)return;i.stopPropagation(),b(a,y,{action:s})}),a}function E(e){let t=document.createElement("button");return t.type="button",t.setAttribute("data-action",e.action),t.setAttribute("aria-label",`${e.ariaLabel} (${e.key})`),t.title=`${e.ariaLabel} (${e.key})`,t.textContent=e.icon,e.initiallyDisabled&&(t.disabled=!0),t}function k(e,t,d){let l=e.querySelector('button[data-action="undo"]'),c=e.querySelector('button[data-action="redo"]');l&&(l.disabled=!t),c&&(c.disabled=!d)}export{y as EDITOR_ACTION_EVENT,L as createEditorToolbar,k as setToolbarHistoryState};
