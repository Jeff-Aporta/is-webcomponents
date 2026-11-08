/*!
 * ISWC - docs (LLM)
 * component-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/login-gate.md
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * component: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/login-gate.md
 * category: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md
 * kit: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md
 * loader: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/cdn/loader.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * blob: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/login-gate.js
 */
import"../_chunks/chunk-DT6IJHEK.mjs";import"../_chunks/chunk-35J3VPS3.mjs";import"../_chunks/chunk-CPMRMAA5.mjs";import"../_chunks/chunk-ZQMRKZYD.mjs";import"../_chunks/chunk-NERLCD5F.mjs";import"../_chunks/chunk-DOOZADVH.mjs";import"../_chunks/chunk-2UUX5AJB.mjs";import"../_chunks/chunk-B7A2WYQL.mjs";import"../_chunks/chunk-KVKHQETP.mjs";import"../_chunks/chunk-2UG6R2ZP.mjs";import"../_chunks/chunk-FZIVRDHK.mjs";import"../_chunks/chunk-FRSYAEVR.mjs";import"../_chunks/chunk-ULEYSFJN.mjs";import"../_chunks/chunk-2GHB5Y6L.mjs";import"../_chunks/chunk-IWE2M5AU.mjs";import"../_chunks/chunk-TPHMQPBF.mjs";import"../_chunks/chunk-MNP72QJS.mjs";import{k as u,l as b}from"../_chunks/chunk-DKYDCFSD.mjs";import"../_chunks/chunk-FZCPQKWI.mjs";import"../_chunks/chunk-UFMSFUKG.mjs";import{f as d,g as i,h as s,i as a,j as p}from"../_chunks/chunk-CMZVHIC2.mjs";var v=":host{--iswc-gate-gap: var(--iswc-space-m, .75em);display:block;box-sizing:border-box}:host *{box-sizing:border-box}[hidden]{display:none!important}#curtain{display:flex;flex-direction:column;align-items:center;gap:var(--iswc-gate-gap);padding-block:calc(var(--iswc-space-l, 1em) * 1.35)}#protected{display:block}";var f=`
<div id="curtain" part="curtain">
  <slot name="public"></slot>
  <iswc-login id="login" part="login"></iswc-login>
</div>
<div id="protected" part="protected">
  <slot name="protected"></slot>
</div>`,E=document.createElement("template");E.innerHTML=f;var e,n,l,r,h,t=class extends u{constructor(){super();s(this,r);s(this,e);s(this,n);s(this,l,null);this.shadowRoot.appendChild(E.content.cloneNode(!0))}connectedCallback(){super.connectedCallback?.(),a(this,e,this.shadowRoot.getElementById("curtain")),a(this,n,this.shadowRoot.getElementById("protected")),a(this,l,this.shadowRoot.getElementById("login")),p(this,r,h).call(this)}attributeChangedCallback(){p(this,r,h).call(this)}get logged(){return this.hasAttribute("logged")}set logged(o){this.toggleAttribute("logged",o)}};e=new WeakMap,n=new WeakMap,l=new WeakMap,r=new WeakSet,h=function(){if(!i(this,e))return;let o=this.logged;i(this,e).hidden=o,i(this,n).hidden=!o;let c=i(this,l);if(c)for(let g of["busy","error","notice","heading","subtitle","provider","providers","mode"]){let m=this.getAttribute(g);m===null?c.removeAttribute(g):c.setAttribute(g,m)}},d(t,"tag","iswc-login-gate"),d(t,"css",v),d(t,"observed",["logged","busy","error","notice","heading","subtitle","provider","providers","mode"]);b(t);
