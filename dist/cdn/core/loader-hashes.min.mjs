/*!
 * ISWC - docs (LLM)
 * kit-skill: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/iswc-base/SKILL.md
 * cdn-install: https://raw.githubusercontent.com/Jeff-Aporta/is-webcomponents/main/skills/is-cdn-install/SKILL.md
 * source: https://github.com/Jeff-Aporta/is-webcomponents/blob/main/src/cdn/loader-hashes.ts
 */
import{e as t}from"../_chunks/chunk-FZCPQKWI.mjs";import"../_chunks/chunk-CMZVHIC2.mjs";async function h(a){var e;let r=a.raizPrimaria()??a.cdnRoot;if(!t(r))try{let o=await fetch(new URL("asset-hashes.json",r).href,{cache:"no-cache"});if(!o.ok)return;let c=await o.json();for(let[s,i]of Object.entries(c.files??{}))(e=a.hashes)[s]??(e[s]=i)}catch{}}export{h as cargar};
