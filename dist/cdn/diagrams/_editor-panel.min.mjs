/*!
 * ISWC - docs (LLM)
 * component-skill: (sin _editor-panel.md) → https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * component: (sin _editor-panel.md) → https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * category: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md
 * kit: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md
 * loader: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/cdn/loader.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * blob: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/_editor-panel.js
 */
import{e as b}from"../_chunks/chunk-MGW4N46Z.mjs";import"../_chunks/chunk-FZCPQKWI.mjs";import"../_chunks/chunk-3COKNGLT.mjs";import"../_chunks/chunk-HK2DHHTQ.mjs";import"../_chunks/chunk-CMZVHIC2.mjs";var h="iswc-editor-select-node",L="iswc-editor-export",T="iswc-editor-selection-changed",N=`
:host {
  display: block;
  background: var(--iswc-bg-elev, #131a24);
  border: 1px solid var(--iswc-border, rgba(255,255,255,0.12));
  border-radius: .5em;
  padding: .875em;
  display: flex;
  flex-direction: column;
  gap: .75em;
  overflow: auto;
  font-family: var(--iswc-ui, ui-sans-serif, system-ui, sans-serif);
  color: var(--iswc-text, #e2e8f0);
}
h3 {
  font-size: .6875em;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  margin: 0;
  color: var(--iswc-text-soft, #94a3b8);
  font-weight: 700;
}
fieldset {
  border: 1px solid var(--iswc-border, rgba(255,255,255,0.08));
  border-radius: .375em;
  padding: .5em .625em;
}
fieldset legend {
  font-size: .625em;
  text-transform: uppercase;
  color: var(--iswc-text-soft, #94a3b8);
  padding: 0 .4em;
}
.node-list {
  list-style: none;
  margin: 0;
  padding: 0;
  max-height: 15em;
  overflow: auto;
}
.node-list li {
  padding: .3333em .6667em;
  font-size: .75em;
  border-radius: .3333em;
  cursor: pointer;
  border: 1px solid transparent;
}
.node-list li:hover { background: rgba(255,255,255,0.04); }
.node-list li[aria-selected="true"] {
  background: rgba(37,99,235,0.12);
  border-color: var(--iswc-accent, #2563eb);
}
.node-list li:focus-visible { outline: 2px solid var(--iswc-accent, #2563eb); outline-offset: 1px; }
.empty { font-size: .6875em; color: var(--iswc-text-soft, #94a3b8); font-style: italic; }
.export-row {
  display: flex;
  gap: .375em;
  margin-top: .375em;
}
.export-row button {
  appearance: none;
  border: 1px solid var(--iswc-border, rgba(255,255,255,0.18));
  background: transparent;
  color: var(--iswc-text, #e2e8f0);
  padding: .3636em .7273em;
  border-radius: .3636em;
  cursor: pointer;
  font: .6875em var(--iswc-ui, ui-sans-serif, system-ui, sans-serif);
}
.export-row button:hover { background: rgba(255,255,255,0.06); }
.export-row button:focus-visible { outline: 2px solid var(--iswc-accent, #2563eb); outline-offset: 1px; }
textarea[data-json-readout] {
  width: 100%;
  box-sizing: border-box;
  font: .6875em ui-monospace, Menlo, Consolas, monospace;
  background: rgba(0,0,0,0.2);
  color: var(--iswc-text, #e2e8f0);
  border: 1px solid var(--iswc-border, rgba(255,255,255,0.08));
  border-radius: .3636em;
  padding: .5455em;
  resize: vertical;
  min-height: 7.2727em;
  margin-top: .3636em;
}
`;function P(w={}){let{renderNodeProps:f,showExportJson:C=!0}=w,s=document.createElement("aside");s.dataset.editorPart="panel";let x=document.createElement("style");x.textContent=N,s.appendChild(x);let m=document.createElement("fieldset"),E=document.createElement("legend");E.textContent="Nodos",m.appendChild(E);let n=document.createElement("ul");n.className="node-list",n.setAttribute("role","listbox"),n.setAttribute("aria-label","Lista de nodos del spec"),m.appendChild(n);let l=document.createElement("li");l.className="empty",l.setAttribute("role","presentation"),l.textContent="A\xFAn no hay nodos. Usa +Nodo o el demo JSON inicial.",n.appendChild(l),s.appendChild(m);let u=document.createElement("fieldset"),g=document.createElement("legend");g.textContent="Propiedades",u.appendChild(g);let d=document.createElement("div");if(d.dataset.editorPropsHost="",u.appendChild(d),s.appendChild(u),C){let o=document.createElement("fieldset"),e=document.createElement("legend");e.textContent="Export JSON",o.appendChild(e);let t=document.createElement("textarea");t.setAttribute("data-json-readout",""),t.readOnly=!0,t.value="",o.appendChild(t);let a=document.createElement("div");a.className="export-row";let r=document.createElement("button");r.type="button",r.textContent="Copiar",r.setAttribute("aria-label","Copiar JSON al portapapeles"),r.addEventListener("click",()=>{t.value&&navigator.clipboard?.writeText(t.value).catch(()=>{})}),a.appendChild(r),o.appendChild(a),s.appendChild(o)}let i=s,c=(o,e)=>{let t=[...n.querySelectorAll('li[role="option"]')];if(t.length===0)return;let a=t.findIndex(p=>p.tabIndex===0),r;e==="first"?r=0:e==="last"?r=t.length-1:r=a<0?0:(a+o+t.length)%t.length,t.forEach((p,y)=>{let v=y===r;p.tabIndex=v?0:-1,v&&p.setAttribute("aria-selected","true")}),t[r].focus(),b(s,h,{nodeId:t[r].dataset.nodeId})};return n.addEventListener("keydown",o=>{let e=o.key;e==="ArrowDown"?(c(1,null),o.preventDefault()):e==="ArrowUp"?(c(-1,null),o.preventDefault()):e==="Home"?(c(0,"first"),o.preventDefault()):e==="End"&&(c(0,"last"),o.preventDefault())}),i.setNodes=o=>{if(n.innerHTML="",o.length===0){let e=document.createElement("li");e.className="empty",e.setAttribute("role","presentation"),e.textContent="A\xFAn no hay nodos.",n.appendChild(e);return}for(let e of o){let t=document.createElement("li");t.setAttribute("role","option"),t.setAttribute("data-node-id",e.id),t.id=`editor-opt-${e.id}`,t.tabIndex=-1,t.textContent=e.label??e.id,t.addEventListener("click",()=>{b(s,h,{nodeId:e.id})}),n.appendChild(t)}},i.setSelected=o=>{n.querySelectorAll('li[role="option"]').forEach(t=>{let a=t.getAttribute("data-node-id")===o;t.setAttribute("aria-selected",a?"true":"false"),t.tabIndex=a?0:-1}),o?n.setAttribute("aria-activedescendant",`editor-opt-${o}`):n.removeAttribute("aria-activedescendant"),i.setNodeProps(o)},i.setJsonReadout=o=>{let e=s.querySelector("textarea[data-json-readout]");e&&(e.value=o)},i.setNodeProps=o=>{if(d.innerHTML="",f)f(d,o,s);else{let e=document.createElement("div");e.className="empty",e.textContent=o?`Nodo seleccionado: ${o}`:"Selecciona un nodo de la lista para ver sus props.",d.appendChild(e)}},i}export{L as EDITOR_EXPORT_EVENT,T as EDITOR_SELECTION_CHANGED_EVENT,h as EDITOR_SELECT_NODE_EVENT,P as createEditorPanel};
