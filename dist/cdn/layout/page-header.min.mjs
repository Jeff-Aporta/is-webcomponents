/*!
 * ISWC - docs (LLM)
 * component-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/page-header.md
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * component: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/layout/page-header.md
 * category: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md
 * kit: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md
 * loader: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/cdn/loader.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * blob: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/layout/page-header.js
 */
import{a as f,b as g}from"../_chunks/chunk-6FD2OJYD.mjs";import"../_chunks/chunk-4QXWBRB4.mjs";import"../_chunks/chunk-63UMFMQK.mjs";import{l as b}from"../_chunks/chunk-DKYDCFSD.mjs";import"../_chunks/chunk-FZCPQKWI.mjs";import"../_chunks/chunk-UFMSFUKG.mjs";import{f as a,g as t,h as o,i as l,j as h}from"../_chunks/chunk-CMZVHIC2.mjs";import{z as m}from"../lib/zod.min.mjs";var w=m.object({titulo:m.string(),subtitulo:m.string(),icono:m.string()});var x='@charset "UTF-8";:host{display:block;container-type:inline-size;min-width:0;font-family:var(--iswc-sans)}:host([hidden]){display:none!important}.cabecera{display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:.75em 1.25em;padding-bottom:1em;margin-bottom:1.25em;border-bottom:.0625em solid var(--iswc-border-soft)}.texto{flex:1 1 20em;min-inline-size:0}.titulo{display:flex;align-items:center;gap:.5em;margin:0;color:inherit;font-family:var(--iswc-page-header-title-font, inherit);font-size:1.45em;font-weight:650;letter-spacing:-.01em}.titulo iswc-icon{flex:none;color:var(--iswc-brand-text)}.titulo iswc-icon[hidden]{display:none}.rotulo{display:-webkit-box;min-inline-size:0;overflow:hidden;overflow-wrap:anywhere;-webkit-box-orient:vertical;-webkit-line-clamp:2}.subtitulo{display:-webkit-box;margin:.25em 0 0;overflow:hidden;color:color-mix(in srgb,currentColor 78%,transparent);font-size:.95em;-webkit-box-orient:vertical;-webkit-line-clamp:2}.subtitulo[hidden]{display:none}.ilustracion{order:3;flex:none;align-self:center;inline-size:var(--iswc-page-header-ilustracion-size, 10em);margin-block:-.5em}.ilustracion[hidden]{display:none}.ilustracion ::slotted(*){display:block;inline-size:100%;max-inline-size:100%}@container (max-width: 36em){.ilustracion{display:none}}.acciones{display:flex;align-items:center;flex-wrap:wrap;gap:.5em}';var y={titulo:"",subtitulo:"",icono:""},v=document.createElement("template");v.innerHTML=`
  <header class="cabecera" part="cabecera">
    <div class="texto">
      <h1 class="titulo" part="titulo"><iswc-icon hidden></iswc-icon><span class="rotulo"></span></h1>
      <p class="subtitulo" part="subtitulo" hidden></p>
    </div>
    <div class="acciones" part="acciones"><slot name="acciones"></slot></div>
    <div class="ilustracion" part="ilustracion" aria-hidden="true" hidden><slot name="ilustracion"></slot></div>
  </header>
`;var n,c,s,d,p,E,i=class extends g{constructor(){super(y,w.partial());o(this,p);o(this,n);o(this,c);o(this,s);o(this,d);let e=this.shadowRoot;e.appendChild(v.content.cloneNode(!0)),l(this,n,e.querySelector("iswc-icon")),l(this,c,e.querySelector(".rotulo")),l(this,s,e.querySelector(".subtitulo")),l(this,d,e.querySelector(".ilustracion"));let r=e.querySelector('slot[name="ilustracion"]');r.addEventListener("slotchange",()=>h(this,p,E).call(this,r))}pintar(){let{titulo:e,subtitulo:r,icono:u}=this.props;t(this,n).hidden=!u,u&&t(this,n).setAttribute("icon",u),t(this,c).textContent=e,t(this,s).textContent=r,t(this,s).hidden=!r}};n=new WeakMap,c=new WeakMap,s=new WeakMap,d=new WeakMap,p=new WeakSet,E=function(e){t(this,d).hidden=e.assignedElements().length===0},a(i,"tag","iswc-page-header"),a(i,"css",x),a(i,"deps",["iswc-icon"]),a(i,"observed",f(y));b(i,"IswcPageHeader");
