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
import"../_chunks/chunk-UCBH63CS.mjs";import{k as m,l as h}from"../_chunks/chunk-DKYDCFSD.mjs";import"../_chunks/chunk-FZCPQKWI.mjs";import"../_chunks/chunk-UFMSFUKG.mjs";import{f as r,g as a,h as o,i as c,j as l}from"../_chunks/chunk-CMZVHIC2.mjs";var f='@charset "UTF-8";:host{display:block;font-family:var(--iswc-font-family, inherit)}.bc{display:flex;flex-wrap:wrap;align-items:center;gap:0;margin:0;padding:0;list-style:none;font-size:.9em;color:var(--iswc-text-muted)}.bc-list{display:flex;flex-wrap:wrap;align-items:center;margin:0;padding:0;list-style:none}.bc ::slotted(iswc-breadcrumb-item){display:inline-flex;align-items:center}';(()=>{var s,e,u,b;let d=document.createElement("template");d.innerHTML=`
    <nav class="bc" part="breadcrumb" aria-label="Ruta">
      <ol role="list" class="bc-list"><slot></slot></ol>
    </nav>
  `;class i extends m{constructor(){super();o(this,e);o(this,s,null);this.shadowRoot.appendChild(d.content.cloneNode(!0))}onConnected(){l(this,e,u).call(this),l(this,e,b).call(this),c(this,s,new MutationObserver(()=>l(this,e,b).call(this))),a(this,s).observe(this,{childList:!0,subtree:!0})}onDisconnected(){a(this,s)?.disconnect(),c(this,s,null)}onAttributeChanged(t,p,n){t==="label"&&l(this,e,u).call(this)}get label(){return this.getAttribute("label")||"Ruta"}set label(t){t==null||t===""?this.removeAttribute("label"):this.setAttribute("label",t)}}s=new WeakMap,e=new WeakSet,u=function(){let t=this.shadowRoot.querySelector("nav");t&&t.setAttribute("aria-label",this.label)},b=function(){let t=this.shadowRoot.querySelector("slot");if(!t)return;t.assignedElements({flatten:!0}).forEach(n=>{n instanceof HTMLElement&&(n.hasAttribute("role")||n.setAttribute("role","listitem"))})},r(i,"tag","iswc-breadcrumb"),r(i,"css",f),r(i,"observed",["label"]),h(i,"IswcBreadcrumb")})();
