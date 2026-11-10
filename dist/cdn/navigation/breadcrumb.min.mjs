/*!
 * ISWC - docs (LLM)
 * component-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/navigation/breadcrumb.md
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * component: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/navigation/breadcrumb.md
 * category: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md
 * kit: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md
 * loader: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/cdn/loader.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * blob: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/navigation/breadcrumb.js
 */
import"../_chunks/chunk-H3M3GDTU.mjs";import{e as f}from"../_chunks/chunk-IWE2M5AU.mjs";import{a as h}from"../_chunks/chunk-TPHMQPBF.mjs";import{l as b}from"../_chunks/chunk-DKYDCFSD.mjs";import"../_chunks/chunk-FZCPQKWI.mjs";import"../_chunks/chunk-UFMSFUKG.mjs";import{f as n,g as a,h as c,i as d,j as s}from"../_chunks/chunk-CMZVHIC2.mjs";var p='@charset "UTF-8";:host{display:block;font-family:var(--iswc-font-family, inherit)}.bc{display:flex;flex-wrap:wrap;align-items:center;gap:0;margin:0;padding:0;list-style:none;font-size:.9em;color:var(--iswc-text-muted)}.bc-list{display:flex;flex-wrap:wrap;align-items:center;margin:0;padding:0;list-style:none}.bc ::slotted(iswc-breadcrumb-item){display:inline-flex;align-items:center}';(()=>{var i,t,o,u;h("es",{ruta:"Ruta"});let m=document.createElement("template");m.innerHTML=`
    <nav class="bc" part="breadcrumb">
      <ol role="list" class="bc-list"><slot></slot></ol>
    </nav>
  `;class r extends f{constructor(){super();c(this,t);c(this,i,null);this.shadowRoot.appendChild(m.content.cloneNode(!0))}onConnected(){s(this,t,o).call(this),s(this,t,u).call(this),d(this,i,new MutationObserver(()=>s(this,t,u).call(this))),a(this,i).observe(this,{childList:!0,subtree:!0})}onDisconnected(){a(this,i)?.disconnect(),d(this,i,null)}onAttributeChanged(e,g,l){e==="label"&&s(this,t,o).call(this)}get label(){return this.getAttribute("label")||this.t("ruta")}set label(e){e==null||e===""?this.removeAttribute("label"):this.setAttribute("label",e)}actualizado(){s(this,t,o).call(this)}}i=new WeakMap,t=new WeakSet,o=function(){let e=this.shadowRoot.querySelector("nav");e&&e.setAttribute("aria-label",this.label)},u=function(){let e=this.shadowRoot.querySelector("slot");if(!e)return;e.assignedElements({flatten:!0}).forEach(l=>{l instanceof HTMLElement&&(l.hasAttribute("role")||l.setAttribute("role","listitem"))})},n(r,"tag","iswc-breadcrumb"),n(r,"css",p),n(r,"observed",["label"]),b(r,"IswcBreadcrumb")})();
