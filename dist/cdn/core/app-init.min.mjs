/*!
 * ISWC - docs (LLM)
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * source: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/core/app-init.ts
 */
import{d as i,e as r}from"../_chunks/chunk-S5AOGS65.mjs?v=nbzru6";import"../_chunks/chunk-UCMASPOL.mjs?v=34t4kr";import"../_chunks/chunk-4PV5NT2U.mjs?v=58b9qn";var l="assets/iconify/";function d(a){let t=new URL(a.host);if(t.protocol!=="https:"&&t.protocol!=="http:")throw new TypeError(`initApp: icons.host debe ser http(s): ${a.host}`);let e=new URL(a.folder??l,t.href.endsWith("/")?t.href:`${t.href}/`).href;return e.endsWith("/")?e:`${e}/`}function u(a={}){let t=a.root??document.documentElement,e=r(),o=e.theme??a.theme??"light",p=i(e.palette)?e.palette:null,n=p??a.palette??"delfin",s=typeof e.panda=="boolean"?e.panda:a.panda??!1;t.dataset.theme=o,t.dataset.palette=n,s?t.dataset.panda="":delete t.dataset.panda,a.icons&&(t.dataset.icons=d(a.icons));let c=t.dataset.icons??null;return{theme:o,palette:n,panda:s,icons:c,origen:{theme:e.theme?"usuario":"default",palette:p?"usuario":"default",panda:typeof e.panda=="boolean"?"usuario":"default"}}}export{l as ICONS_FOLDER_DEFAULT,d as iconsBase,u as initApp};
