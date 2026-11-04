/*!
 * ISWC - docs (LLM)
 * component-skill: (sin _editor-nesting.md) → https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * component: (sin _editor-nesting.md) → https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * category: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md
 * kit: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md
 * loader: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/cdn/loader.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * blob: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/diagrams/_editor-nesting.js
 */
import{e as b}from"../_chunks/chunk-MGW4N46Z.mjs";import"../_chunks/chunk-FZCPQKWI.mjs";import"../_chunks/chunk-3COKNGLT.mjs";import"../_chunks/chunk-HK2DHHTQ.mjs";import"../_chunks/chunk-CMZVHIC2.mjs";var h=5,N="iswc-editor-nesting-open",x="iswc-editor-nesting-close",y="iswc-editor-close",C=`
.iswc-nesting-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.55);
  display: grid;
  place-items: center;
  z-index: 10000;
  /* prefers-reduced-motion disables transition */
  transition: opacity 200ms ease-out;
}
.iswc-nesting-backdrop[data-reduced] { transition: none; }
.iswc-nesting-modal {
  position: relative;
  width: min(90vw, 68.75em);
  height: min(85vh, 50em);
  background: var(--iswc-bg, #0c1118);
  border: 1px solid var(--iswc-border, rgba(255,255,255,0.18));
  border-radius: .625em;
  box-shadow: 0 1em 3em rgba(0,0,0,0.6);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
.iswc-nesting-modal[data-reduced] { transform: none; }
.iswc-nesting-modal {
  transform: scale(0.96);
  transition: transform 200ms ease-out;
}
.iswc-nesting-modal.iswc-shown { transform: scale(1); }
.iswc-nesting-toolbar {
  display: flex;
  align-items: center;
  gap: .6667em;
  padding: .6667em 1.1667em;
  background: var(--iswc-bg-elev, #131a24);
  border-bottom: 1px solid var(--iswc-border, rgba(255,255,255,0.12));
  font-family: var(--iswc-ui, ui-sans-serif, system-ui, sans-serif);
  color: var(--iswc-text, #e2e8f0);
  font-size: .75em;
}
.iswc-nesting-toolbar .crumbs {
  flex: 1;
  font-weight: 600;
}
.iswc-nesting-toolbar button {
  appearance: none;
  border: 1px solid var(--iswc-border, rgba(255,255,255,0.18));
  background: transparent;
  color: var(--iswc-text, #e2e8f0);
  padding: .3636em .9091em;
  border-radius: .3636em;
  cursor: pointer;
  font: .6875em var(--iswc-ui, ui-sans-serif, system-ui, sans-serif);
}
.iswc-nesting-toolbar button:hover { background: rgba(255,255,255,0.06); }
.iswc-nesting-toolbar button:focus-visible { outline: 2px solid var(--iswc-accent, #2563eb); outline-offset: 1px; }
.iswc-nesting-host { flex: 1; min-height: 0; padding: .5em; box-sizing: border-box; }
`;function _(n={}){let a=n.currentDepth??1,s=n.maxDepth??h;return a<s}function L(n,a,s={}){let i=s.currentDepth??1,g=s.maxDepth??h;if(i>=g||s.dryRun)return null;let c=s.childTag??n.tagName.toLowerCase(),w=n.matches?.(":host")===!1?!1:typeof window<"u"&&typeof window.matchMedia=="function"&&window.matchMedia("(prefers-reduced-motion: reduce)").matches,e=document.createElement("div");e.className="iswc-nesting-backdrop",w&&e.setAttribute("data-reduced",""),e.style.opacity="0",e.setAttribute("role","dialog"),e.setAttribute("aria-modal","true"),e.setAttribute("aria-label",`Nivel ${i+1} de ${g}: ${c}`);let d=document.createElement("div");d.className="iswc-nesting-modal",w&&d.setAttribute("data-reduced",""),e.appendChild(d);let m=document.createElement("div");m.className="iswc-nesting-toolbar";let f=document.createElement("span");f.className="crumbs",f.textContent=`Nivel ${i+1} / ${g} \u2014 ${c}`,m.appendChild(f);let l=document.createElement("button");l.type="button",l.textContent="Cerrar",l.setAttribute("aria-label","Cerrar modal de nesting"),l.addEventListener("click",()=>p(e,i,!0)),m.appendChild(l),d.appendChild(m);let u=document.createElement("div");if(u.className="iswc-nesting-host",d.appendChild(u),typeof document<"u"&&!document.getElementById("iswc-nesting-style")){let t=document.createElement("style");t.id="iswc-nesting-style",t.textContent=C,document.head.appendChild(t)}let o=null;try{let t=customElements.get(c);if(t){o=new t;try{let r=document.createElement("script");r.type="application/json",r.textContent=JSON.stringify(a),o.appendChild(r)}catch{}u.appendChild(o)}}catch(t){let r=document.createElement("div");r.style.cssText="color: var(--iswc-text-soft); padding: 1.6667em; font: .75em var(--iswc-ui);",r.textContent=`Editor hijo "${c}" a\xFAn no est\xE1 definido. (${String(t)})`,u.appendChild(r)}let E=t=>{t.key==="Escape"&&(t.stopPropagation(),p(e,i,!0))};document.addEventListener("keydown",E,{capture:!0}),e.addEventListener("click",t=>{t.target===e&&p(e,i,!0)}),o&&o.addEventListener(y,()=>{p(e,i,!1)}),document.body.appendChild(e),e.offsetWidth,e.style.opacity="1",d.classList.add("iswc-shown"),b(n,N,{depth:i+1,childTag:c,childSpec:a});function v(){document.removeEventListener("keydown",E,{capture:!0}),o&&o.parentNode&&o.parentNode.removeChild(o),o=null,e.parentNode&&e.parentNode.removeChild(e)}return e.__teardown=v,e}function p(n,a,s){let i=n.__teardown;n.style.opacity="0",setTimeout(()=>{i?.(),b(n,x,{depth:a,cancelled:s})},200)}export{x as NESTING_CLOSE_EVENT,h as NESTING_DEFAULT_MAX_DEPTH,N as NESTING_OPEN_EVENT,y as NESTING_REMOTE_CLOSE_EVENT,_ as canNest,p as closeModal,L as openNestingModal};
