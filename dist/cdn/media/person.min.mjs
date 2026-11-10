/*!
 * ISWC - docs (LLM)
 * component-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/media/person.md
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * component: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/components/media/person.md
 * category: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md
 * kit: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/specs/componentes.md
 * loader: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/src/cdn/loader.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * blob: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/components/media/person.js
 */
import"../_chunks/chunk-L3O2ZKZM.mjs";import{a as y,b as E}from"../_chunks/chunk-O5VUYSCZ.mjs";import"../_chunks/chunk-4IEYSW7L.mjs";import"../_chunks/chunk-USDNRHPF.mjs";import"../_chunks/chunk-7IBSWVMF.mjs";import"../_chunks/chunk-IWE2M5AU.mjs";import"../_chunks/chunk-TPHMQPBF.mjs";import{l as x}from"../_chunks/chunk-DKYDCFSD.mjs";import"../_chunks/chunk-FZCPQKWI.mjs";import"../_chunks/chunk-UFMSFUKG.mjs";import{f as d,g as t,h as s,i as n}from"../_chunks/chunk-CMZVHIC2.mjs";import{z as l}from"../lib/zod.min.mjs";var T=l.object({usuario:l.string(),nombre:l.string().nullable(),detalle:l.string(),compacto:l.boolean()});var L='@charset "UTF-8";:host{display:inline-block;min-width:0;font-family:var(--iswc-sans)}:host([hidden]){display:none!important}.persona{display:inline-flex;align-items:center;gap:.5em;min-width:0}.avatar{flex:none;font-size:1.9em}.texto{display:flex;flex-direction:column;min-width:0;line-height:1.2}.texto[hidden]{display:none}.nombre,.detalle{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.nombre{font-weight:600}.detalle{color:var(--iswc-text-dim);font-size:.82em}.detalle[hidden]{display:none}';var P={usuario:"",nombre:null,detalle:"",compacto:!1},g=document.createElement("template");g.innerHTML=`
  <span class="persona" part="persona">
    <iswc-avatar class="avatar" part="avatar"></iswc-avatar>
    <span class="texto"><span class="nombre" part="nombre"></span><span class="detalle" part="detalle" hidden></span></span>
  </span>
`;function w(f,b){let e=(f||b||"?").trim(),o=e.split(/\s+/).filter(Boolean);return(o.length>1?`${o[0][0]}${o[1][0]}`:e.slice(0,2)).toUpperCase()}var p,a,c,m,i,r=class extends E{constructor(){super(P,T.partial());s(this,p);s(this,a);s(this,c);s(this,m);s(this,i);let e=this.shadowRoot;e.appendChild(g.content.cloneNode(!0)),n(this,p,e.querySelector(".persona")),n(this,a,e.querySelector(".avatar")),n(this,c,e.querySelector(".texto")),n(this,m,e.querySelector(".nombre")),n(this,i,e.querySelector(".detalle"))}pintar(){let{usuario:e,nombre:o,detalle:h,compacto:v}=this.props,u=o||e;t(this,p).title=v?u:"",t(this,a).setAttribute("initials",w(o,e)),t(this,a).setAttribute("label",u),t(this,c).hidden=v,t(this,m).textContent=u,t(this,i).textContent=h,t(this,i).hidden=!h}};p=new WeakMap,a=new WeakMap,c=new WeakMap,m=new WeakMap,i=new WeakMap,d(r,"tag","iswc-person"),d(r,"css",L),d(r,"observed",y(P));x(r,"IswcPerson");
