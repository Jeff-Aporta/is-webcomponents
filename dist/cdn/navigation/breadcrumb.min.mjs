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
import"../_chunks/chunk-UCBH63CS.mjs";import{e as f}from"../_chunks/chunk-IWE2M5AU.mjs";import{a as h}from"../_chunks/chunk-TPHMQPBF.mjs";import{l as b}from"../_chunks/chunk-DKYDCFSD.mjs";import"../_chunks/chunk-FZCPQKWI.mjs";import"../_chunks/chunk-UFMSFUKG.mjs";import{f as n,g as o,h as c,i as u,j as i}from"../_chunks/chunk-CMZVHIC2.mjs";var p='@charset "UTF-8";:host{display:block;font-family:var(--iswc-font-family, inherit)}.bc{display:flex;flex-wrap:wrap;align-items:center;gap:0;margin:0;padding:0;list-style:none;font-size:.9em;color:var(--iswc-text-muted)}.bc-list{display:flex;flex-wrap:wrap;align-items:center;margin:0;padding:0;list-style:none}.bc ::slotted(iswc-breadcrumb-item){display:inline-flex;align-items:center}';(()=>{var s,e,a,d;h("es",{ruta:"Ruta"});let m=document.createElement("template");m.innerHTML=`
    <nav class="bc" part="breadcrumb">
      <ol role="list" class="bc-list"><slot></slot></ol>
    </nav>
  `;class l extends f{constructor(){super();c(this,e);c(this,s,null);this.shadowRoot.appendChild(m.content.cloneNode(!0))}onConnected(){i(this,e,a).call(this),i(this,e,d).call(this),u(this,s,new MutationObserver(()=>i(this,e,d).call(this))),o(this,s).observe(this,{childList:!0,subtree:!0})}onDisconnected(){o(this,s)?.disconnect(),u(this,s,null)}onAttributeChanged(t,g,r){t==="label"&&i(this,e,a).call(this)}get label(){return this.getAttribute("label")||this.t("ruta")}set label(t){t==null||t===""?this.removeAttribute("label"):this.setAttribute("label",t)}actualizado(){i(this,e,a).call(this)}}s=new WeakMap,e=new WeakSet,a=function(){let t=this.shadowRoot.querySelector("nav");t&&t.setAttribute("aria-label",this.label)},d=function(){let t=this.shadowRoot.querySelector("slot");if(!t)return;t.assignedElements({flatten:!0}).forEach(r=>{r instanceof HTMLElement&&(r.hasAttribute("role")||r.setAttribute("role","listitem"))})},n(l,"tag","iswc-breadcrumb"),n(l,"css",p),n(l,"observed",["label"]),b(l,"IswcBreadcrumb")})();
