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
import"../_chunks/chunk-N7CE6CYK.mjs?v=squqqk";import{a as d,b as c}from"../_chunks/chunk-H7JGCL52.mjs?v=t671vi";import{b as p}from"../_chunks/chunk-XP253YBZ.mjs?v=7txe1k";import"../_chunks/chunk-MNU2XQTU.mjs?v=khcy6g";import"../_chunks/chunk-HCLZRPU3.mjs?v=nylj0w";import"../_chunks/chunk-C7ON665Q.mjs?v=6f2qf1";import"../_chunks/chunk-SNHMDDOU.mjs?v=6lxkqf";import{f as s,g as r,h as n,i as a}from"../_chunks/chunk-4PV5NT2U.mjs?v=58b9qn";import{z as l}from"../lib/zod.min.mjs?v=r69zzt";var x=l.object({texto:l.string()});var f='@charset "UTF-8";:host{display:flex;align-items:center;justify-content:center;gap:.5em;padding-block:var(--iswc-loading-padding, 2em);box-sizing:border-box;color:var(--iswc-text-soft);font-size:.85em}:host([hidden]){display:none!important}.texto[hidden]{display:none}';var u={texto:""},g=document.createElement("template");g.innerHTML=`
  <iswc-spinner part="spinner"></iswc-spinner>
  <span class="texto" part="texto" hidden></span>
`;var i,o,e=class extends c{constructor(){super(u,x.partial());n(this,i);n(this,o);let t=this.shadowRoot;t.appendChild(g.content.cloneNode(!0)),a(this,i,t.querySelector("iswc-spinner")),a(this,o,t.querySelector(".texto"))}onConnected(){this.hasAttribute("role")||this.setAttribute("role","status"),this.hasAttribute("aria-live")||this.setAttribute("aria-live","polite"),super.onConnected()}pintar(){let{texto:t}=this.props;r(this,o).textContent=t,r(this,o).hidden=!t,r(this,i).setAttribute("aria-hidden",String(!!t))}};i=new WeakMap,o=new WeakMap,s(e,"tag","iswc-loading"),s(e,"css",f),s(e,"observed",d(u));p(e,"IswcLoading");
