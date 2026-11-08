/*!
 * ISWC - docs (LLM)
 * component-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/feedback/loading.md
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * component: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/feedback/loading.md
 * category: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md
 * kit: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md
 * loader: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/cdn/loader.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * blob: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/feedback/loading.js
 */
import"../_chunks/chunk-3JM7PVSU.mjs";import{a as d,b as c}from"../_chunks/chunk-6FD2OJYD.mjs";import"../_chunks/chunk-4QXWBRB4.mjs";import"../_chunks/chunk-63UMFMQK.mjs";import{l as p}from"../_chunks/chunk-DKYDCFSD.mjs";import"../_chunks/chunk-FZCPQKWI.mjs";import"../_chunks/chunk-UFMSFUKG.mjs";import{f as s,g as r,h as n,i as a}from"../_chunks/chunk-CMZVHIC2.mjs";import{z as l}from"../lib/zod.min.mjs";var m=l.object({texto:l.string()});var h='@charset "UTF-8";:host{display:flex;align-items:center;justify-content:center;gap:.5em;padding-block:var(--iswc-loading-padding, 2em);box-sizing:border-box;color:var(--iswc-text-soft);font-size:.85em}:host([hidden]){display:none!important}.texto[hidden]{display:none}';var x={texto:""},f=document.createElement("template");f.innerHTML=`
  <iswc-spinner part="spinner"></iswc-spinner>
  <span class="texto" part="texto" hidden></span>
`;var i,o,e=class extends c{constructor(){super(x,m.partial());n(this,i);n(this,o);let t=this.shadowRoot;t.appendChild(f.content.cloneNode(!0)),a(this,i,t.querySelector("iswc-spinner")),a(this,o,t.querySelector(".texto"))}onConnected(){this.hasAttribute("role")||this.setAttribute("role","status"),this.hasAttribute("aria-live")||this.setAttribute("aria-live","polite"),super.onConnected()}pintar(){let{texto:t}=this.props;r(this,o).textContent=t,r(this,o).hidden=!t,r(this,i).setAttribute("aria-hidden",String(!!t))}};i=new WeakMap,o=new WeakMap,s(e,"tag","iswc-loading"),s(e,"css",h),s(e,"observed",d(x));p(e,"IswcLoading");
